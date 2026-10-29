self.addEventListener("push", (event) => {
  let payload = {};
  const raw = event.data ? event.data.text() : "";
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { body: raw || "A new booking was received." };
  }

  const title = typeof payload.title === "string" ? payload.title : "New District VIII booking";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "A customer booked a gaming slot.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: typeof payload.bookingId === "string" ? `booking-${payload.bookingId}` : "district-viii-booking",
    data: { url: typeof payload.url === "string" ? payload.url : "/admin/bookings" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data && typeof event.notification.data.url === "string"
    ? event.notification.data.url
    : "/admin/bookings";
  const target = new URL(requestedUrl, self.location.origin);
  if (target.origin !== self.location.origin || !target.pathname.startsWith("/admin")) {
    target.href = new URL("/admin/bookings", self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.navigate(target.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
