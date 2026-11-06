import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { AlarmIcon } from '@/components/alarm-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalData } from '@/lib/local-data';
import type { Alarm } from '@/lib/alarm-types';
import { RINGTONE_ASSETS } from '@/lib/ringtones';
import { cancelSnoozeNotifications, scheduleSnoozeNotification } from '@/lib/alarm-notifications';
import { text, useAppLanguage } from '@/lib/strings';

const SNOOZE_CHOICES = [
  { seconds: 10, labelIt: '10 secondi', labelEn: '10 seconds' },
  { seconds: 300, labelIt: '5 minuti', labelEn: '5 minutes' },
  { seconds: 600, labelIt: '10 minuti', labelEn: '10 minutes' },
  { seconds: 900, labelIt: '15 minuti', labelEn: '15 minutes' },
  { seconds: 1800, labelIt: '30 minuti', labelEn: '30 minutes' },
  ...Array.from({ length: 8 }, (_, index) => ({
    seconds: (index + 1) * 3600,
    labelIt: `${index + 1} ${index === 0 ? 'ora' : 'ore'}`,
    labelEn: `${index + 1} ${index === 0 ? 'hour' : 'hours'}`,
  })),
];

export default function ActiveAlarmScreen() {
  const colors = useColors();
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; simulate?: string }>();
  const store = useLocalData();
  const id = Number(params.id);
  const alarm = store.alarms.find(item => item.id === id);
  const simulated = params.simulate === 'true';
  const player = useAudioPlayer(RINGTONE_ASSETS[alarm?.ringtone ?? 'classic'] ?? RINGTONE_ASSETS.classic);
  const [muted, setMuted] = useState(false);
  const [snoozeMenu, setSnoozeMenu] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [finishing, setFinishing] = useState(false);
  const autoSnoozeTriggered = useRef(false);
  const startedAt = useRef(Date.now());
  const snoozeCount = store.snoozes[String(id)]?.count ?? 0;
  const maxSnoozes = alarm?.maxSnoozes ?? 0;
  const reachedLimit = maxSnoozes > 0 && snoozeCount >= maxSnoozes;

  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      setClock(now);
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 500);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (!store.loaded) return;
    if (!alarm) {
      router.replace('/(tabs)');
      return;
    }
    store.clearSnooze(id, false);
    startedAt.current = Date.now();
    autoSnoozeTriggered.current = false;
  // Only reset when a different active alarm is opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loaded, id]);

  useEffect(() => {
    if (!alarm || finishing) return;
    void (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: true,
        });
        player.loop = true;
        player.volume = 0;
        player.play();
        if (alarm.vibration !== 'off' && Platform.OS !== 'web') Vibration.vibrate([0, 700, 300, 700], true);
      } catch (error) {
        console.warn('Could not start alarm playback', error);
      }
    })();
    return () => {
      player.pause();
      Vibration.cancel();
    };
  }, [alarm?.id, alarm?.ringtone, finishing, player]);

  useEffect(() => {
    if (!alarm || finishing) return;
    const maxVolume = alarm.vibration === 'only' || muted ? 0 : Math.min(1, Math.max(0, alarm.volume / 100));
    const gradualSeconds = Math.max(0, alarm.gradualVolume);
    const progress = gradualSeconds === 0 ? 1 : Math.min(1, elapsed / gradualSeconds);
    player.volume = maxVolume * progress;
  }, [alarm?.id, alarm?.volume, alarm?.gradualVolume, alarm?.vibration, elapsed, muted, finishing, player]);

  const stopPlayback = () => {
    player.pause();
    Vibration.cancel();
  };

  const doSnooze = async (seconds: number) => {
    if (!alarm || finishing) return;
    if (reachedLimit) {
      Alert.alert(
        text(language, 'Limite raggiunto', 'Snooze limit reached'),
        text(language, `Hai già usato tutti i ${maxSnoozes} posticipi consentiti.`, `You have used all ${maxSnoozes} allowed snoozes.`),
      );
      return;
    }
    setFinishing(true);
    setSnoozeMenu(false);
    stopPlayback();
    const count = snoozeCount + 1;
    const until = Date.now() + seconds * 1000;
    store.setSnooze(id, until, count);
    try {
      await cancelSnoozeNotifications(id);
      await scheduleSnoozeNotification(alarm, seconds);
    } catch (error) {
      console.error('Could not schedule snooze notification', error);
      store.clearSnooze(id, false);
      setFinishing(false);
      Alert.alert(text(language, 'Posticipo non programmato', 'Snooze not scheduled'), text(language, 'Consenti le notifiche per poter ricevere il promemoria.', 'Allow notifications to receive the snooze reminder.'));
      return;
    }
    router.replace('/(tabs)');
  };

  const dismiss = async () => {
    if (!alarm || finishing) return;
    setFinishing(true);
    stopPlayback();
    await cancelSnoozeNotifications(id).catch(() => undefined);
    store.clearSnooze(id, true);
    if (alarm.alarmType === 'once') {
      if (alarm.autoDelete) store.deleteAlarm(id);
      else store.updateAlarm(id, { enabled: false });
    }
    router.replace('/(tabs)');
  };

  const cloneOnce = () => {
    if (!alarm) return;
    const clone = store.cloneAlarm(id, { once: true });
    if (!clone) return;
    setFinishing(true);
    stopPlayback();
    router.push({ pathname: '/alarm/[id]', params: { id: String(clone.id) } });
  };

  const autoRemaining = alarm?.autoSnooze
    ? Math.max(0, alarm.autoSnooze - elapsed)
    : 0;
  useEffect(() => {
    if (!alarm?.autoSnooze || finishing || reachedLimit || autoRemaining > 0 || autoSnoozeTriggered.current) return;
    autoSnoozeTriggered.current = true;
    void doSnooze(300);
  }, [alarm?.autoSnooze, autoRemaining, finishing, reachedLimit]);

  const snoozeLabel = (seconds: number) => {
    const found = SNOOZE_CHOICES.find(option => option.seconds === seconds);
    if (!found) return `${Math.round(seconds / 60)} ${text(language, 'min', 'min')}`;
    return language === 'it' ? found.labelIt : found.labelEn;
  };

  if (!store.loaded || !alarm) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground }}>{text(language, 'Apertura sveglia…', 'Opening alarm…')}</Text>
    </View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 22, paddingTop: 28, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => void dismiss()} accessibilityLabel={text(language, 'Spegni sveglia', 'Dismiss alarm')} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="x" size={19} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.alarmWarning }} />
          <Text style={{ color: colors.alarmWarning, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 }}>
            {simulated ? text(language, 'SIMULAZIONE', 'SIMULATION') : text(language, 'SVEGLIA ATTIVA', 'ALARM RINGING')}
          </Text>
        </View>
        <Pressable onPress={cloneOnce} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="copy" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: 12 }}>
        <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: `${colors.primary}1d`, borderWidth: 1, borderColor: `${colors.primary}65`, alignItems: 'center', justifyContent: 'center' }}>
          <AlarmIcon name={alarm.iconName} size={38} color={colors.primary} />
        </View>
        <Text style={{ color: colors.alarmName, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 23, textAlign: 'center' }}>{alarm.name}</Text>
        <Text style={{ color: colors.primary, fontFamily: 'SpaceMono_400Regular', fontSize: 67, letterSpacing: -3 }}>
          {String(clock.getHours()).padStart(2, '0')}:{String(clock.getMinutes()).padStart(2, '0')}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
          {clock.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        {alarm.autoSnooze > 0 && !reachedLimit ? (
          <View style={{ marginTop: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 15, backgroundColor: `${colors.alarmWarning}18`, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Feather name="clock" size={14} color={colors.alarmWarning} />
            <Text style={{ color: colors.alarmWarning, fontSize: 12, fontWeight: '700' }}>
              {text(language, `Posticipo automatico tra ${formatDuration(autoRemaining, language)}`, `Auto-snooze in ${formatDuration(autoRemaining, language)}`)}
            </Text>
          </View>
        ) : null}
        {maxSnoozes > 0 ? (
          <Text style={{ color: reachedLimit ? colors.destructive : colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
            {text(language, `Posticipi: ${snoozeCount}/${maxSnoozes}`, `Snoozes: ${snoozeCount}/${maxSnoozes}`)}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>
        <Pressable disabled={reachedLimit} onPress={() => void doSnooze(600)} style={({ pressed }) => ({ minHeight: 60, borderRadius: 20, backgroundColor: reachedLimit ? colors.muted : colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed ? 0.82 : 1 })}>
          <Feather name="clock" size={19} color={reachedLimit ? colors.mutedForeground : colors.primaryForeground} />
          <Text style={{ color: reachedLimit ? colors.mutedForeground : colors.primaryForeground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 }}>
            {reachedLimit ? text(language, 'Limite posticipi raggiunto', 'Snooze limit reached') : text(language, 'Posticipa 10 minuti', 'Snooze 10 minutes')}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => setSnoozeMenu(true)} disabled={reachedLimit} style={{ flex: 1, minHeight: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, opacity: reachedLimit ? 0.5 : 1 }}>
            <Feather name="more-horizontal" size={17} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{text(language, 'Altri posticipi', 'Other snoozes')}</Text>
          </Pressable>
          <Pressable onPress={() => setMuted(value => !value)} style={{ width: 52, minHeight: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: muted ? colors.alarmWarning : colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color={muted ? colors.alarmWarning : colors.foreground} />
          </Pressable>
          <Pressable onPress={() => void dismiss()} style={{ flex: 1, minHeight: 48, borderRadius: 17, backgroundColor: `${colors.destructive}1d`, borderWidth: 1, borderColor: `${colors.destructive}66`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
            <Feather name="square" size={15} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: '800', fontSize: 13 }}>{text(language, 'Spegni', 'Dismiss')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={snoozeMenu} transparent animationType="fade" onRequestClose={() => setSnoozeMenu(false)}>
        <Pressable onPress={() => setSnoozeMenu(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 35, maxHeight: '80%', borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, marginBottom: 10 }}>{text(language, 'Durata posticipo', 'Snooze duration')}</Text>
            {SNOOZE_CHOICES.map(option => (
              <Pressable key={option.seconds} onPress={() => void doSnooze(option.seconds)} style={{ minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                <Feather name="clock" size={16} color={colors.primary} />
                <Text style={{ color: colors.foreground }}>{language === 'it' ? option.labelIt : option.labelEn}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatDuration(seconds: number, language: string) {
  if (seconds < 60) return `${seconds} ${text(language, 'sec', 'sec')}`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} ${text(language, 'min', 'min')}`;
  return `${Math.ceil(seconds / 3600)} h`;
}
