import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { AlarmIcon, ALARM_ICON_OPTIONS } from '@/components/alarm-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalData } from '@/lib/local-data';
import type { AlarmInput, Alarm, PersonalTimeKey, Profile } from '@/lib/alarm-types';
import { RINGTONE_ASSETS, RINGTONES } from '@/lib/ringtones';
import { text, translate, useAppLanguage } from '@/lib/strings';

const PERSONAL_TIMES: Array<{ key: PersonalTimeKey; label: string }> = [
  { key: 'wakeup', label: 'Sveglia' },
  { key: 'workStart', label: 'Inizio lavoro' },
  { key: 'lunch', label: 'Pranzo' },
  { key: 'workEnd', label: 'Fine lavoro' },
  { key: 'dinner', label: 'Cena' },
  { key: 'sleep', label: 'Sonno' },
];

const WEEKDAY_FALLBACK = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const GRADUAL_OPTIONS = [0, 5, 10, 15, 30, 60];
const SNOOZE_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 10, label: '10 sec' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
  ...Array.from({ length: 8 }, (_, index) => ({ value: (index + 1) * 3600, label: `${index + 1} h` })),
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayAlarm(): AlarmInput {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  return {
    name: '',
    enabled: true,
    hour: now.getHours() % 24,
    minute: now.getMinutes(),
    alarmType: 'once',
    specificDates: [dateKey(now)],
    weekDays: [],
    autoDelete: false,
    ringtone: 'classic',
    volume: 80,
    gradualVolume: 0,
    vibration: 'on',
    autoSnooze: 0,
    maxSnoozes: 0,
    skippedDates: [],
    personalTimeKey: null,
    profileId: null,
    iconName: 'alarm-clock',
  };
}

function applyProfile(input: AlarmInput, profile: Profile | null) {
  if (!profile) return { form: { ...input, profileId: null }, inherited: new Set<string>() };
  const inherited = new Set<string>();
  const form = { ...input, profileId: profile.id };
  if (profile.autoDelete !== null) { form.autoDelete = profile.autoDelete; inherited.add('autoDelete'); }
  if (profile.ringtone !== null) { form.ringtone = profile.ringtone; inherited.add('ringtone'); }
  if (profile.volume !== null) { form.volume = profile.volume; inherited.add('volume'); }
  if (profile.gradualVolume !== null) { form.gradualVolume = profile.gradualVolume; inherited.add('gradualVolume'); }
  if (profile.vibration !== null) { form.vibration = profile.vibration; inherited.add('vibration'); }
  if (profile.autoSnooze !== null) { form.autoSnooze = profile.autoSnooze; inherited.add('autoSnooze'); }
  if (profile.maxSnoozes !== null) { form.maxSnoozes = profile.maxSnoozes; inherited.add('maxSnoozes'); }
  return { form, inherited };
}

