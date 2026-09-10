import { addDays, differenceInMinutes, format, isAfter, parseISO, setHours, setMinutes, startOfDay } from "date-fns";
import { Alarm } from "@workspace/api-client-react";
import i18next from "i18next";

export function calculateNextActivation(alarm: Alarm): Date | null {
  if (!alarm.enabled) return null;

  const now = new Date();
  const skipped = new Set(alarm.skippedDates ?? []);

  // ── Once ──────────────────────────────────────────────────────────────────
  if (alarm.alarmType === "once") {
    for (let i = 0; i <= 1; i++) {
      const day  = addDays(startOfDay(now), i);
      const candidate = setMinutes(setHours(day, alarm.hour), alarm.minute);
      const dateStr   = format(day, "yyyy-MM-dd");
      if (isAfter(candidate, now) && !skipped.has(dateStr)) return candidate;
    }
    return null;
  }

  // ── Weekly ────────────────────────────────────────────────────────────────
  if (alarm.alarmType === "weekly") {
    const days = alarm.weekDays ?? [];
    if (days.length === 0) return null;

    for (let i = 0; i <= 3650; i++) {
      const day       = addDays(startOfDay(now), i);
      const candidate = setMinutes(setHours(day, alarm.hour), alarm.minute);
      const dateStr   = format(day, "yyyy-MM-dd");

      if (
        isAfter(candidate, now) &&
        days.includes(day.getDay()) &&
        !skipped.has(dateStr)
      ) {
        return candidate;
      }
    }
    return null;
  }

  // ── Specific dates ────────────────────────────────────────────────────────
  if (alarm.alarmType === "specific_dates") {
    const dates = (alarm.specificDates ?? [])
      .map(d => parseISO(d))
      .sort((a, b) => a.getTime() - b.getTime());

    for (const date of dates) {
      const candidate = setMinutes(setHours(startOfDay(date), alarm.hour), alarm.minute);
      const dateStr   = format(date, "yyyy-MM-dd");
      if (isAfter(candidate, now) && !skipped.has(dateStr)) return candidate;
    }
  }

  return null;
}

export function formatTimeLeft(date: Date): string {
  const t = i18next.t.bind(i18next);
  const now      = new Date();
  const diffMins = differenceInMinutes(date, now);

  if (diffMins < 60) {
    return t("time.inMin", { n: diffMins });
  }

  const diffHours     = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;

  if (diffHours < 24) {
    return remainingMins > 0
      ? t("time.inHoursMin", { h: diffHours, m: remainingMins })
      : t("time.inHours", { n: diffHours });
  }

  const diffDays = Math.floor(diffHours / 24);
  return t("time.inDays", { n: diffDays });
}
