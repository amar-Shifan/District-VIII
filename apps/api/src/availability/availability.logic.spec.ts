import {
  businessDateOf,
  currentSlot,
  type OperatingHours,
  slotHours,
  slotStart,
} from '@district-viii/shared';
import {
  buildSlots,
  isUnitFreeNow,
  nextFreeAt,
  SlotIndex,
  slotState,
  summarize,
  type UnitState,
} from './availability.logic';

const HOURS: OperatingHours = {
  openHour: 12,
  closeHour: 4,
  slotDurationHours: 1,
};
const DATE = '2026-10-21';

/** Instant for an IST wall-clock time on DATE (hour >= 24 rolls into the next day). */
const ist = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 21, hour, minute) - 330 * 60_000);

const free = (id = 'u1'): UnitState => ({
  id,
  status: 'free',
  busyUntil: null,
});
const emptyIndex = new SlotIndex([], []);

describe('business-day helpers (Asia/Kolkata)', () => {
  it('lists 16 one-hour slots from 12 PM to 4 AM', () => {
    expect(slotHours(HOURS)).toEqual([
      12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3,
    ]);
  });

  it('puts slots between midnight and closing in the previous business day', () => {
    expect(businessDateOf(ist(26), HOURS)).toBe(DATE); // 2 AM on the 22nd
    expect(businessDateOf(ist(28), HOURS)).toBe('2026-10-22'); // 4 AM: closed, next session
    expect(businessDateOf(ist(13), HOURS)).toBe(DATE);
  });

  it('places after-midnight slots on the next calendar day', () => {
    expect(slotStart(DATE, 1, HOURS).toISOString()).toBe(ist(25).toISOString());
    expect(slotStart(DATE, 20, HOURS).toISOString()).toBe(
      ist(20).toISOString(),
    );
  });

  it('finds the running slot, or null when closed', () => {
    expect(currentSlot(ist(20, 45), HOURS)).toEqual({
      businessDate: DATE,
      startHour: 20,
    });
    expect(currentSlot(ist(27, 10), HOURS)).toEqual({
      businessDate: DATE,
      startHour: 3,
    });
    expect(currentSlot(ist(9), HOURS)).toBeNull();
  });

  it('supports daytime-only hours and two-hour slots', () => {
    expect(
      slotHours({ openHour: 10, closeHour: 22, slotDurationHours: 2 }),
    ).toEqual([10, 12, 14, 16, 18, 20]);
  });
});

describe('slotState', () => {
  const state = (overrides: Partial<Parameters<typeof slotState>[0]> = {}) =>
    slotState({
      unit: free(),
      businessDate: DATE,
      startHour: 21,
      hours: HOURS,
      index: emptyIndex,
      now: ist(18),
      ...overrides,
    });

  it('is available by default', () => {
    expect(state()).toBe('available');
  });

  it('is past once the late-booking grace (30 min) has elapsed', () => {
    expect(state({ now: ist(21, 29) })).toBe('available');
    expect(state({ now: ist(21, 30) })).toBe('past');
  });

  it('reports maintenance before bookings', () => {
    const index = new SlotIndex(
      [{ unitId: 'u1', businessDate: DATE, startHour: 21, status: 'approved' }],
      [],
    );
    expect(state({ unit: { ...free(), status: 'maintenance' }, index })).toBe(
      'maintenance',
    );
  });

  it('distinguishes approved (booked) from pending holds', () => {
    const approved = new SlotIndex(
      [{ unitId: 'u1', businessDate: DATE, startHour: 21, status: 'approved' }],
      [],
    );
    const pending = new SlotIndex(
      [{ unitId: 'u1', businessDate: DATE, startHour: 21, status: 'pending' }],
      [],
    );
    expect(state({ index: approved })).toBe('booked');
    expect(state({ index: pending })).toBe('pending');
  });

  it('treats admin-blocked slots as busy', () => {
    const index = new SlotIndex(
      [],
      [{ unitId: 'u1', businessDate: DATE, startHour: 21 }],
    );
    expect(state({ index })).toBe('busy');
  });

  it('marks slots the unit is still busy into', () => {
    const unit: UnitState = {
      id: 'u1',
      status: 'busy',
      busyUntil: ist(21, 15),
    };
    expect(state({ unit, startHour: 21 })).toBe('busy');
    expect(state({ unit, startHour: 22 })).toBe('available');
  });

  it('ignores holds on other units and dates', () => {
    const index = new SlotIndex(
      [
        { unitId: 'u2', businessDate: DATE, startHour: 21, status: 'approved' },
        {
          unitId: 'u1',
          businessDate: '2026-10-22',
          startHour: 21,
          status: 'approved',
        },
      ],
      [],
    );
    expect(state({ index })).toBe('available');
  });

  it('builds a full grid with ISO start and end times', () => {
    const slots = buildSlots({
      unit: free(),
      businessDate: DATE,
      hours: HOURS,
      index: emptyIndex,
      now: ist(18),
    });
    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({ startHour: 12, state: 'past' });
    expect(slots[8]).toMatchObject({
      startHour: 20,
      state: 'available',
      startsAt: ist(20).toISOString(),
      endsAt: ist(21).toISOString(),
    });
  });
});

describe('summary and next free time', () => {
  it('counts a unit as taken when the current slot is held', () => {
    const index = new SlotIndex(
      [{ unitId: 'u1', businessDate: DATE, startHour: 20, status: 'pending' }],
      [],
    );
    expect(isUnitFreeNow(free(), HOURS, index, ist(20, 10))).toBe(false);
    expect(isUnitFreeNow(free('u2'), HOURS, index, ist(20, 10))).toBe(true);
  });

  it('walks past busy time and consecutive held slots', () => {
    const unit: UnitState = {
      id: 'u1',
      status: 'busy',
      busyUntil: ist(20, 40),
    };
    const index = new SlotIndex(
      [
        { unitId: 'u1', businessDate: DATE, startHour: 20, status: 'approved' },
        { unitId: 'u1', businessDate: DATE, startHour: 21, status: 'pending' },
      ],
      [{ unitId: 'u1', businessDate: DATE, startHour: 22 }],
    );
    expect(nextFreeAt(unit, HOURS, index, ist(20, 5))?.toISOString()).toBe(
      ist(23).toISOString(),
    );
  });

  it('never frees a unit in maintenance', () => {
    expect(
      nextFreeAt(
        { ...free(), status: 'maintenance' },
        HOURS,
        emptyIndex,
        ist(20),
      ),
    ).toBeNull();
  });

  it('reports nextFreeAt only when nothing is free', () => {
    const units: UnitState[] = [
      { id: 'u1', status: 'busy', busyUntil: ist(21, 30) },
      { id: 'u2', status: 'busy', busyUntil: ist(20, 50) },
    ];
    expect(summarize(units, HOURS, emptyIndex, ist(20))).toEqual({
      total: 2,
      free: 0,
      nextFreeAt: ist(20, 50).toISOString(),
    });
    expect(
      summarize([...units, free('u3')], HOURS, emptyIndex, ist(20)),
    ).toEqual({ total: 3, free: 1 });
  });
});