function AudioPreview({ ringtoneKey }: { ringtoneKey: string }) {
  const colors = useColors();
  const language = useAppLanguage();
  const player = useAudioPlayer(RINGTONE_ASSETS[ringtoneKey] ?? RINGTONE_ASSETS.classic);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      player.pause();
      setPlaying(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [playing, player]);

  useEffect(() => () => player.pause(), [player]);

  const togglePreview = async () => {
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
    player.loop = false;
    player.volume = 0.85;
    await player.seekTo(0);
    player.play();
    setPlaying(true);
  };

  return (
    <Pressable onPress={() => void togglePreview()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20`, borderWidth: 1, borderColor: `${colors.primary}55` }}>
      <Feather name={playing ? 'pause' : 'play'} size={17} color={colors.primary} />
      <Text style={{ position: 'absolute', top: 42, right: -4, width: 90, fontSize: 9, color: colors.mutedForeground, textAlign: 'right' }}>
        {text(language, 'Anteprima', 'Preview')}
      </Text>
    </Pressable>
  );
}

export default function NewAlarmScreen() {
  const colors = useColors();
  const language = useAppLanguage();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const store = useLocalData();
  const id = params.id ? Number(params.id) : null;
  const editingAlarm = id ? store.alarms.find(alarm => alarm.id === id) : undefined;
  const [form, setForm] = useState<AlarmInput | null>(null);
  const [inheritedFields, setInheritedFields] = useState<Set<string>>(new Set());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());
  const [customMax, setCustomMax] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!store.loaded) return;
    if (id) {
      const alarm = store.alarms.find(item => item.id === id);
      if (!alarm) {
        Alert.alert(text(language, 'Sveglia non trovata', 'Alarm not found'), text(language, 'Questa sveglia potrebbe essere stata eliminata.', 'This alarm may have been deleted.'));
        router.back();
        return;
      }
      const input: AlarmInput = {
        name: alarm.name,
        enabled: alarm.enabled,
        hour: alarm.hour,
        minute: alarm.minute,
        alarmType: alarm.alarmType,
        specificDates: [...alarm.specificDates],
        weekDays: [...alarm.weekDays],
        autoDelete: alarm.autoDelete,
        ringtone: alarm.ringtone,
        volume: alarm.volume,
        gradualVolume: alarm.gradualVolume,
        vibration: alarm.vibration,
        autoSnooze: alarm.autoSnooze,
        maxSnoozes: alarm.maxSnoozes,
        skippedDates: [...alarm.skippedDates],
        personalTimeKey: alarm.personalTimeKey,
        profileId: alarm.profileId,
        iconName: alarm.iconName,
      };
      const profile = store.profiles.find(item => item.id === alarm.profileId) ?? null;
      const inherited = new Set<string>();
      if (profile) {
        if (profile.autoDelete !== null && alarm.autoDelete === profile.autoDelete) inherited.add('autoDelete');
        if (profile.ringtone !== null && alarm.ringtone === profile.ringtone) inherited.add('ringtone');
        if (profile.volume !== null && alarm.volume === profile.volume) inherited.add('volume');
        if (profile.gradualVolume !== null && alarm.gradualVolume === profile.gradualVolume) inherited.add('gradualVolume');
        if (profile.vibration !== null && alarm.vibration === profile.vibration) inherited.add('vibration');
        if (profile.autoSnooze !== null && alarm.autoSnooze === profile.autoSnooze) inherited.add('autoSnooze');
        if (profile.maxSnoozes !== null && alarm.maxSnoozes === profile.maxSnoozes) inherited.add('maxSnoozes');
      }
      setForm(input);
      setInheritedFields(inherited);
      setCustomMax(String(input.maxSnoozes));
    } else {
      const defaultProfile = store.profiles.find(profile => profile.isDefault) ?? null;
      const { form: initialForm, inherited } = applyProfile(todayAlarm(), defaultProfile);
      setForm(initialForm);
      setInheritedFields(inherited);
      setCustomMax(String(initialForm.maxSnoozes));
    }
  // Set form only when opening a different alarm or after local data loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loaded, id]);

  const selectedProfile = useMemo(
    () => (form?.profileId ? store.profiles.find(profile => profile.id === form.profileId) ?? null : null),
    [form?.profileId, store.profiles],
  );

  const updateField = <K extends keyof AlarmInput>(field: K, value: AlarmInput[K]) => {
    setForm(current => {
      if (!current) return current;
      const detach = inheritedFields.has(String(field));
      return { ...current, [field]: value, ...(detach ? { profileId: null } : {}) };
    });
    if (inheritedFields.has(String(field))) setInheritedFields(new Set());
  };

  const openDatePicker = (date?: string) => {
    setDatePickerValue(date ? new Date(`${date.slice(0, 10)}T12:00:00`) : new Date());
    setDatePickerOpen(true);
  };

  const onDateChanged = (event: { type?: string }, date?: Date) => {
    setDatePickerOpen(false);
    if (event.type === 'dismissed' || !date || !form) return;
    const selected = dateKey(date);
    if (form.alarmType === 'once') updateField('specificDates', [selected]);
    else updateField('specificDates', [...new Set([...form.specificDates, selected])].sort());
  };

  const selectProfile = (profile: Profile | null) => {
    if (!form) return;
    const { form: nextForm, inherited } = applyProfile(form, profile);
    setForm(nextForm);
    setInheritedFields(inherited);
    setCustomMax(String(nextForm.maxSnoozes));
  };

  const applyPersonalTime = (key: PersonalTimeKey) => {
    if (!form) return;
    const hour = store.settings[`${key}Hour` as keyof typeof store.settings];
    const minute = store.settings[`${key}Minute` as keyof typeof store.settings];
    if (typeof hour === 'number' && typeof minute === 'number') {
      setForm({ ...form, hour, minute, personalTimeKey: key });
    } else {
      setForm({ ...form, personalTimeKey: key });
    }
  };

  const saveAlarm = () => {
    if (!form || saving) return;
    if (!form.name.trim()) {
      Alert.alert(text(language, 'Nome mancante', 'Name required'), text(language, 'Inserisci un nome per la sveglia.', 'Enter a name for this alarm.'));
      return;
    }
    if (form.alarmType === 'weekly' && form.weekDays.length === 0) {
      Alert.alert(text(language, 'Seleziona i giorni', 'Select days'), text(language, 'Scegli almeno un giorno della settimana.', 'Choose at least one weekday.'));
      return;
    }
    if (form.alarmType !== 'weekly' && form.specificDates.length === 0) {
      Alert.alert(text(language, 'Seleziona una data', 'Select a date'), text(language, 'Aggiungi almeno una data.', 'Add at least one date.'));
      return;
    }
    setSaving(true);
    if (id && editingAlarm) store.updateAlarm(id, form);
    else store.createAlarm(form);
    setSaving(false);
    router.back();
  };

  const weekdays = (translate(language, 'alarmCard.weekdays') as string[]) ?? WEEKDAY_FALLBACK;
  const dateLabel = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(language, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
  const appTitle = id ? text(language, 'Modifica sveglia', 'Edit alarm') : text(language, 'Nuova sveglia', 'New alarm');
  const inherited = (field: string) => Boolean(selectedProfile && inheritedFields.has(field));

  if (!store.loaded || !form) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground }}>{text(language, 'Caricamento…', 'Loading…')}</Text>
    </View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <Pressable onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 23 }}>{appTitle}</Text>
          <Pressable onPress={() => updateField('enabled', !form.enabled)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 34, borderRadius: 18, backgroundColor: form.enabled ? `${colors.primary}22` : colors.muted }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: form.enabled ? colors.primary : colors.mutedForeground }} />
            <Text style={{ color: form.enabled ? colors.primary : colors.mutedForeground, fontSize: 12, fontWeight: '700' }}>
              {form.enabled ? text(language, 'Attiva', 'On') : text(language, 'Spenta', 'Off')}
            </Text>
          </Pressable>
        </View>

        <Section title={text(language, 'Ora e fascia personale', 'Time and personal time')} icon="clock">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 }}>
            <TimeNumber value={form.hour} onChange={hour => updateField('hour', hour)} max={23} />
            <Text style={{ color: colors.primary, fontFamily: 'SpaceMono_400Regular', fontSize: 32 }}>:</Text>
            <TimeNumber value={form.minute} onChange={minute => updateField('minute', minute)} max={59} />
          </View>
          <Text style={sectionHint(colors.mutedForeground)}>
            {text(language, 'Puoi assegnare un colore e un nome alla fascia in Impostazioni.', 'Set a color and label for a personal time under Settings.')}
          </Text>
          <View style={chipWrap}>
            {PERSONAL_TIMES.map(item => {
              const hour = store.settings[`${item.key}Hour` as keyof typeof store.settings];
              const minute = store.settings[`${item.key}Minute` as keyof typeof store.settings];
              const color = store.settings[`${item.key}Color` as keyof typeof store.settings];
              const selected = form.personalTimeKey === item.key;
              return (
                <Pressable key={item.key} onPress={() => applyPersonalTime(item.key)} style={{
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selected ? (typeof color === 'string' ? color : colors.primary) : colors.border,
                  backgroundColor: selected ? `${typeof color === 'string' ? color : colors.primary}25` : colors.card,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  {typeof color === 'string' ? <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: color }} /> : null}
                  <Text style={{ color: selected ? (typeof color === 'string' ? color : colors.primary) : colors.mutedForeground, fontSize: 11, fontWeight: '600' }}>
                    {formatPersonalLabel(store.settings, item.key, language) ?? text(language, item.label, item.label)}
                  </Text>
                  {typeof hour === 'number' && typeof minute === 'number' ? (
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'SpaceMono_400Regular', fontSize: 9 }}>
                      {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={text(language, 'Nome e icona', 'Name and icon')} icon="tag">
          <TextInput
            value={form.name}
            onChangeText={name => updateField('name', name)}
            placeholder={text(language, 'es. Sveglia lavoro', 'e.g. Work alarm')}
            placeholderTextColor={colors.mutedForeground}
            maxLength={48}
            style={{ height: 47, borderRadius: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, fontSize: 15 }}
          />
          <Text style={sectionLabel(colors.mutedForeground)}>{text(language, 'Scegli un’icona', 'Choose an icon')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ALARM_ICON_OPTIONS.map(icon => {
              const selected = form.iconName === icon.name;
              return (
                <Pressable key={icon.name} accessibilityLabel={icon.label} onPress={() => updateField('iconName', icon.name)} style={{
                  width: 39,
                  height: 39,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? `${colors.primary}28` : colors.background,
                }}>
                  <AlarmIcon name={icon.name} size={18} color={selected ? colors.primary : colors.mutedForeground} />
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={text(language, 'Profilo', 'Profile')} icon="layers">
          <View style={chipWrap}>
            <ChoiceChip label={text(language, 'Nessuno', 'None')} active={!form.profileId} onPress={() => selectProfile(null)} />
            {store.profiles.map(profile => (
              <ChoiceChip key={profile.id} label={`${profile.name}${profile.isDefault ? ' ★' : ''}`} active={form.profileId === profile.id} onPress={() => selectProfile(profile)} />
            ))}
          </View>
          {selectedProfile ? (
            <View style={{ backgroundColor: `${colors.primary}12`, padding: 10, borderRadius: 14 }}>
              <Text style={{ color: colors.primary, fontSize: 12 }}>
                {text(language, `Impostazioni ereditate da “${selectedProfile.name}” sono evidenziate. Modificandole il collegamento verrà rimosso.`, `Settings inherited from “${selectedProfile.name}” are highlighted. Changing one detaches this alarm from the profile.`)}
              </Text>
            </View>
          ) : store.profiles.length === 0 ? (
            <Text style={sectionHint(colors.mutedForeground)}>{text(language, 'Non hai ancora creato profili.', 'You have not created any profiles yet.')}</Text>
          ) : null}
        </Section>

        <Section title={text(language, 'Ripetizione', 'Repeat')} icon="repeat">
          <View style={chipWrap}>
            <ChoiceChip label={text(language, 'Una volta', 'Once')} active={form.alarmType === 'once'} onPress={() => updateField('alarmType', 'once')} />
            <ChoiceChip label={text(language, 'Settimanale', 'Weekly')} active={form.alarmType === 'weekly'} onPress={() => updateField('alarmType', 'weekly')} />
            <ChoiceChip label={text(language, 'Date specifiche', 'Specific dates')} active={form.alarmType === 'specific_dates'} onPress={() => updateField('alarmType', 'specific_dates')} />
          </View>
          {form.alarmType === 'weekly' ? (
            <View style={{ gap: 10 }}>
              <View style={chipWrap}>
                {(weekdays ?? WEEKDAY_FALLBACK).map((day, index) => {
                  const selected = form.weekDays.includes(index);
                  return <ChoiceChip key={`${day}-${index}`} label={day} active={selected} onPress={() => updateField('weekDays', selected ? form.weekDays.filter(item => item !== index) : [...form.weekDays, index].sort())} />;
                })}
              </View>
              <Pressable onPress={() => updateField('weekDays', form.weekDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])} style={{ alignSelf: 'flex-start', paddingVertical: 3 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {form.weekDays.length === 7 ? text(language, 'Deseleziona tutti', 'Deselect all') : text(language, 'Seleziona tutti', 'Select all')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 9 }}>
              {form.specificDates.map(date => (
                <View key={date} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38, paddingHorizontal: 11, backgroundColor: colors.background, borderRadius: 13 }}>
                  <Text style={{ color: colors.foreground }}>{dateLabel(date)}</Text>
                  {form.alarmType === 'specific_dates' ? (
                    <Pressable onPress={() => updateField('specificDates', form.specificDates.filter(item => item !== date))} hitSlop={8}>
                      <Feather name="x-circle" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              <Pressable onPress={() => openDatePicker(form.specificDates[0])} style={{ minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: `${colors.primary}65`, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {form.alarmType === 'once' ? text(language, 'Scegli data', 'Choose date') : text(language, 'Aggiungi data', 'Add date')}
                </Text>
              </Pressable>
            </View>
          )}
          {form.alarmType === 'once' ? (
            <ToggleLine
              title={text(language, 'Elimina dopo l’attivazione', 'Delete after ringing')}
              subtitle={text(language, 'La sveglia viene rimossa quando la spegni.', 'Remove this alarm when you dismiss it.')}
              value={form.autoDelete}
              inherited={inherited('autoDelete')}
              onChange={value => updateField('autoDelete', value)}
            />
          ) : null}
        </Section>

        <Section title={text(language, 'Suono e volume', 'Sound and volume')} icon="volume-2">
          {inherited('ringtone') ? <OriginBadge profile={selectedProfile?.name ?? ''} /> : null}
          <View style={{ gap: 8 }}>
            {RINGTONES.map(ringtone => (
              <Pressable key={ringtone.key} onPress={() => updateField('ringtone', ringtone.key)} style={{ minHeight: 45, borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: form.ringtone === ringtone.key ? `${colors.primary}16` : colors.background, borderWidth: 1, borderColor: form.ringtone === ringtone.key ? colors.primary : colors.border }}>
                <View style={{ width: 25, height: 25, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: form.ringtone === ringtone.key ? `${colors.primary}27` : colors.muted }}>
                  <Feather name="music" size={13} color={form.ringtone === ringtone.key ? colors.primary : colors.mutedForeground} />
                </View>
                <Text style={{ flex: 1, color: form.ringtone === ringtone.key ? colors.primary : colors.foreground, fontWeight: form.ringtone === ringtone.key ? '700' : '500' }}>
                  {text(language, ringtone.name, ringtone.key === 'classic' ? 'Classic alarm' : ringtone.key)}
                </Text>
                {form.ringtone === ringtone.key ? <Feather name="check-circle" size={17} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 }}>
            <AudioPreview ringtoneKey={form.ringtone} />
            <View style={{ flex: 1, paddingLeft: 4 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>
                {text(language, 'Volume', 'Volume')} · {form.volume}%
              </Text>
              {inherited('volume') ? <OriginBadge profile={selectedProfile?.name ?? ''} compact /> : null}
            </View>
          </View>
          <Slider
            value={form.volume}
            minimumValue={0}
            maximumValue={100}
            step={1}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
            onValueChange={value => updateField('volume', Math.round(value))}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={sectionHint(colors.mutedForeground)}>0%</Text>
            <Text style={sectionHint(colors.mutedForeground)}>100%</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={sectionLabel(colors.mutedForeground)}>{text(language, 'Aumento graduale', 'Gradual volume')}</Text>
            {inherited('gradualVolume') ? <OriginBadge profile={selectedProfile?.name ?? ''} compact /> : null}
            <View style={chipWrap}>
              {GRADUAL_OPTIONS.map(value => (
                <ChoiceChip key={value} label={value === 0 ? text(language, 'Disattivato', 'Off') : `${value} sec`} active={form.gradualVolume === value} onPress={() => updateField('gradualVolume', value)} />
              ))}
            </View>
          </View>
        </Section>

        <Section title={text(language, 'Vibrazione e posticipo', 'Vibration and snooze')} icon="smartphone">
          <View style={{ gap: 6 }}>
            <Text style={sectionLabel(colors.mutedForeground)}>{text(language, 'Vibrazione', 'Vibration')}</Text>
            {inherited('vibration') ? <OriginBadge profile={selectedProfile?.name ?? ''} compact /> : null}
            <View style={chipWrap}>
              <ChoiceChip label={text(language, 'Spenta', 'Off')} active={form.vibration === 'off'} onPress={() => updateField('vibration', 'off')} />
              <ChoiceChip label={text(language, 'Suono + vibrazione', 'Sound + vibration')} active={form.vibration === 'on'} onPress={() => updateField('vibration', 'on')} />
              <ChoiceChip label={text(language, 'Solo vibrazione', 'Vibration only')} active={form.vibration === 'only'} onPress={() => updateField('vibration', 'only')} />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={sectionLabel(colors.mutedForeground)}>{text(language, 'Posticipo automatico', 'Auto-snooze')}</Text>
            {inherited('autoSnooze') ? <OriginBadge profile={selectedProfile?.name ?? ''} compact /> : null}
            <View style={chipWrap}>
              {SNOOZE_OPTIONS.map(item => (
                <ChoiceChip key={item.value} label={item.value === 0 ? text(language, 'Disattivato', 'Off') : item.label} active={form.autoSnooze === item.value} onPress={() => updateField('autoSnooze', item.value)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={sectionLabel(colors.mutedForeground)}>{text(language, 'Numero massimo di posticipi', 'Maximum snoozes')}</Text>
            {inherited('maxSnoozes') ? <OriginBadge profile={selectedProfile?.name ?? ''} compact /> : null}
            <Text style={sectionHint(colors.mutedForeground)}>{text(language, '0 = illimitati · da 1 a 100', '0 = unlimited · choose 1 to 100')}</Text>
            <TextInput
              keyboardType="number-pad"
              value={customMax}
              onChangeText={value => {
                const digits = value.replace(/\D/g, '').slice(0, 3);
                setCustomMax(digits);
                const parsed = Math.min(100, Math.max(0, Number(digits || 0)));
                updateField('maxSnoozes', parsed);
              }}
              style={{ height: 42, width: 100, borderRadius: 13, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }}
            />
          </View>
        </Section>

        <Pressable onPress={saveAlarm} disabled={saving} style={({ pressed }) => ({ minHeight: 52, marginTop: 3, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed || saving ? 0.76 : 1, flexDirection: 'row', gap: 8 })}>
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>
            {id ? text(language, 'Salva modifiche', 'Save changes') : text(language, 'Crea sveglia', 'Create alarm')}
          </Text>
        </Pressable>
      </ScrollView>

      {datePickerOpen ? (
        <DateTimePicker
          value={datePickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
          minimumDate={new Date()}
          onChange={onDateChanged}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function formatPersonalLabel(settings: Record<string, unknown>, key: string, language: string) {
  const value = settings[`${key}Label`];
  return typeof value === 'string' && value.trim()
    ? value
    : translate(language, `settings.${key}`) as string;
}

function TimeNumber({ value, onChange, max }: { value: number; onChange: (value: number) => void; max: number }) {
  const colors = useColors();
  const step = (delta: number) => onChange((value + delta + max + 1) % (max + 1));
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <Pressable onPress={() => step(1)} style={{ width: 44, alignItems: 'center', paddingVertical: 2 }}>
        <Feather name="chevron-up" size={19} color={colors.mutedForeground} />
      </Pressable>
      <TextInput
        value={String(value).padStart(2, '0')}
        onChangeText={textValue => {
          if (!/^\d{1,2}$/.test(textValue)) return;
          onChange(Math.min(max, Number(textValue)));
        }}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        style={{ width: 66, height: 58, textAlign: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.primary, fontFamily: 'SpaceMono_400Regular', fontSize: 29 }}
      />
      <Pressable onPress={() => step(-1)} style={{ width: 44, alignItems: 'center', paddingVertical: 2 }}>
        <Feather name="chevron-down" size={19} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function Section({ title, icon, children }: React.PropsWithChildren<{ title: string; icon: keyof typeof Feather.glyphMap }>) {
  const colors = useColors();
  return (
    <View style={{ padding: 14, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name={icon} size={16} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 34, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}20` : colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontSize: 11, fontWeight: active ? '800' : '600' }}>{label}</Text>
    </Pressable>
  );
}

