import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Alarm } from '@/lib/alarm-types';
import { RINGTONES, ringtoneForName } from '@/lib/ringtones';
import { calculateNextActivation } from '@/lib/alarm-utils';

export const ALARM_NOTIFICATION_OWNER = 'alarm-manager';
export const ALARM_CHANNEL = 'alarm-manager';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestAlarmNotificationPermission() {
  if (Platform.OS === 'web') return { granted: false, status: 'undetermined' as const };
  if (Platform.OS !== 'android') return { granted: true, status: 'granted' as const };
  await ensureAlarmChannels();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  return permission;
}

async function ensureAlarmChannels() {
  if (Platform.OS !== 'android') return;
  const combinations = [
    { key: 'sound', vibration: 'on' },
    { key: 'sound', vibration: 'off' },
    { key: 'vibrate', vibration: 'only' },
  ] as const;

  for (const ringtone of RINGTONES) {
    for (const combination of combinations) {
      const channelId = getChannelId(ringtone.key, combination.vibration);
      try {
        await Notifications.setNotificationChannelAsync(channelId, {
          name: `Sveglia · ${ringtone.name}`,
          description: 'Avviso programmato da Alarm Manager',
          importance: Notifications.AndroidImportance.MAX,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: combination.key === 'vibrate' ? null : ringtone.file.replace(/\.wav$/i, ''),
          enableVibrate: combination.vibration !== 'off',
          vibrationPattern: combination.vibration === 'off' ? [] : [0, 700, 300, 700],
          lightColor: '#47c8eb',
        });
      } catch {
        // Development clients may not include custom sound resources yet.
        await Notifications.setNotificationChannelAsync(channelId, {
          name: `Sveglia · ${ringtone.name}`,
          importance: Notifications.AndroidImportance.MAX,
          sound: combination.key === 'vibrate' ? null : 'default',
          enableVibrate: combination.vibration !== 'off',
          vibrationPattern: combination.vibration === 'off' ? [] : [0, 700, 300, 700],
        });
      }
    }
  }
  await Notifications.setNotificationChannelAsync(ALARM_CHANNEL, {
    name: 'Sveglie',
    description: 'Notifiche delle sveglie di Alarm Manager',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 700, 300, 700],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function getChannelId(ringtoneKey: string, vibration: Alarm['vibration']) {
  const mode = vibration === 'only' ? 'only' : vibration === 'off' ? 'off' : 'on';
  return `alarm-${ringtoneKey}-${mode}`;
}

function nextOneTimeDate(alarm: Alarm) {
  return calculateNextActivation(alarm);
}

function upcomingDateTriggers(alarm: Alarm, horizonDays = 35) {
  const now = new Date();
  const skipped = new Set((alarm.skippedDates ?? []).map(date => date.slice(0, 10)));
  const dates: Date[] = [];
  for (let offset = 0; offset <= horizonDays; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, alarm.hour, alarm.minute, 0, 0);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (date <= now || skipped.has(dateKey)) continue;
    const isScheduled = alarm.alarmType === 'weekly'
      ? (alarm.weekDays ?? []).includes(date.getDay())
      : (alarm.specificDates ?? []).some(item => item.slice(0, 10) === dateKey);
    if (isScheduled) dates.push(date);
  }
  return dates;
}

function notificationChannelFor(alarm: Alarm) {
  const ringtone = ringtoneForName(alarm.ringtone);
  return getChannelId(ringtone.key, alarm.vibration);
}

function alarmTriggerDates(alarm: Alarm) {
  return alarm.alarmType === 'once'
    ? [nextOneTimeDate(alarm)].filter((date): date is Date => Boolean(date))
    : upcomingDateTriggers(alarm);
}

async function scheduleAlarmAtDate(alarm: Alarm, date: Date) {
  const channelId = notificationChannelFor(alarm);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alarm.name || 'Sveglia',
      body: 'Tocca per aprire la sveglia e posticiparla o spegnerla.',
      sound: ringtoneForName(alarm.ringtone).file,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        owner: ALARM_NOTIFICATION_OWNER,
        alarmId: alarm.id,
        alarmName: alarm.name,
      },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
  });
}

export async function syncAlarmNotifications(alarms: Alarm[]) {
  if (Platform.OS === 'web') return;
  await ensureAlarmChannels();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const enabledIds = new Set(alarms.filter(alarm => alarm.enabled).map(alarm => alarm.id));
  await Promise.all(
    scheduled
      .filter(item => item.content.data?.owner === ALARM_NOTIFICATION_OWNER && (
        item.content.data?.kind !== 'snooze'
        || !enabledIds.has(Number(item.content.data?.alarmId))
      ))
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
  const jobs = alarms
    .filter(alarm => alarm.enabled)
    .flatMap(alarm => alarmTriggerDates(alarm).map(date => ({ alarm, date })))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 400);
  for (const job of jobs) {
    await scheduleAlarmAtDate(job.alarm, job.date);
  }
}

export async function scheduleSnoozeNotification(alarm: Alarm, seconds: number) {
  if (Platform.OS === 'web') throw new Error('Gli avvisi locali sono disponibili nell’app Android.');
  await ensureAlarmChannels();
  const ringtone = ringtoneForName(alarm.ringtone);
  const channelId = notificationChannelFor(alarm);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: alarm.name || 'Sveglia',
      body: 'Il posticipo è terminato. Tocca per aprire la sveglia.',
      sound: ringtone.file,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        owner: ALARM_NOTIFICATION_OWNER,
        kind: 'snooze',
        alarmId: alarm.id,
        alarmName: alarm.name,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + Math.max(1, seconds) * 1000),
      channelId,
    },
  });
}

export async function cancelSnoozeNotifications(alarmId: number) {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(item => item.content.data?.owner === ALARM_NOTIFICATION_OWNER
        && item.content.data?.kind === 'snooze'
        && Number(item.content.data?.alarmId) === alarmId)
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function cancelAlarmNotifications() {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(item => item.content.data?.owner === ALARM_NOTIFICATION_OWNER)
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}
