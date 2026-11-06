import type { Alarm, AlarmInput } from '@/lib/alarm-types';
import { formatDate, formatTime, formatTimeLeft, text, translate } from '@/lib/strings';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function calculateNextActivation(alarm: Alarm, now = new Date()): Date | null {
  if (!alarm.enabled) return null;
  const skipped = new Set((alarm.skippedDates ?? []).map(value => value.slice(0, 10)));
  const makeCandidate = (day: Date) => new Date(
    day.getFullYear(), day.getMonth(), day.getDate(), alarm.hour, alarm.minute, 0, 0,
  );

  if (alarm.alarmType === 'once') {
    const selectedDate = alarm.specificDates?.[0];
    if (selectedDate) {
      const day = new Date(`${selectedDate.slice(0, 10)}T12:00:00`);
      const candidate = makeCandidate(day);
      return candidate > now && !skipped.has(dateKey(candidate)) ? candidate : null;
    }
    for (let offset = 0; offset <= 1; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const candidate = makeCandidate(day);
      if (candidate > now && !skipped.has(dateKey(day))) return candidate;
    }
    return null;
  }

  if (alarm.alarmType === 'weekly') {
    const days = alarm.weekDays ?? [];
    if (days.length === 0) return null;
    for (let offset = 0; offset <= 3650; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const candidate = makeCandidate(day);
      if (candidate > now && days.includes(day.getDay()) && !skipped.has(dateKey(day))) return candidate;
    }
    return null;
  }

  const dates = (alarm.specificDates ?? [])
    .map(value => new Date(`${value.slice(0, 10)}T00:00:00`))
    .filter(date => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  for (const day of dates) {
    const candidate = makeCandidate(day);
    if (candidate > now && !skipped.has(dateKey(day))) return candidate;
  }
  return null;
}

export function toAlarmInput(alarm: Alarm, changes: Partial<AlarmInput> = {}): AlarmInput {
  return {
    name: alarm.name,
    enabled: alarm.enabled,
    hour: alarm.hour,
    minute: alarm.minute,
    alarmType: alarm.alarmType,
    specificDates: alarm.specificDates ?? [],
    weekDays: alarm.weekDays ?? [],
    autoDelete: alarm.autoDelete,
    ringtone: alarm.ringtone,
    volume: alarm.volume,
    gradualVolume: alarm.gradualVolume,
    vibration: alarm.vibration,
    autoSnooze: alarm.autoSnooze,
    maxSnoozes: alarm.maxSnoozes,
    skippedDates: alarm.skippedDates ?? [],
    personalTimeKey: alarm.personalTimeKey ?? null,
    profileId: alarm.profileId ?? null,
    iconName: alarm.iconName ?? 'alarm-clock',
    ...changes,
  };
}

export function repeatLabel(alarm: Alarm, language: string) {
  if (alarm.alarmType === 'once') {
    return alarm.specificDates?.[0]
      ? new Date(`${alarm.specificDates[0].slice(0, 10)}T12:00:00`).toLocaleDateString(language, { day: 'numeric', month: 'short' })
      : text(language, 'Una tantum', 'One time');
  }
  if (alarm.alarmType === 'specific_dates') {
    return text(language, `${alarm.specificDates?.length ?? 0} date specifiche`, `${alarm.specificDates?.length ?? 0} specific dates`);
  }
  const weekdays = translate(language, 'alarmCard.weekdays') as string[];
  return (alarm.weekDays ?? []).slice().sort((a, b) => a - b).map(day => weekdays[day]).join(' · ')
    || text(language, 'Nessun giorno', 'No days selected');
}

const PERSONAL_TIME_ORDER: Record<string, number> = {
  wakeup: 0,
  workStart: 1,
  lunch: 2,
  workEnd: 3,
  dinner: 4,
  sleep: 5,
};

export function sortAlarms(alarms: Alarm[], order: string) {
  return [...alarms].sort((a, b) => {
    if (!a.enabled && b.enabled) return 1;
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && !b.enabled) return 0;

    if (order === 'name') {
      return a.name.localeCompare(b.name) || compareActivation(a, b);
    }
    if (order === 'personalTimes') {
      const aOrder = a.personalTimeKey ? PERSONAL_TIME_ORDER[a.personalTimeKey] ?? 99 : 99;
      const bOrder = b.personalTimeKey ? PERSONAL_TIME_ORDER[b.personalTimeKey] ?? 99 : 99;
      return aOrder - bOrder || compareActivation(a, b);
    }
    return compareActivation(a, b);
  });
}

function compareActivation(a: Alarm, b: Alarm) {
  const nextA = calculateNextActivation(a);
  const nextB = calculateNextActivation(b);
  if (!nextA && !nextB) return 0;
  if (!nextA) return 1;
  if (!nextB) return -1;
  return nextA.getTime() - nextB.getTime();
}

export function nextAlarmSummary(alarms: Alarm[], language: string) {
  const nextAlarm = sortAlarms(alarms.filter(alarm => alarm.enabled), 'activation')[0];
  const nextDate = nextAlarm ? calculateNextActivation(nextAlarm) : null;
  if (!nextAlarm || !nextDate) return text(language, 'Nessuna sveglia attiva', 'No active alarms');
  const datetime = `${nextDate.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' })}, ${formatTime(nextDate.getHours(), nextDate.getMinutes())}`;
  return translate(language, 'home.nextAlarm', {
    timeLeft: formatTimeLeft(nextDate, language),
    datetime,
  }) as string;
}

export function formatNextOccurrence(date: Date, language: string) {
  return `${formatTimeLeft(date, language)} (${date.toLocaleDateString(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })})`;
}

export function formatPersonalTimeName(settings: Record<string, unknown>, key: string, language: string) {
  const labelKey = `${key}Label`;
  const custom = settings[labelKey];
  if (typeof custom === 'string' && custom.trim()) return custom;
  const knownKey: Record<string, string> = {
    wakeup: 'settings.wakeup',
    workStart: 'settings.workStart',
    lunch: 'settings.lunch',
    workEnd: 'settings.workEnd',
    dinner: 'settings.dinner',
    sleep: 'settings.sleep',
  };
  const translated = translate(language, knownKey[key] ?? '');
  return typeof translated === 'string' ? translated : key;
}

export function personalTimeColor(settings: Record<string, unknown>, key: string) {
  const color = settings[`${key}Color`];
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