function ToggleLine({
  title,
  subtitle,
  value,
  inherited,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  inherited: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: inherited ? colors.primary : colors.foreground, fontWeight: '700', fontSize: 13 }}>{title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{subtitle}</Text>
        {inherited ? <OriginBadge profile="" compact /> : null}
      </View>
      <View style={{ width: 42, height: 24, borderRadius: 13, backgroundColor: value ? colors.primary : colors.muted, borderWidth: 1, borderColor: value ? colors.primary : colors.border, justifyContent: 'center' }}>
        <View style={{ width: 18, height: 18, borderRadius: 10, backgroundColor: colors.foreground, marginHorizontal: 2, alignSelf: value ? 'flex-end' : 'flex-start' }} />
      </View>
    </Pressable>
  );
}

function OriginBadge({ profile, compact = false }: { profile: string; compact?: boolean }) {
  const colors = useColors();
  const language = useAppLanguage();
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: compact ? 2 : 4, borderRadius: 9, backgroundColor: `${colors.primary}15` }}>
      <Feather name="layers" size={10} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '800' }}>
        {profile ? text(language, `DAL PROFILO ${profile.toLocaleUpperCase(language)}`, `FROM PROFILE ${profile.toLocaleUpperCase(language)}`) : text(language, 'DAL PROFILO', 'FROM PROFILE')}
      </Text>
    </View>
  );
}

const chipWrap = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 7 };
const sectionLabel = (color: string) => ({ color, fontSize: 12, fontWeight: '700' as const });
const sectionHint = (color: string) => ({ color, fontSize: 11, lineHeight: 16 });
