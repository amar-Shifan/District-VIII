"use client";

import { io, type Socket } from "socket.io-client";
import { API_URL } from "./config";

let publicSocket: Socket | null = null;

/** One shared, lazily created connection for public (customer) events. */
export function getPublicSocket(): Socket {
  publicSocket ??= io(API_URL, {
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 10_000,
  });
  return publicSocket;
}

/**
 * Admin connection. The token callback runs on every (re)connect, so an
 * expired short-lived socket token is replaced automatically.
 */
export function createAdminSocket(getToken: () => Promise<string | null>): Socket {
  return io(API_URL, {
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 10_000,
    auth: (callback) => {
      getToken()
        .then((token) => callback({ token }))
        .catch(() => callback({}));
    },
  });
}
