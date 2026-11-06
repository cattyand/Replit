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
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useLocalData } from '@/lib/local-data';
import {
  cancelAlarmNotifications,
  requestAlarmNotificationPermission,
  syncAlarmNotifications,
} from '@/lib/alarm-notifications';

const STORAGE_KEY = 'alarm-manager.notifications-enabled';

type AlarmRuntimeValue = {
  notificationsEnabled: boolean;
  permissionGranted: boolean;
  permissionChecked: boolean;
  enabling: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  refreshAlarms: () => Promise<void>;
};

function alarmSyncKey(alarms: ReturnType<typeof useLocalData>['alarms']) {
  return JSON.stringify(alarms.map(alarm => [
    alarm.id,
    alarm.enabled,
    alarm.hour,
    alarm.minute,
    alarm.alarmType,
    alarm.weekDays,
    alarm.specificDates,
    alarm.skippedDates,
    alarm.ringtone,
    alarm.vibration,
    alarm.name,
  ]));
}

const AlarmRuntimeContext = createContext<AlarmRuntimeValue | null>(null);

export function AlarmRuntimeProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { alarms, loaded } = useLocalData();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const syncKey = useRef('');

  const refreshAlarms = useCallback(async () => {
    if (!notificationsEnabled || !permissionGranted || !loaded) return;
    await syncAlarmNotifications(alarms);
    syncKey.current = alarmSyncKey(alarms);
  }, [alarms, loaded, notificationsEnabled, permissionGranted]);

  const enableNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      setPermissionGranted(false);
      setPermissionChecked(true);
      return false;
    }
    setEnabling(true);
    try {
      const permission = await requestAlarmNotificationPermission();
      const granted = Boolean(permission.granted);
      setPermissionGranted(granted);
      setPermissionChecked(true);
      setNotificationsEnabled(granted);
      await AsyncStorage.setItem(STORAGE_KEY, granted ? 'true' : 'false');
      if (!granted) await cancelAlarmNotifications();
      return granted;
    } finally {
      setEnabling(false);
    }
  }, []);

  const disableNotifications = useCallback(async () => {
    setNotificationsEnabled(false);
    syncKey.current = '';
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    await cancelAlarmNotifications();
  }, []);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'web') {
      setPermissionChecked(true);
      setPermissionGranted(false);
      return () => { mounted = false; };
    }
    void (async () => {
      const [enabledValue, permission] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        Notifications.getPermissionsAsync(),
      ]);
      if (!mounted) return;
      const granted = Boolean(permission.granted);
      setPermissionGranted(granted);
      setPermissionChecked(true);
      setNotificationsEnabled(enabledValue === 'true' && granted);
    })();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void Notifications.getPermissionsAsync().then(permission => {
          const granted = Boolean(permission.granted);
          setPermissionGranted(granted);
          setPermissionChecked(true);
        });
      }
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && notificationsEnabled && permissionGranted && loaded) {
        syncKey.current = '';
        void refreshAlarms();
      }
    });
    return () => subscription.remove();
  }, [notificationsEnabled, permissionGranted, loaded, refreshAlarms]);

  useEffect(() => {
    if (!loaded || !notificationsEnabled || !permissionGranted) return;
    const nextKey = alarmSyncKey(alarms);
    if (nextKey === syncKey.current) return;
    syncKey.current = nextKey;
    void syncAlarmNotifications(alarms).catch(error => {
      console.warn('Could not schedule local alarms', error);
      syncKey.current = '';
    });
  }, [alarms, loaded, notificationsEnabled, permissionGranted]);

  useEffect(() => {
    if (!notificationsEnabled || !permissionGranted || !loaded) return;
    const interval = setInterval(() => {
      syncKey.current = '';
      void refreshAlarms();
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [notificationsEnabled, permissionGranted, loaded, refreshAlarms]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const openAlarm = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      const alarmId = data?.alarmId;
      if (typeof alarmId === 'number' || (typeof alarmId === 'string' && alarmId.length > 0)) {
        router.push({ pathname: '/alarm/active/[id]', params: { id: String(alarmId) } });
        void Notifications.clearLastNotificationResponseAsync();
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openAlarm);
    void Notifications.getLastNotificationResponseAsync().then(openAlarm);
    return () => subscription.remove();
  }, [router]);

  const value = useMemo<AlarmRuntimeValue>(() => ({
    notificationsEnabled,
    permissionGranted,
    permissionChecked,
    enabling,
    enableNotifications,
    disableNotifications,
    refreshAlarms,
  }), [
    notificationsEnabled,
    permissionGranted,
    permissionChecked,
    enabling,
    enableNotifications,
    disableNotifications,
    refreshAlarms,
  ]);

  return <AlarmRuntimeContext.Provider value={value}>{children}</AlarmRuntimeContext.Provider>;
}

export function useAlarmRuntime() {
  const value = useContext(AlarmRuntimeContext);
  if (!value) throw new Error('useAlarmRuntime must be used inside AlarmRuntimeProvider');
  return value;
}
