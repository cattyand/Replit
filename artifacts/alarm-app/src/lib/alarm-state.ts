const SNOOZE_KEY = "alarm_snooze_state";
const SNOOZE_COUNT_KEY = "alarm_snooze_counts"; // total snooze count per alarm (auto + manual), survives snooze re-fires

interface SnoozeEntry {
  snoozedUntil: number;    // timestamp ms — when the snooze period ends and alarm re-fires
  autoSnoozeCount: number; // how many auto-snooze cycles have fired (manual resets to 0)
}

type SnoozeState = Record<number, SnoozeEntry>;

export function getSnoozeState(): SnoozeState {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    return raw ? (JSON.parse(raw) as SnoozeState) : {};
  } catch {
    return {};
  }
}

/**
 * Snooze an alarm.
 * @param seconds    Snooze duration in seconds.
 * @param isAuto     True when triggered by auto-snooze (increments counter).
 *                   False (default) for manual snooze (resets counter to 0).
 */
export function snoozeAlarm(alarmId: number, seconds: number, isAuto = false) {
  const state = getSnoozeState();
  const prev = state[alarmId];
  state[alarmId] = {
    snoozedUntil: Date.now() + seconds * 1000,
    autoSnoozeCount: isAuto ? (prev?.autoSnoozeCount ?? 0) + 1 : 0,
  };
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(state));
}

export function clearSnooze(alarmId: number) {
  const state = getSnoozeState();
  delete state[alarmId];
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(state));
}

/** Returns true while the snooze quiet period is still active. */
export function isAlarmSnoozed(alarmId: number): boolean {
  const state = getSnoozeState();
  const entry = state[alarmId];
  if (!entry) return false;
  return Date.now() < entry.snoozedUntil;
}

/**
 * Returns true if the snooze has JUST expired — consuming the entry so it
 * only triggers once. Used by the alarm trigger hook.
 */
export function shouldFireAfterSnooze(alarmId: number): boolean {
  const state = getSnoozeState();
  const entry = state[alarmId];
  if (!entry) return false;
  if (Date.now() >= entry.snoozedUntil) {
    // Consume the entry — next poll will see nothing
    clearSnooze(alarmId);
    return true;
  }
  return false;
}

/** How many auto-snooze cycles have fired for this alarm (0 if none). */
export function getAutoSnoozeCount(alarmId: number): number {
  const state = getSnoozeState();
  return state[alarmId]?.autoSnoozeCount ?? 0;
}

// ── Persistent snooze count (auto + manual, resets only on explicit dismiss) ─

function getSnoozeCounts(): Record<number, number> {
  try {
    const raw = localStorage.getItem(SNOOZE_COUNT_KEY);
    return raw ? (JSON.parse(raw) as Record<number, number>) : {};
  } catch {
    return {};
  }
}

/** Total snoozes used for this alarm across re-fires (resets on dismiss, not on snooze re-fire). */
export function getSnoozeCount(alarmId: number): number {
  return getSnoozeCounts()[alarmId] ?? 0;
}

/** Increment the persistent snooze count. Returns the new total. */
export function incrementSnoozeCount(alarmId: number): number {
  const counts = getSnoozeCounts();
  counts[alarmId] = (counts[alarmId] ?? 0) + 1;
  localStorage.setItem(SNOOZE_COUNT_KEY, JSON.stringify(counts));
  return counts[alarmId];
}

/** Reset the persistent snooze count (call on explicit dismiss, not on snooze re-fire). */
export function resetSnoozeCount(alarmId: number): void {
  const counts = getSnoozeCounts();
  delete counts[alarmId];
  localStorage.setItem(SNOOZE_COUNT_KEY, JSON.stringify(counts));
}

/** Seconds remaining until snooze expires, or null if not snoozed. */
export function snoozeSecondsRemaining(alarmId: number): number | null {
  const state = getSnoozeState();
  const entry = state[alarmId];
  if (!entry) return null;
  const remaining = Math.ceil((entry.snoozedUntil - Date.now()) / 1000);
  return remaining > 0 ? remaining : null;
}

/** Timestamp (ms) when the snooze expires, or null if not snoozed. */
export function snoozedUntilTimestamp(alarmId: number): number | null {
  const state = getSnoozeState();
  const entry = state[alarmId];
  if (!entry || Date.now() >= entry.snoozedUntil) return null;
  return entry.snoozedUntil;
}
