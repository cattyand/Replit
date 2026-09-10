import { useEffect } from "react";
import { useLocation } from "wouter";
import { useListAlarms } from "@workspace/api-client-react";
import { format } from "date-fns";
import { isAlarmSnoozed, shouldFireAfterSnooze } from "@/lib/alarm-state";

type Alarm = {
  id: number;
  enabled: boolean;
  hour: number;
  minute: number;
  alarmType: string;
  weekDays?: number[] | null;
  specificDates?: string[] | null;
  skippedDates?: string[] | null;
};

/**
 * Module-level deduplication sets.
 * Normal fires: keyed by alarm-id + calendar-minute so they don't repeat within the same minute.
 * Snooze fires: `shouldFireAfterSnooze` already consumes the entry (one-shot), so
 *   we just need a tiny guard against double-fire within the same poll cycle.
 */
export const firedNormalThisMinute = new Set<string>(); // "normal-{id}-{YYYY-MM-DD-HH-mm}"
const firedSnoozeThisCycle = new Set<number>();   // alarm id, cleared each poll cycle

type FireResult = { kind: "normal" | "snooze" | "none"; alarmId?: number };

function checkWhichAlarmShouldFire(alarms: Alarm[]): FireResult {
  const now = new Date();
  const minuteKey = format(now, "yyyy-MM-dd-HH-mm");
  const todayStr = format(now, "yyyy-MM-dd");

  // Prune stale normal-fire keys
  firedNormalThisMinute.forEach(k => {
    if (!k.endsWith(minuteKey)) firedNormalThisMinute.delete(k);
  });

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;

    // ── 1. Snooze re-fire ──────────────────────────────────────────────────
    // Must check before hour:minute because the snooze target time differs.
    if (shouldFireAfterSnooze(alarm.id)) {
      // shouldFireAfterSnooze already cleared the entry — one-shot.
      if (!firedSnoozeThisCycle.has(alarm.id)) {
        return { kind: "snooze", alarmId: alarm.id };
      }
      continue;
    }

    // ── 2. Still in snooze quiet window ────────────────────────────────────
    if (isAlarmSnoozed(alarm.id)) continue;

    // ── 3. Normal scheduled fire ───────────────────────────────────────────
    if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) continue;
    if ((alarm.skippedDates ?? []).includes(todayStr)) continue;

    let matches = false;
    if (alarm.alarmType === "once") {
      // A "once" alarm should fire once its scheduled date is reached. If it never
      // fired on that exact date (e.g. app was closed), it's overdue — treat it as
      // due today too, matching the forward-rolling "next activation" shown in the UI.
      matches = alarm.specificDates && alarm.specificDates.length > 0
        ? alarm.specificDates.some(d => d.slice(0, 10) <= todayStr)
        : true;
    } else if (alarm.alarmType === "weekly") {
      matches = (alarm.weekDays ?? []).includes(now.getDay());
    } else if (alarm.alarmType === "specific_dates") {
      matches = (alarm.specificDates ?? []).some(d => d.startsWith(todayStr));
    }

    if (matches) {
      const k = `normal-${alarm.id}-${minuteKey}`;
      if (!firedNormalThisMinute.has(k)) {
        return { kind: "normal", alarmId: alarm.id };
      }
    }
  }

  return { kind: "none" };
}

export function useAlarmTrigger() {
  const [location, setLocation] = useLocation();
  const { data: alarms, refetch } = useListAlarms();

  useEffect(() => {
    function checkAlarms() {
      if (location.includes("/active")) return;

      // Clear per-cycle snooze guard for this poll run
      firedSnoozeThisCycle.clear();

      const result = checkWhichAlarmShouldFire(alarms ?? []);
      if (result.kind === "none" || result.alarmId === undefined) return;

      if (result.kind === "snooze") {
        // Snooze fires bypass the minute deduplication (different time than original)
        firedSnoozeThisCycle.add(result.alarmId);
        setLocation(`/alarm/${result.alarmId}/active`);
      } else {
        // Normal fire — record in minute deduplication set
        const now = new Date();
        const minuteKey = format(now, "yyyy-MM-dd-HH-mm");
        firedNormalThisMinute.add(`normal-${result.alarmId}-${minuteKey}`);
        setLocation(`/alarm/${result.alarmId}/active`);
      }
    }

    checkAlarms();

    // 5-second poll: responsive enough for 10-second snooze, not too aggressive.
    const interval = setInterval(() => {
      refetch();
      checkAlarms();
    }, 5_000);

    return () => clearInterval(interval);
  }, [alarms, location, setLocation, refetch]);
}
