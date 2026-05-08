// ── Haptics ───────────────────────────────────────────────────────────────────
// Wraps @capacitor/haptics so it only runs on real devices.
// Silently does nothing in a browser (no error thrown).

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

async function safe<T>(fn: () => Promise<T>): Promise<void> {
  try { await fn(); } catch { /* not on device — ignore */ }
}

export const Vibrate = {
  // Light tap — keyboard presses, button taps
  light() {
    safe(() => Haptics.impact({ style: ImpactStyle.Light }));
  },

  // Medium tap — STOP button
  medium() {
    safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
  },

  // Heavy — correct answer, level up
  heavy() {
    safe(() => Haptics.impact({ style: ImpactStyle.Heavy }));
  },

  // Success — correct guess
  success() {
    safe(() => Haptics.notification({ type: NotificationType.Success }));
  },

  // Error — wrong guess / life lost
  error() {
    safe(() => Haptics.notification({ type: NotificationType.Error }));
  },

  // Warning — too slow
  warning() {
    safe(() => Haptics.notification({ type: NotificationType.Warning }));
  },
};
