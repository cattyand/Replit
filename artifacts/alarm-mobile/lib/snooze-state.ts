import AsyncStorage from '@react-native-async-storage/async-storage';

const SNOOZE_UNTIL_KEY = 'alarm-manager.snoozed-until.';

export async function getAlarmSnoozeUntil(alarmId: number): Promise<number | null> {
  const value = await AsyncStorage.getItem(`${SNOOZE_UNTIL_KEY}${alarmId}`);
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    if (value != null) await AsyncStorage.removeItem(`${SNOOZE_UNTIL_KEY}${alarmId}`);
    return null;
  }
  return timestamp;
}

export function setAlarmSnoozeUntil(alarmId: number, timestamp: number) {
  return AsyncStorage.setItem(`${SNOOZE_UNTIL_KEY}${alarmId}`, String(timestamp));
}

export function clearAlarmSnoozeUntil(alarmId: number) {
  return AsyncStorage.removeItem(`${SNOOZE_UNTIL_KEY}${alarmId}`);
}
