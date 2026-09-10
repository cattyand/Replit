import { useEffect, useRef, useCallback } from "react";

const VIBRATE_PATTERN = [500, 300, 500, 300, 500]; // ms on, off, on, off, on
const REPEAT_INTERVAL_MS = 2400; // re-trigger every ~2.4s

/**
 * Drives the device Vibration API while an alarm is active.
 *
 * vibration === "on"   → vibrate + audio (caller keeps audio enabled)
 * vibration === "only" → vibrate only (caller disables audio)
 * vibration === "off"  → no vibration
 */
export function useAlarmVibration({
  enabled,
  vibration,
}: {
  enabled: boolean;
  vibration: string;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  const stopVibration = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try { navigator.vibrate?.(0); } catch { /* unsupported — ignore */ }
  }, []);

  useEffect(() => {
    const shouldVibrate = enabled && (vibration === "on" || vibration === "only");
    if (!shouldVibrate) return;
    if (!navigator.vibrate) return;

    stoppedRef.current = false;

    const doVibrate = () => {
      if (stoppedRef.current) return;
      try { navigator.vibrate(VIBRATE_PATTERN); } catch { /* unsupported */ }
    };

    doVibrate();
    intervalRef.current = setInterval(doVibrate, REPEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try { navigator.vibrate?.(0); } catch { /* ignore */ }
    };
  }, [enabled, vibration]);

  return { stopVibration };
}
