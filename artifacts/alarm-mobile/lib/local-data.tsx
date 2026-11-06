import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  EMPTY_LOCAL_DATA,
  type Alarm,
  type AlarmInput,
  type LocalBackup,
  type LocalData,
  type LocalSnapshot,
  type Profile,
  type ProfileInput,
  type Settings,
} from '@/lib/alarm-types';

const STORAGE_KEY = 'alarm-manager.local-data.v1';

type LocalDataContextValue = LocalData & {
  loaded: boolean;
  createAlarm: (input: AlarmInput) => Alarm;
  updateAlarm: (id: number, changes: Partial<AlarmInput>) => void;
  deleteAlarm: (id: number) => void;
  cloneAlarm: (id: number, options?: { once?: boolean; nameSuffix?: string }) => Alarm | null;
  skipNextOccurrence: (id: number) => void;
  revertSkippedOccurrence: (id: number) => void;
  createProfile: (input: ProfileInput) => Profile;
  updateProfile: (id: number, changes: Partial<ProfileInput>) => void;
  deleteProfile: (id: number) => void;
  updateSettings: (changes: Partial<Settings>) => void;
  createBackup: (automatic?: boolean) => LocalBackup;
  restoreBackup: (id: string) => void;
  deleteBackup: (id: string) => void;
  replaceAll: (snapshot: LocalSnapshot) => void;
  setSnooze: (id: number, until: number, count: number) => void;
  clearSnooze: (id: number, resetCount?: boolean) => void;
};

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nextOccurrence(alarm: Alarm) {
  const now = new Date();
  const skipped = new Set(alarm.skippedDates.map(value => value.slice(0, 10)));
  const candidateFor = (day: Date) => new Date(
    day.getFullYear(), day.getMonth(), day.getDate(), alarm.hour, alarm.minute, 0, 0,
  );
  if (alarm.alarmType === 'once') {
    const selected = alarm.specificDates[0];
    const day = selected ? new Date(`${selected.slice(0, 10)}T12:00:00`) : new Date();
    const candidate = candidateFor(day);
    if (candidate <= now && !selected) candidate.setDate(candidate.getDate() + 1);
    return candidate > now && !skipped.has(dateKey(candidate)) ? candidate : null;
  }
  if (alarm.alarmType === 'specific_dates') {
    const dates = alarm.specificDates
      .map(value => new Date(`${value.slice(0, 10)}T12:00:00`))
      .filter(date => Number.isFinite(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    for (const date of dates) {
      const candidate = candidateFor(date);
      if (candidate > now && !skipped.has(dateKey(candidate))) return candidate;
    }
    return null;
  }
  for (let offset = 0; offset <= 3650; offset += 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const candidate = candidateFor(day);
    if (candidate > now && alarm.weekDays.includes(day.getDay()) && !skipped.has(dateKey(day))) return candidate;
  }
  return null;
}

function snapshotOf(data: LocalData): LocalSnapshot {
  return {
    alarms: data.alarms,
    profiles: data.profiles,
    settings: data.settings,
  };
}

function parseStoredData(value: string | null): LocalData {
  if (!value) return EMPTY_LOCAL_DATA;
  try {
    const parsed = JSON.parse(value) as Partial<LocalData>;
    return {
      alarms: Array.isArray(parsed.alarms) ? parsed.alarms : [],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      backups: Array.isArray(parsed.backups) ? parsed.backups : [],
      snoozes: parsed.snoozes && typeof parsed.snoozes === 'object' ? parsed.snoozes : {},
    };
  } catch (error) {
    console.error('Could not read local alarm data', error);
    return EMPTY_LOCAL_DATA;
  }
}

export function LocalDataProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<LocalData>(EMPTY_LOCAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const dataRef = useRef(data);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (cancelled) return;
      const restored = parseStoredData(value);
      dataRef.current = restored;
      setData(restored);
      setLoaded(true);
    }).catch(error => {
      console.error('Could not load local alarm data', error);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(error => {
      console.error('Could not save local alarm data', error);
    });
  }, [data, loaded]);

  const commit = useCallback((update: (current: LocalData) => LocalData) => {
    const next = update(dataRef.current);
    dataRef.current = next;
    setData(next);
  }, []);

  const createAlarm = useCallback((input: AlarmInput) => {
    const alarm: Alarm = {
      ...input,
      id: Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commit(current => ({ ...current, alarms: [...current.alarms, alarm] }));
    return alarm;
  }, [commit]);

  const updateAlarm = useCallback((id: number, changes: Partial<AlarmInput>) => {
    commit(current => ({
      ...current,
      alarms: current.alarms.map(alarm => alarm.id === id
        ? { ...alarm, ...changes, updatedAt: new Date().toISOString() }
        : alarm),
    }));
  }, [commit]);

  const deleteAlarm = useCallback((id: number) => {
    commit(current => {
      const snoozes = { ...current.snoozes };
      delete snoozes[String(id)];
      return {
        ...current,
        alarms: current.alarms.filter(alarm => alarm.id !== id),
        snoozes,
      };
    });
  }, [commit]);

  const cloneAlarm = useCallback((id: number, options: { once?: boolean; nameSuffix?: string } = {}) => {
    const original = dataRef.current.alarms.find(alarm => alarm.id === id);
    if (!original) return null;
    const once = options.once ?? false;
    const now = new Date();
    const clone: Alarm = {
      ...original,
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: `${original.name}${options.nameSuffix ?? (once ? ' (clonata)' : ' (Copia)')}`,
      enabled: true,
      alarmType: once ? 'once' : original.alarmType,
      specificDates: once
        ? [dateKey(now)]
        : original.alarmType === 'once' ? [...original.specificDates] : [...original.specificDates],
      weekDays: once ? [] : [...original.weekDays],
      skippedDates: [],
      autoDelete: once ? true : original.autoDelete,
      profileId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    commit(current => ({ ...current, alarms: [...current.alarms, clone] }));
    return clone;
  }, [commit]);

  const skipNextOccurrence = useCallback((id: number) => {
    const alarm = dataRef.current.alarms.find(item => item.id === id);
    const next = alarm ? nextOccurrence(alarm) : null;
    if (!alarm || !next) return;
    const skippedDate = dateKey(next);
    updateAlarm(id, { skippedDates: [...new Set([...alarm.skippedDates, skippedDate])] });
  }, [updateAlarm]);

  const revertSkippedOccurrence = useCallback((id: number) => {
    const alarm = dataRef.current.alarms.find(item => item.id === id);
    if (!alarm?.skippedDates.length) return;
    const skippedDates = [...alarm.skippedDates].sort();
    skippedDates.pop();
    updateAlarm(id, { skippedDates });
  }, [updateAlarm]);

  const createProfile = useCallback((input: ProfileInput) => {
    const now = new Date().toISOString();
    const profile: Profile = {
      ...input,
      id: Date.now() + Math.floor(Math.random() * 1000),
      createdAt: now,
      updatedAt: now,
    };
    commit(current => ({
      ...current,
      profiles: [
        ...current.profiles.map(item => input.isDefault && item.isDefault ? { ...item, isDefault: false } : item),
        profile,
      ],
    }));
    return profile;
  }, [commit]);

  const updateProfile = useCallback((id: number, changes: Partial<ProfileInput>) => {
    commit(current => ({
      ...current,
      profiles: current.profiles.map(profile => {
        if (profile.id === id) return { ...profile, ...changes, updatedAt: new Date().toISOString() };
        if (changes.isDefault && profile.isDefault) return { ...profile, isDefault: false };
        return profile;
      }),
    }));
  }, [commit]);

  const deleteProfile = useCallback((id: number) => {
    commit(current => ({
      ...current,
      profiles: current.profiles.filter(profile => profile.id !== id),
      alarms: current.alarms.map(alarm => alarm.profileId === id ? { ...alarm, profileId: null } : alarm),
    }));
  }, [commit]);

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    commit(current => ({ ...current, settings: { ...current.settings, ...changes } }));
  }, [commit]);

  const createBackup = useCallback((automatic = false) => {
    const current = dataRef.current;
    const backup: LocalBackup = {
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      createdAt: new Date().toISOString(),
      alarmCount: current.alarms.length,
      automatic,
      snapshot: snapshotOf(current),
    };
    commit(previous => {
      let backups = [...previous.backups, backup];
      if (automatic) {
        const cutoff = Date.now() - Math.max(1, previous.settings.backupRetentionDays) * 24 * 60 * 60 * 1000;
        backups = backups.filter(item => !item.automatic || new Date(item.createdAt).getTime() >= cutoff);
      } else {
        backups = backups.slice(-100);
      }
      return {
        ...previous,
        backups,
        settings: automatic
          ? { ...previous.settings, lastAutoBackupDate: dateKey(new Date()) }
          : previous.settings,
      };
    });
    return backup;
  }, [commit]);

  const restoreBackup = useCallback((id: string) => {
    const backup = dataRef.current.backups.find(item => item.id === id);
    if (!backup) return;
    commit(current => ({
      ...current,
      alarms: backup.snapshot.alarms,
      profiles: backup.snapshot.profiles,
      settings: backup.snapshot.settings,
    }));
  }, [commit]);

  const deleteBackup = useCallback((id: string) => {
    commit(current => ({ ...current, backups: current.backups.filter(item => item.id !== id) }));
  }, [commit]);

  const replaceAll = useCallback((snapshot: LocalSnapshot) => {
    commit(current => ({
      ...current,
      alarms: snapshot.alarms,
      profiles: snapshot.profiles,
      settings: { ...DEFAULT_SETTINGS, ...snapshot.settings },
    }));
  }, [commit]);

  const setSnooze = useCallback((id: number, until: number, count: number) => {
    commit(current => ({
      ...current,
      snoozes: { ...current.snoozes, [String(id)]: { until, count } },
    }));
  }, [commit]);

  const clearSnooze = useCallback((id: number, resetCount = false) => {
    commit(current => {
      const currentState = current.snoozes[String(id)];
      if (!currentState) return current;
      return {
        ...current,
        snoozes: {
          ...current.snoozes,
          [String(id)]: { until: null, count: resetCount ? 0 : currentState.count },
        },
      };
    });
  }, [commit]);

  useEffect(() => {
    if (!loaded || !data.settings.autoBackup) return;
    const checkBackup = () => {
      const now = new Date();
      const targetMinutes = data.settings.backupHour * 60 + data.settings.backupMinute;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (data.settings.lastAutoBackupDate === dateKey(now) || currentMinutes < targetMinutes) return;
      createBackup(true);
    };
    checkBackup();
    const timer = setInterval(checkBackup, 60_000);
    return () => clearInterval(timer);
  }, [
    loaded,
    data.settings.autoBackup,
    data.settings.backupHour,
    data.settings.backupMinute,
    data.settings.lastAutoBackupDate,
    createBackup,
  ]);

  const value = useMemo<LocalDataContextValue>(() => ({
    ...data,
    loaded,
    createAlarm,
    updateAlarm,
    deleteAlarm,
    cloneAlarm,
    skipNextOccurrence,
    revertSkippedOccurrence,
    createProfile,
    updateProfile,
    deleteProfile,
    updateSettings,
    createBackup,
    restoreBackup,
    deleteBackup,
    replaceAll,
    setSnooze,
    clearSnooze,
  }), [
    data, loaded, createAlarm, updateAlarm, deleteAlarm, cloneAlarm, skipNextOccurrence,
    revertSkippedOccurrence, createProfile, updateProfile, deleteProfile, updateSettings,
    createBackup, restoreBackup, deleteBackup, replaceAll, setSnooze, clearSnooze,
  ]);

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
}

export function useLocalData() {
  const value = useContext(LocalDataContext);
  if (!value) throw new Error('useLocalData must be used inside LocalDataProvider');
  return value;
}
