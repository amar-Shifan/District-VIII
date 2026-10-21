"use client";

import { useSyncExternalStore } from "react";

/** Name and phone remembered on this device to prefill booking forms and the My booking lookup. */
export interface CustomerProfile {
  name: string;
  phone: string;
}

const STORAGE_KEY = "district8.customer";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedProfile: CustomerProfile | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): CustomerProfile | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && "name" in value && "phone" in value) {
      const { name, phone } = value as Record<string, unknown>;
      if (typeof name === "string" && typeof phone === "string") return { name, phone };
    }
  } catch {
    // Corrupt entry: treat as no profile.
  }
  return null;
}

function getSnapshot(): CustomerProfile | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = parse(raw);
  }
  return cachedProfile;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveCustomerProfile(profile: CustomerProfile): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Private mode or storage disabled: the form simply won't prefill next time.
  }
  listeners.forEach((listener) => listener());
}

/** Null on the server and until hydration, then the stored profile (if any). */
export function useCustomerProfile(): CustomerProfile | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
