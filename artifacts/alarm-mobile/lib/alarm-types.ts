export type AlarmType = 'once' | 'weekly' | 'specific_dates';
export type VibrationMode = 'off' | 'on' | 'only';
export type SortOrder = 'activation' | 'name' | 'personalTimes';
export type PersonalTimeKey = 'wakeup' | 'workStart' | 'lunch' | 'workEnd' | 'dinner' | 'sleep';

export type AlarmInput = {
  name: string;
  enabled: boolean;
  hour: number;
  minute: number;
  alarmType: AlarmType;
  specificDates: string[];
  weekDays: number[];
  autoDelete: boolean;
  ringtone: string;
  volume: number;
  gradualVolume: number;
  vibration: VibrationMode;
  autoSnooze: number;
  maxSnoozes: number;
  skippedDates: string[];
  personalTimeKey: PersonalTimeKey | null;
  profileId: number | null;
  iconName: string;
};

export type Alarm = AlarmInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileInput = {
  name: string;
  isDefault: boolean;
  autoDelete: boolean | null;
  ringtone: string | null;
  volume: number | null;
  gradualVolume: number | null;
  vibration: VibrationMode | null;
  autoSnooze: number | null;
  maxSnoozes: number | null;
};

export type Profile = ProfileInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  languageCode: string | null;
  sortOrder: SortOrder;
  autoBackup: boolean;
  backupHour: number;
  backupMinute: number;
  backupRetentionDays: number;
  lastAutoBackupDate: string | null;
  wakeupHour: number | null;
  wakeupMinute: number | null;
  wakeupLabel: string | null;
  wakeupColor: string | null;
  workStartHour: number | null;
  workStartMinute: number | null;
  workStartLabel: string | null;
  workStartColor: string | null;
  lunchHour: number | null;
  lunchMinute: number | null;
  lunchLabel: string | null;
  lunchColor: string | null;
  workEndHour: number | null;
  workEndMinute: number | null;
  workEndLabel: string | null;
  workEndColor: string | null;
  dinnerHour: number | null;
  dinnerMinute: number | null;
  dinnerLabel: string | null;
  dinnerColor: string | null;
  sleepHour: number | null;
  sleepMinute: number | null;
  sleepLabel: string | null;
  sleepColor: string | null;
};

export type LocalSnapshot = {
  alarms: Alarm[];
  profiles: Profile[];
  settings: Settings;
};

export type LocalBackup = {
  id: string;
  createdAt: string;
  alarmCount: number;
  automatic: boolean;
  snapshot: LocalSnapshot;
};

export type SnoozeInfo = {
  until: number | null;
  count: number;
};

export type LocalData = LocalSnapshot & {
  backups: LocalBackup[];
  snoozes: Record<string, SnoozeInfo>;
};

export const DEFAULT_SETTINGS: Settings = {
  languageCode: null,
  sortOrder: 'activation',
  autoBackup: false,
  backupHour: 20,
  backupMinute: 0,
  backupRetentionDays: 7,
  lastAutoBackupDate: null,
  wakeupHour: null, wakeupMinute: null, wakeupLabel: null, wakeupColor: null,
  workStartHour: null, workStartMinute: null, workStartLabel: null, workStartColor: null,
  lunchHour: null, lunchMinute: null, lunchLabel: null, lunchColor: null,
  workEndHour: null, workEndMinute: null, workEndLabel: null, workEndColor: null,
  dinnerHour: null, dinnerMinute: null, dinnerLabel: null, dinnerColor: null,
  sleepHour: null, sleepMinute: null, sleepLabel: null, sleepColor: null,
};

export const EMPTY_LOCAL_DATA: LocalData = {
  alarms: [],
  profiles: [],
  settings: DEFAULT_SETTINGS,
  backups: [],
  snoozes: {},
};
