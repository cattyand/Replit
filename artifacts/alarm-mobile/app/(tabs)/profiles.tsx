import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalData } from '@/lib/local-data';
import type { Profile, ProfileInput, VibrationMode } from '@/lib/alarm-types';
import { RINGTONES } from '@/lib/ringtones';
import { text, useAppLanguage } from '@/lib/strings';

const EMPTY_PROFILE: ProfileInput = {
  name: '',
  isDefault: false,
  autoDelete: null,
  ringtone: null,
  volume: null,
  gradualVolume: null,
  vibration: null,
  autoSnooze: null,
  maxSnoozes: null,
};

const GRADUAL_OPTIONS = [0, 5, 10, 15, 30, 60];
const AUTO_SNOOZE_OPTIONS = [0, 10, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800];

export default function ProfilesScreen() {
  const colors = useColors();
  const language = useAppLanguage();
  const store = useLocalData();
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE);
  const [selectedAlarmIds, setSelectedAlarmIds] = useState<number[]>([]);
  const editing = editingId !== null && editingId !== 'new';
  const linkedAlarms = useMemo(
    () => editing && typeof editingId === 'number' ? store.alarms.filter(alarm => alarm.profileId === editingId) : [],
    [editing, editingId, store.alarms],
  );

  const startNew = () => {
    setEditingId('new');
    setForm({ ...EMPTY_PROFILE });
    setSelectedAlarmIds([]);
  };

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      isDefault: profile.isDefault,
      autoDelete: profile.autoDelete,
      ringtone: profile.ringtone,
      volume: profile.volume,
      gradualVolume: profile.gradualVolume,
      vibration: profile.vibration,
      autoSnooze: profile.autoSnooze,
      maxSnoozes: profile.maxSnoozes,
    });
    setSelectedAlarmIds(store.alarms.filter(alarm => alarm.profileId === profile.id).map(alarm => alarm.id));
  };

  const closeEditor = () => {
    setEditingId(null);
    setForm({ ...EMPTY_PROFILE });
  };

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const saveProfile = (applyToLinked: boolean) => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert(text(language, 'Nome mancante', 'Name required'), text(language, 'Inserisci un nome per il profilo.', 'Enter a profile name.'));
      return;
    }
    let saved: Profile;
    if (typeof editingId === 'number') {
      store.updateProfile(editingId, { ...form, name });
      saved = { ...store.profiles.find(profile => profile.id === editingId)!, ...form, name, updatedAt: new Date().toISOString() };
    } else {
      saved = store.createProfile({ ...form, name });
    }
    if (applyToLinked) {
      for (const alarmId of selectedAlarmIds) {
        const alarm = store.alarms.find(item => item.id === alarmId);
        if (!alarm) continue;
        store.updateAlarm(alarmId, {
          profileId: saved.id,
          ...(form.autoDelete !== null ? { autoDelete: form.autoDelete } : {}),
          ...(form.ringtone !== null ? { ringtone: form.ringtone } : {}),
          ...(form.volume !== null ? { volume: form.volume } : {}),
          ...(form.gradualVolume !== null ? { gradualVolume: form.gradualVolume } : {}),
          ...(form.vibration !== null ? { vibration: form.vibration } : {}),
          ...(form.autoSnooze !== null ? { autoSnooze: form.autoSnooze } : {}),
          ...(form.maxSnoozes !== null ? { maxSnoozes: form.maxSnoozes } : {}),
        });
      }
    }
    closeEditor();
  };

  const onSave = () => {
    if (linkedAlarms.length > 0) {
      Alert.alert(
        text(language, 'Aggiornare le sveglie collegate?', 'Update linked alarms?'),
        text(language, 'Puoi applicare il profilo alle sveglie selezionate oppure salvare solo il profilo.', 'Apply this profile to selected alarms, or save the profile only.'),
        [
          { text: text(language, 'Solo profilo', 'Profile only'), onPress: () => saveProfile(false) },
          { text: text(language, 'Applica alle selezionate', 'Apply selected'), onPress: () => saveProfile(true) },
          { text: text(language, 'Annulla', 'Cancel'), style: 'cancel' },
        ],
      );
    } else {
      saveProfile(false);
    }
  };

  const confirmDelete = (profile: Profile) => {
    Alert.alert(
      text(language, 'Eliminare il profilo?', 'Delete profile?'),
      text(language, `Le sveglie collegate a “${profile.name}” manterranno le impostazioni ma perderanno il collegamento.`, `Alarms linked to “${profile.name}” keep their current settings but will be unlinked.`),
      [
        { text: text(language, 'Annulla', 'Cancel'), style: 'cancel' },
        { text: text(language, 'Elimina', 'Delete'), style: 'destructive', onPress: () => store.deleteProfile(profile.id) },
      ],
    );
  };

  if (!store.loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground }}>{text(language, 'Caricamento…', 'Loading…')}</Text>
    </View>;
  }

  if (editingId !== null) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120, gap: 13 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={closeEditor} style={{ width: 38, height: 38, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24 }}>
            {editing ? text(language, 'Modifica profilo', 'Edit profile') : text(language, 'Nuovo profilo', 'New profile')}
          </Text>
        </View>

        <Section title={text(language, 'Profilo', 'Profile')} icon="layers">
          <TextInput
            value={form.name}
            onChangeText={name => update('name', name)}
            placeholder={text(language, 'Nome profilo', 'Profile name')}
            placeholderTextColor={colors.mutedForeground}
            maxLength={40}
            style={inputStyle(colors)}
          />
          <Pressable onPress={() => update('isDefault', !form.isDefault)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
            <View style={{ width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: form.isDefault ? colors.primary : colors.border, backgroundColor: form.isDefault ? colors.primary : colors.background }}>
              {form.isDefault ? <Feather name="check" size={14} color={colors.primaryForeground} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{text(language, 'Profilo predefinito', 'Default profile')}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{text(language, 'Viene applicato automaticamente alle nuove sveglie.', 'Applied automatically to new alarms.')}</Text>
            </View>
          </Pressable>
        </Section>

        <Section title={text(language, 'Impostazioni ereditabili', 'Inheritable settings')} icon="sliders">
          <OptionalChoices
            title={text(language, 'Eliminazione automatica', 'Auto-delete')}
            value={form.autoDelete}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              { label: text(language, 'Attiva', 'On'), value: true },
              { label: text(language, 'Disattiva', 'Off'), value: false },
            ]}
            onChange={value => update('autoDelete', value)}
          />
          <OptionalChoices
            title={text(language, 'Suoneria', 'Ringtone')}
            value={form.ringtone}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              ...RINGTONES.map(ringtone => ({ label: ringtone.name, value: ringtone.key })),
            ]}
            onChange={value => update('ringtone', value)}
          />
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{text(language, 'Volume', 'Volume')}</Text>
              <Pressable onPress={() => update('volume', null)}><Text style={{ color: colors.primary, fontSize: 11 }}>{text(language, 'Sistema', 'Default')}</Text></Pressable>
            </View>
            <Slider
              value={form.volume ?? 70}
              minimumValue={0}
              maximumValue={100}
              step={1}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              onValueChange={value => update('volume', Math.round(value))}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{form.volume === null ? text(language, 'Usa il volume di sistema', 'Use system volume') : `${form.volume}%`}</Text>
          </View>
          <OptionalChoices
            title={text(language, 'Aumento graduale', 'Gradual volume')}
            value={form.gradualVolume}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              ...GRADUAL_OPTIONS.map(value => ({ label: value === 0 ? text(language, 'Off', 'Off') : `${value} sec`, value })),
            ]}
            onChange={value => update('gradualVolume', value)}
          />
          <OptionalChoices
            title={text(language, 'Vibrazione', 'Vibration')}
            value={form.vibration}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              { label: text(language, 'Spenta', 'Off'), value: 'off' as VibrationMode },
              { label: text(language, 'Attiva', 'On'), value: 'on' as VibrationMode },
              { label: text(language, 'Solo vibrazione', 'Vibration only'), value: 'only' as VibrationMode },
            ]}
            onChange={value => update('vibration', value)}
          />
          <OptionalChoices
            title={text(language, 'Posticipo automatico', 'Auto-snooze')}
            value={form.autoSnooze}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              ...AUTO_SNOOZE_OPTIONS.map(value => ({ label: durationLabel(value, language), value })),
            ]}
            onChange={value => update('autoSnooze', value)}
          />
          <OptionalChoices
            title={text(language, 'Numero massimo di posticipi', 'Maximum snoozes')}
            value={form.maxSnoozes}
            options={[
              { label: text(language, 'Sistema', 'Default'), value: null },
              { label: text(language, 'Illimitati', 'Unlimited'), value: 0 },
              ...[1, 3, 5, 10].map(value => ({ label: String(value), value })),
            ]}
            onChange={value => update('maxSnoozes', value)}
          />
          <View style={{ gap: 5 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{text(language, 'Puoi impostare un valore da 0 a 100 (0 = illimitati).', 'Set a value from 0 to 100 (0 = unlimited).')}</Text>
            <TextInput
              keyboardType="number-pad"
              value={form.maxSnoozes === null ? '' : String(form.maxSnoozes)}
              placeholder={text(language, 'Sistema', 'Default')}
              placeholderTextColor={colors.mutedForeground}
              onChangeText={value => update('maxSnoozes', value === '' ? null : Math.min(100, Number(value.replace(/\D/g, '').slice(0, 3)) || 0))}
              style={[inputStyle(colors), { width: 100, height: 40 }]}
            />
          </View>
        </Section>

        {editing && linkedAlarms.length > 0 ? (
          <Section title={text(language, 'Sveglie collegate', 'Linked alarms')} icon="clock">
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
              {text(language, 'Seleziona le sveglie a cui applicare le impostazioni aggiornate quando salvi.', 'Select which alarms receive the updated settings when you save.')}
            </Text>
            {linkedAlarms.map(alarm => {
              const selected = selectedAlarmIds.includes(alarm.id);
              return (
                <Pressable key={alarm.id} onPress={() => setSelectedAlarmIds(current => selected ? current.filter(item => item !== alarm.id) : [...current, alarm.id])} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background, alignItems: 'center', justifyContent: 'center' }}>
                    {selected ? <Feather name="check" size={13} color={colors.primaryForeground} /> : null}
                  </View>
                  <Text style={{ flex: 1, color: colors.foreground }}>{alarm.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'SpaceMono_400Regular', fontSize: 11 }}>{String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}</Text>
                </Pressable>
              );
            })}
          </Section>
        ) : null}

        <Pressable onPress={onSave} style={{ minHeight: 51, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={{ color: colors.primaryForeground, fontFamily: 'PlusJakartaSans_700Bold' }}>{text(language, 'Salva profilo', 'Save profile')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 126, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
        <View>
          <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32 }}>{text(language, 'Profili', 'Profiles')}</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>{text(language, 'Impostazioni condivise per le tue sveglie.', 'Shared settings for your alarms.')}</Text>
        </View>
        <Pressable onPress={startNew} style={{ width: 43, height: 43, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>
      {store.profiles.length === 0 ? (
        <View style={{ minHeight: 185, alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 25, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, gap: 10 }}>
          <Feather name="layers" size={31} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>{text(language, 'Nessun profilo. Creane uno per condividere suoneria, volume e posticipo tra le sveglie.', 'No profiles yet. Create one to share ringtone, volume, and snooze settings across alarms.')}</Text>
        </View>
      ) : store.profiles.map(profile => {
        const linked = store.alarms.filter(alarm => alarm.profileId === profile.id);
        return (
          <View key={profile.id} style={{ borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: profile.isDefault ? `${colors.primary}85` : colors.border, padding: 15, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 39, height: 39, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="layers" size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17 }}>{profile.name}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                  {text(language, `${linked.length} sveglie collegate`, `${linked.length} linked alarms`)}
                  {profile.isDefault ? ` · ${text(language, 'Predefinito', 'Default')}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => startEdit(profile)} hitSlop={7} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="edit-2" size={16} color={colors.mutedForeground} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(profile)} hitSlop={7} style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <SummaryChip label={profile.ringtone ? RINGTONES.find(item => item.key === profile.ringtone)?.name ?? profile.ringtone : text(language, 'Suoneria sistema', 'System ringtone')} />
              <SummaryChip label={profile.volume === null ? text(language, 'Volume sistema', 'System volume') : `${profile.volume}%`} />
              <SummaryChip label={profile.vibration === null ? text(language, 'Vibrazione sistema', 'System vibration') : vibrationLabel(profile.vibration, language)} />
              <SummaryChip label={profile.maxSnoozes === null ? text(language, 'Posticipi sistema', 'System snoozes') : profile.maxSnoozes === 0 ? text(language, 'Posticipi illimitati', 'Unlimited snoozes') : `${profile.maxSnoozes} ${text(language, 'posticipi', 'snoozes')}`} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Section({ title, icon, children }: React.PropsWithChildren<{ title: string; icon: keyof typeof Feather.glyphMap }>) {
  const colors = useColors();
  return (
    <View style={{ padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Feather name={icon} size={16} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function OptionalChoices<T extends string | number | boolean | null>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {options.map((option, index) => {
          const active = option.value === value;
          return (
            <Pressable key={`${String(option.value)}-${index}`} onPress={() => onChange(option.value)} style={{ minHeight: 31, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}20` : colors.background, justifyContent: 'center' }}>
              <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontSize: 10, fontWeight: active ? '800' : '500' }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SummaryChip({ label }: { label: string }) {
  const colors = useColors();
  return <Text style={{ color: colors.mutedForeground, fontSize: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.muted, overflow: 'hidden' }}>{label}</Text>;
}

function durationLabel(seconds: number, language: string) {
  if (seconds === 0) return text(language, 'Off', 'Off');
  if (seconds < 60) return `${seconds} sec`;
  if (seconds < 3600) return `${seconds / 60} min`;
  return `${seconds / 3600} h`;
}

function vibrationLabel(mode: VibrationMode, language: string) {
  if (mode === 'off') return text(language, 'Spenta', 'Off');
  if (mode === 'only') return text(language, 'Solo vibrazione', 'Vibration only');
  return text(language, 'Attiva', 'On');
}

const inputStyle = (colors: ReturnType<typeof useColors>) => ({
  height: 46,
  paddingHorizontal: 12,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.background,
  color: colors.foreground,
});
