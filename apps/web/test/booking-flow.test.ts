import {
  addDays,
  type ApiErrorBody,
  type AvailabilityDto,
  type BookingDto,
  businessDateOf,
} from "@district-viii/shared";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestMongo, type TestMongo } from "./mongo";

// Route handlers call connection() to opt out of prerendering; outside Next it is a no-op.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

const ADMIN = { email: "admin@test.local", password: "correct-horse-battery" };
const BASE = "http://localhost";

type Init = { method?: string; body?: unknown; headers?: Record<string, string> };

function req(path: string, init: Init = {}): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

describe("booking flow through the API routes", () => {
  let mongo: TestMongo;
  let unitId: string;
  let cookie: string;
  const date = addDays(businessDateOf(new Date(), { openHour: 12, closeHour: 4, slotDurationHours: 1 }), 1);

  // Route modules are imported after the environment is set.
  let routes: {
    bookings: typeof import("@/app/api/bookings/route");
    approve: typeof import("@/app/api/bookings/[id]/approve/route");
    cancel: typeof import("@/app/api/bookings/[id]/cancel/route");
    byPhone: typeof import("@/app/api/bookings/by-phone/[phone]/route");
    availability: typeof import("@/app/api/availability/route");
    login: typeof import("@/app/api/auth/login/route");
    live: typeof import("@/app/api/live/route");
  };

  const slotState = async (startHour: number) => {
    const res = await routes.availability.GET(req(`/api/availability?type=pool&date=${date}`), {});
    expect(res.status).toBe(200);
    const grid = (await res.json()) as AvailabilityDto;
    return grid.units[0]?.slots.find((slot) => slot.startHour === startHour)?.state;
  };

  const adminHeaders = () => ({ cookie, "x-admin-request": "1" });

  beforeAll(async () => {
    mongo = await startTestMongo("flow");
    process.env.MONGODB_URI = mongo.uri;
    process.env.JWT_SECRET = "flow-test-secret-that-is-definitely-long-enough";

    const { connectDb } = await import("@/server/db");
    const { AdminModel, UnitModel } = await import("@/server/models");
    const { hashPassword } = await import("@/server/auth");
    await connectDb(mongo.uri);
    await AdminModel.create({ email: ADMIN.email, name: "Test Admin", passwordHash: await hashPassword(ADMIN.password) });
    unitId = String((await UnitModel.create({ name: "Table 1", type: "pool" }))._id);

    routes = {
      bookings: await import("@/app/api/bookings/route"),
      approve: await import("@/app/api/bookings/[id]/approve/route"),
      cancel: await import("@/app/api/bookings/[id]/cancel/route"),
      byPhone: await import("@/app/api/bookings/by-phone/[phone]/route"),
      availability: await import("@/app/api/availability/route"),
      login: await import("@/app/api/auth/login/route"),
      live: await import("@/app/api/live/route"),
    };
  });

  afterAll(async () => {
    const { disconnectDb } = await import("@/server/db");
    await disconnectDb();
    await mongo?.stop();
  });

  it("creates a pending booking, blocks duplicates, and lets an admin approve it", async () => {
    const liveBefore = (await (await routes.live.GET(req("/api/live"), {})).json()) as { revision: number };

    // 1. Customer requests a slot.
    const created = await routes.bookings.POST(
      req("/api/bookings", {
        method: "POST",
        body: { unitId, businessDate: date, startHour: 20, customerName: "Arjun Menon", customerPhone: "+91 98460 12345" },
      }),
      {},
    );
    expect(created.status).toBe(201);
    const booking = (await created.json()) as BookingDto;
    expect(booking).toMatchObject({ status: "pending", unitName: "Table 1", customerPhone: "9846012345", startHour: 20 });
    expect(await slotState(20)).toBe("pending");

    // Live counter moved, so polling screens refresh.
    const liveAfter = (await (await routes.live.GET(req("/api/live"), {})).json()) as { revision: number };
    expect(liveAfter.revision).toBeGreaterThan(liveBefore.revision);

    // 2. Someone else tries the same slot.
    const conflict = await routes.bookings.POST(
      req("/api/bookings", {
        method: "POST",
        body: { unitId, businessDate: date, startHour: 20, customerName: "Nihal K", customerPhone: "9123456789" },
      }),
      {},
    );
    expect(conflict.status).toBe(409);
    expect((await conflict.json()) as ApiErrorBody).toMatchObject({ statusCode: 409, error: "Conflict", path: "/api/bookings" });

    // 3. Admin routes are guarded.
    const anonymous = await routes.approve.PATCH(req(`/api/bookings/${booking.id}/approve`, { method: "PATCH" }), params({ id: booking.id }));
    expect(anonymous.status).toBe(401);

    const login = await routes.login.POST(req("/api/auth/login", { method: "POST", body: ADMIN }), {});
    expect(login.status).toBe(200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("d8_admin=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    cookie = setCookie.split(";")[0] ?? "";

    // The session cookie alone isn't enough for a mutation: the CSRF header is required.
    const noHeader = await routes.approve.PATCH(
      req(`/api/bookings/${booking.id}/approve`, { method: "PATCH", headers: { cookie } }),
      params({ id: booking.id }),
    );
    expect(noHeader.status).toBe(403);

    // 4. Admin approves; the slot shows as booked and the customer sees it.
    const approved = await routes.approve.PATCH(
      req(`/api/bookings/${booking.id}/approve`, { method: "PATCH", headers: adminHeaders() }),
      params({ id: booking.id }),
    );
    expect(approved.status).toBe(200);
    expect(((await approved.json()) as BookingDto).status).toBe("approved");
    expect(await slotState(20)).toBe("booked");

    const mine = await routes.byPhone.GET(req("/api/bookings/by-phone/9846012345"), params({ phone: "9846012345" }));
    expect(((await mine.json()) as BookingDto[]).map((item) => item.status)).toEqual(["approved"]);

    // 5. Approving twice is a conflict, not a silent success.
    const again = await routes.approve.PATCH(
      req(`/api/bookings/${booking.id}/approve`, { method: "PATCH", headers: adminHeaders() }),
      params({ id: booking.id }),
    );
    expect(again.status).toBe(409);

    // 6. Customers can't cancel an approved booking; admins can, which frees the slot.
    const customerCancel = await routes.cancel.PATCH(
      req(`/api/bookings/${booking.id}/cancel`, { method: "PATCH", body: { phone: "9846012345" } }),
      params({ id: booking.id }),
    );
    expect(customerCancel.status).toBe(409);
    const adminCancel = await routes.cancel.PATCH(
      req(`/api/bookings/${booking.id}/cancel`, { method: "PATCH", body: {}, headers: adminHeaders() }),
      params({ id: booking.id }),
    );
    expect(adminCancel.status).toBe(200);
    expect(await slotState(20)).toBe("available");
  });

  it("validates input with a consistent error shape", async () => {
    const res = await routes.bookings.POST(
      req("/api/bookings", {
        method: "POST",
        body: { unitId, businessDate: date, startHour: 20, customerName: "A", customerPhone: "12345", role: "admin" },
      }),
      {},
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorBody;
    expect(body.message).toBe("Validation failed");
    expect(body.details).toEqual(
      expect.arrayContaining([
        "property role should not exist",
        expect.stringContaining("customerName"),
        expect.stringContaining("10-digit Indian mobile"),
      ]),
    );
  });

  it("lets a customer cancel their own pending booking only with the matching phone", async () => {
    const created = await routes.bookings.POST(
      req("/api/bookings", {
        method: "POST",
        body: { unitId, businessDate: date, startHour: 22, customerName: "Sreya Nair", customerPhone: "9447000001" },
      }),
      {},
    );
    const { id } = (await created.json()) as BookingDto;

    const wrong = await routes.cancel.PATCH(req(`/api/bookings/${id}/cancel`, { method: "PATCH", body: { phone: "9447000002" } }), params({ id }));
    expect(wrong.status).toBe(403);
    const right = await routes.cancel.PATCH(req(`/api/bookings/${id}/cancel`, { method: "PATCH", body: { phone: "9447000001" } }), params({ id }));
    expect(right.status).toBe(200);
    expect(((await right.json()) as BookingDto).status).toBe("cancelled");
  });
});
