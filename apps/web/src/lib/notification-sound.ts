const SOUND_PREFERENCE = "d8-admin-booking-sound";
const SOUND_EVENT = "d8-admin-booking-sound-change";

export function getSoundPreference(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(SOUND_PREFERENCE) === "on";
  } catch {
    return false;
  }
}

export function subscribeSoundPreference(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(SOUND_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SOUND_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setSoundPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_PREFERENCE, enabled ? "on" : "off");
  } catch {
    // The browser session can still use the interaction's AudioContext.
  }
  window.dispatchEvent(new Event(SOUND_EVENT));
}

export function isDevicePushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function subscribeDevicePushSupport(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("pageshow", onChange);
  return () => window.removeEventListener("pageshow", onChange);
}
