"use client";

import { formatSlotRange } from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { adminApi, adminKeys, type AdminPushSubscriptionInput } from "@/lib/admin-api";
import { NotificationEventTracker } from "@/lib/notification-events";
import {
  getSoundPreference,
  isDevicePushSupported,
  setSoundPreference,
  subscribeDevicePushSupport,
  subscribeSoundPreference,
} from "@/lib/notification-sound";

const BUSINESS_DATE = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const CREATED_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function businessDate(value: string): string {
  return BUSINESS_DATE.format(new Date(`${value}T12:00:00+05:30`));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [featureMessage, setFeatureMessage] = useState("");
  const soundEnabled = useSyncExternalStore(subscribeSoundPreference, getSoundPreference, () => false);
  const pushSupported = useSyncExternalStore(subscribeDevicePushSupport, isDevicePushSupported, () => false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const audioContext = useRef<AudioContext | null>(null);
  const pushRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const notificationTracker = useRef<NotificationEventTracker | null>(null);
  const notifications = useQuery({
    queryKey: adminKeys.notifications,
    queryFn: adminApi.notifications,
    staleTime: 0,
  });
  const pushConfig = useQuery({
    queryKey: adminKeys.pushConfig,
    queryFn: adminApi.pushConfig,
    staleTime: Infinity,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.notifications });
  const markRead = useMutation({ mutationFn: adminApi.markNotificationRead, onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: adminApi.markAllNotificationsRead, onSuccess: refresh });

  const items = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;
  const playChime = useCallback(() => {
    const context = audioContext.current;
    if (!context || context.state !== "running") return;
    const start = context.currentTime;
    for (const [index, frequency] of [659.25, 880].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.14;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.22);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.23);
    }
  }, []);

  useEffect(() => {
    if (!isDevicePushSupported()) return;
    void navigator.serviceWorker
      .register("/service-worker.js")
      .then(async (registration) => {
        pushRegistration.current = registration;
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));
      })
      .catch(() => setFeatureMessage("This browser could not register device notifications."));
  }, []);

  useEffect(() => {
    if (!notifications.data) return;
    notificationTracker.current ??= new NotificationEventTracker();
    const freshIds = notificationTracker.current.observe(notifications.data.items.map((item) => item.id));
    if (soundEnabled) freshIds.forEach((_, index) => window.setTimeout(playChime, index * 260));
  }, [notifications.data, playChime, soundEnabled]);

  const toggleSound = async () => {
    if (soundEnabled) {
      setSoundPreference(false);
      return;
    }
    try {
      const context = audioContext.current ?? new AudioContext();
      audioContext.current = context;
      await context.resume();
      setSoundPreference(true);
      setFeatureMessage("Sound enabled. Use this control again to mute it.");
      playChime();
    } catch {
      setFeatureMessage("Sound is unavailable in this browser.");
    }
  };

  const togglePush = async () => {
    setFeatureMessage("");
    try {
      if (pushEnabled) {
        const registration = pushRegistration.current ?? (await navigator.serviceWorker.ready);
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await adminApi.removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPushEnabled(false);
        setFeatureMessage("Device notifications disabled on this browser.");
        return;
      }

      const vapidPublicKey = pushConfig.data?.vapidPublicKey;
      if (!pushSupported || !vapidPublicKey) {
        setFeatureMessage("Device push is unavailable. Check browser support and server VAPID setup.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setFeatureMessage(permission === "denied" ? "Notifications are blocked in browser settings." : "Notification permission was not granted.");
        return;
      }
      const registration = pushRegistration.current ?? (await navigator.serviceWorker.ready);
      const key = Uint8Array.from(
        atob(
          vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (vapidPublicKey.length % 4)) % 4),
        ),
        (character) => character.charCodeAt(0),
      );
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        await subscription.unsubscribe();
        throw new Error("The browser returned an incomplete push subscription");
      }
      await adminApi.savePushSubscription({
        endpoint: serialized.endpoint,
        expirationTime: serialized.expirationTime ?? null,
        keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
      } satisfies AdminPushSubscriptionInput);
      setPushEnabled(true);
      setFeatureMessage("Device notifications enabled for this browser.");
    } catch {
      setFeatureMessage("Could not update device notifications. Check the connection and browser permissions.");
    }
  };

  const unlockSound = () => {
    if (!soundEnabled || audioContext.current) return;
    try {
      audioContext.current = new AudioContext();
      void audioContext.current.resume();
    } catch {
      // The enable-sound control reports unsupported audio when it is selected.
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[60]">
      <button
        type="button"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => {
          unlockSound();
          setOpen((value) => !value);
        }}
        className="relative grid size-12 place-items-center rounded-full border border-white/15 bg-sidebar text-white shadow-admin-lift outline-none transition hover:bg-burgundy-bright focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2"
      >
        <Bell aria-hidden className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-burgundy ring-2 ring-burgundy">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id="admin-notification-panel"
          aria-label="Booking notifications"
          className="absolute top-14 right-0 w-[min(24rem,calc(100vw-6rem))] overflow-hidden rounded-2xl border border-burgundy/10 bg-white text-wine-ink shadow-admin-lift"
        >
          <header className="flex items-center justify-between gap-3 border-b border-burgundy/10 px-4 py-3">
            <div>
              <h2 className="font-bold">Notifications</h2>
              <p className="text-xs text-wine-ink/50">{unreadCount} unread booking{unreadCount === 1 ? "" : "s"}</p>
            </div>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-burgundy outline-none hover:bg-burgundy/5 focus-visible:ring-2 focus-visible:ring-burgundy disabled:opacity-40"
            >
              <CheckCheck aria-hidden className="size-4" /> Mark all read
            </button>
          </header>

          <div className="max-h-[min(65vh,30rem)] overflow-y-auto">
            {notifications.isPending ? (
              <p className="px-4 py-8 text-center text-sm text-wine-ink/50">Loading notifications…</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-9 text-center">
                <Bell aria-hidden className="mx-auto size-7 text-burgundy/35" />
                <p className="mt-2 font-bold">You’re all caught up</p>
                <p className="mt-1 text-sm text-wine-ink/50">New booking notifications will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-burgundy/8">
                {items.map((item) => (
                  <li key={item.id} className={item.isRead ? "bg-white" : "bg-burgundy/[0.045]"}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? "bg-wine-ink/20" : "bg-burgundy-bright"}`} />
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.isRead) markRead.mutate(item.id);
                          setOpen(false);
                          router.push("/admin/bookings");
                        }}
                        className="min-w-0 flex-1 text-left outline-none focus-visible:underline"
                      >
                        <span className="block text-sm font-extrabold">{item.title}</span>
                        <span className="mt-0.5 block text-sm font-semibold text-wine-ink/80">
                          {item.booking.customerName} · {item.booking.unitType === "pool" ? "8 Ball Pool" : item.booking.unitType.toUpperCase()} · {item.booking.unitName}
                        </span>
                        <span className="mt-0.5 block text-xs text-wine-ink/60">
                          {businessDate(item.booking.businessDate)} · {formatSlotRange(item.booking.startHour, item.booking.durationHours)}
                        </span>
                        <span className="mt-1 block text-[11px] text-wine-ink/45">
                          Ref {item.bookingId.slice(-6).toUpperCase()} · {item.booking.status} · {CREATED_TIME.format(new Date(item.createdAt))}
                        </span>
                      </button>
                      {!item.isRead && (
                        <button
                          type="button"
                          aria-label="Mark notification as read"
                          title="Mark as read"
                          onClick={() => markRead.mutate(item.id)}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-burgundy outline-none hover:bg-burgundy/10 focus-visible:ring-2 focus-visible:ring-burgundy"
                        >
                          <Check aria-hidden className="size-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <footer className="border-t border-burgundy/10 px-4 py-2.5">
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void toggleSound()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-burgundy/5 px-2.5 py-2 text-xs font-bold text-burgundy outline-none hover:bg-burgundy/10 focus-visible:ring-2 focus-visible:ring-burgundy"
              >
                {soundEnabled ? <VolumeX aria-hidden className="size-4" /> : <Volume2 aria-hidden className="size-4" />}
                {soundEnabled ? "Mute sound" : "Enable sound"}
              </button>
              <button
                type="button"
                onClick={() => void togglePush()}
                disabled={!pushEnabled && (!pushSupported || pushConfig.isPending || !pushConfig.data?.vapidPublicKey)}
                className="rounded-lg bg-burgundy/5 px-2.5 py-2 text-xs font-bold text-burgundy outline-none hover:bg-burgundy/10 focus-visible:ring-2 focus-visible:ring-burgundy disabled:opacity-40"
              >
                {pushEnabled ? "Disable device push" : "Enable device push"}
              </button>
            </div>
            {featureMessage && <p role="status" className="mb-2 text-xs text-wine-ink/55">{featureMessage}</p>}
            {!pushSupported && <p className="mb-2 text-xs text-wine-ink/55">Device push is not supported in this browser.</p>}
            {pushConfig.data && !pushConfig.data.vapidPublicKey && <p className="mb-2 text-xs text-wine-ink/55">Device push is not configured on this server.</p>}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/admin/bookings");
              }}
              className="text-xs font-bold text-burgundy underline-offset-4 hover:underline"
            >
              Open bookings
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
