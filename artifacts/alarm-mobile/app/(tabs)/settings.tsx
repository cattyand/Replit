import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAlarmRuntime } from '@/lib/alarm-runtime';
import { useLocalData } from '@/lib/local-data';
import type { PersonalTimeKey, Settings, SortOrder } from '@/lib/alarm-types';
import { text, translate, useAppLanguage, type SupportedLanguage } from '@/lib/strings';

const LANGUAGES: Array<{ code: SupportedLanguage; label: string; native: string }> = [
  { code: 'it', label: 'Italiano', native: 'Italiano' },
  { code: 'en', label: 'Inglese', native: 'English' },
  { code: 'fr', label: 'Francese', native: 'Français' },
  { code: 'de', label: 'Tedesco', native: 'Deutsch' },
  { code: 'es', label: 'Spagnolo', native: 'Español' },
  { code: 'pt', label: 'Portoghese', native: 'Português' },
  { code: 'zh', label: 'Cinese', native: '中文' },
  { code: 'ko', label: 'Coreano', native: '한국어' },
];

const PERSONAL_TIMES: Array<{ key: PersonalTimeKey; translationKey: string; fallback: string }> = [
  { key: 'wakeup', translationKey: 'settings.wakeup', fallback: 'Sveglia' },
  { key: 'workStart', translationKey: 'settings.workStart', fallback: 'Inizio lavoro' },
  { key: 'lunch', translationKey: 'settings.lunch', fallback: 'Pranzo' },
  { key: 'workEnd', translationKey: 'settings.workEnd', fallback: 'Fine lavoro' },
  { key: 'dinner', translationKey: 'settings.dinner', fallback: 'Cena' },
  { key: 'sleep', translationKey: 'settings.sleep', fallback: 'Sonno' },
];

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#fb923c', '#f472b6', '#a78bfa', '#22d3ee', '#f87171', '#a3e635'];
const SORT_OPTIONS: Array<{ value: SortOrder; labelIt: string; labelEn: string }> = [
  { value: 'activation', labelIt: 'Prossima attivazione', labelEn: 'Next activation' },
  { value: 'name', labelIt: 'Nome', labelEn: 'Name' },
  { value: 'personalTimes', labelIt: 'Orari personali', labelEn: 'Personal times' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const language = useAppLanguage();
  const store = useLocalData();
  const runtime = useAlarmRuntime();
  const [showBackups, setShowBackups] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  const saveLanguage = (code: SupportedLanguage | null) => store.updateSettings({ languageCode: code });

  const toggleNotifications = async () => {
    if (runtime.notificationsEnabled) {
      await runtime.disableNotifications();
      return;
    }
    const granted = await runtime.enableNotifications();
    if (!granted) {
      Alert.alert(
        text(language, 'Notifiche non abilitate', 'Notifications not enabled'),
        text(language, 'Concedi all’app il permesso di inviare notifiche nelle impostazioni Android per programmare le sveglie.', 'Allow notifications for this app in Android settings to schedule alarms.'),
      );
    }
  };

  const restoreBackup = (backupId: string, timestamp: string) => {
    Alert.alert(
      text(language, 'Ripristinare il backup?', 'Restore backup?'),
      text(language, `I dati attuali verranno sostituiti con il backup del ${timestamp}.`, `Current data will be replaced with the backup from ${timestamp}.`),
      [
        { text: text(language, 'Annulla', 'Cancel'), style: 'cancel' },
        { text: text(language, 'Ripristina', 'Restore'), onPress: () => store.restoreBackup(backupId) },
      ],
    );
  };

  const deleteBackup = (backupId: string) => {
    Alert.alert(
      text(language, 'Eliminare il backup?', 'Delete backup?'),
      text(language, 'Questa copia locale verrà rimossa dal telefono.', 'This local snapshot will be removed from the phone.'),
      [
        { text: text(language, 'Annulla', 'Cancel'), style: 'cancel' },
        { text: text(language, 'Elimina', 'Delete'), style: 'destructive', onPress: () => store.deleteBackup(backupId) },
      ],
    );
  };

  const createBackup = () => {
    store.createBackup(false);
    Alert.alert(text(language, 'Backup creato', 'Backup created'), text(language, 'La copia è stata salvata localmente su questo telefono.', 'The snapshot was saved locally on this phone.'));
  };

  const backupTimestamp = (value: string) => new Date(value).toLocaleString(language, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  if (!store.loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground }}>{text(language, 'Caricamento…', 'Loading…')}</Text>
    </View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 126, gap: 14 }}>
      <View style={{ paddingHorizontal: 4, marginBottom: 2 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32 }}>{text(language, 'Impostazioni', 'Settings')}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>{text(language, 'Configurazione locale dell’app.', 'Local app configuration.')}</Text>
      </View>

      <Section title={text(language, 'Lingua', 'Language')} icon="globe">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ChoiceChip
            label={text(language, 'Automatico', 'Automatic')}
            active={store.settings.languageCode === null}
            onPress={() => saveLanguage(null)}
          />
          {LANGUAGES.map(item => (
            <ChoiceChip
              key={item.code}
              label={item.native}
              active={store.settings.languageCode === item.code}
              onPress={() => saveLanguage(item.code)}
            />
          ))}
        </View>
      </Section>

      <Section title={text(language, 'Ordinamento sveglie', 'Alarm sorting')} icon="shuffle">
        <View style={{ gap: 7 }}>
          {SORT_OPTIONS.map(option => (
            <Pressable key={option.value} onPress={() => store.updateSettings({ sortOrder: option.value })} style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 13, backgroundColor: store.settings.sortOrder === option.value ? `${colors.primary}14` : colors.background }}>
              <Text style={{ color: store.settings.sortOrder === option.value ? colors.primary : colors.foreground, fontSize: 13, fontWeight: store.settings.sortOrder === option.value ? '700' : '500' }}>
                {translate(language, `settings.sortOrder${option.value === 'activation' ? 'Activation' : option.value === 'personalTimes' ? 'PersonalTimes' : 'Name'}`) as string ?? (language === 'it' ? option.labelIt : option.labelEn)}
              </Text>
              {store.settings.sortOrder === option.value ? <Feather name="check-circle" size={17} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={text(language, 'Orari personali', 'Personal times')} icon="clock">
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          {text(language, 'Crea sei fasce personali con nome, ora e colore. Puoi assegnarle alle sveglie.', 'Set a label, time, and color for six personal time slots, then assign them to alarms.')}
        </Text>
        {PERSONAL_TIMES.map(item => (
          <PersonalTimeRow
            key={item.key}
            item={item}
            language={language}
            settings={store.settings}
            onChange={changes => store.updateSettings(changes)}
          />
        ))}
      </Section>

      <Section title={text(language, 'Notifiche sveglie', 'Alarm notifications')} icon="bell">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '700' }}>{text(language, 'Programmazione sul telefono', 'Schedule on this phone')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
              {runtime.permissionGranted
                ? text(language, 'Le sveglie vengono programmate localmente, senza backend.', 'Alarms are scheduled locally without a backend.')
                : text(language, 'Il permesso Android viene richiesto solo quando attivi questa opzione.', 'Android permission is requested only when you enable this option.')}
            </Text>
          </View>
          <SwitchToggle value={runtime.notificationsEnabled} onPress={() => void toggleNotifications()} disabled={runtime.enabling} />
        </View>
        {runtime.notificationsEnabled ? (
          <Pressable onPress={() => void runtime.refreshAlarms()} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5 }}>
            <Feather name="refresh-cw" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{text(language, 'Aggiorna sveglie programmate', 'Refresh scheduled alarms')}</Text>
          </Pressable>
        ) : null}
      </Section>

      <Section title={text(language, 'Backup locali', 'Local backups')} icon="hard-drive">
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          {text(language, 'I backup restano nella memoria dell’app su questo telefono. Non vengono inviati a un server.', 'Backups stay in this app’s storage on this phone. They are not uploaded to a server.')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{text(language, 'Backup automatico', 'Automatic backup')}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>{text(language, 'Crea una copia locale quando apri l’app dopo l’orario scelto.', 'Create a local snapshot when you open the app after the selected time.')}</Text>
          </View>
          <SwitchToggle value={store.settings.autoBackup} onPress={() => store.updateSettings({ autoBackup: !store.settings.autoBackup })} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{text(language, 'Orario', 'Time')}</Text>
          <ClockInput
            hour={store.settings.backupHour}
            minute={store.settings.backupMinute}
            onChange={(hour, minute) => store.updateSettings({ backupHour: hour, backupMinute: minute })}
          />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginLeft: 'auto' }}>{text(language, 'Conserva', 'Keep')}</Text>
          <TextInput
            keyboardType="number-pad"
            value={String(store.settings.backupRetentionDays)}
            onChangeText={value => store.updateSettings({ backupRetentionDays: Math.min(365, Math.max(1, Number(value.replace(/\D/g, '').slice(0, 3)) || 1)) })}
            style={{ width: 52, height: 35, textAlign: 'center', borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }}
          />
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{text(language, 'giorni', 'days')}</Text>
        </View>
        <Pressable onPress={createBackup} style={{ minHeight: 42, borderRadius: 14, backgroundColor: `${colors.primary}1b`, borderWidth: 1, borderColor: `${colors.primary}45`, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }}>
          <Feather name="save" size={15} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>{text(language, 'Crea backup adesso', 'Create backup now')}</Text>
        </Pressable>
        <Pressable onPress={() => setShowBackups(value => !value)} style={{ minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700' }}>
            {text(language, 'Backup salvati', 'Saved backups')} · {store.backups.length}
          </Text>
          <Feather name={showBackups ? 'chevron-up' : 'chevron-down'} size={17} color={colors.mutedForeground} />
        </Pressable>
        {showBackups ? store.backups.slice().reverse().map(backup => (
          <View key={backup.id} style={{ minHeight: 49, padding: 9, borderRadius: 13, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Feather name={backup.automatic ? 'refresh-cw' : 'save'} size={15} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '700' }}>{backupTimestamp(backup.createdAt)}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>{text(language, `${backup.alarmCount} sveglie`, `${backup.alarmCount} alarms`)}{backup.automatic ? ` · ${text(language, 'automatico', 'automatic')}` : ''}</Text>
            </View>
            <Pressable onPress={() => restoreBackup(backup.id, backupTimestamp(backup.createdAt))} hitSlop={7} style={{ padding: 6 }}>
              <Feather name="rotate-ccw" size={15} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => deleteBackup(backup.id)} hitSlop={7} style={{ padding: 6 }}>
              <Feather name="trash-2" size={15} color={colors.destructive} />
            </Pressable>
          </View>
        )) : null}
      </Section>

      <Section title={text(language, 'Aiuto', 'Help')} icon="help-circle">
        <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>
          {text(language, 'L’app conserva sveglie e profili sul telefono. Android può applicare restrizioni energetiche ai promemoria: consenti notifiche e attività in background per riceverli puntualmente.', 'Alarms and profiles are stored on this phone. Android may restrict reminders to save battery: allow notifications and background activity for reliable delivery.')}
        </Text>
        <Pressable onPress={() => setShowHelp(!showHelp)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>{text(language, 'Dettagli e consigli', 'Details and tips')}</Text>
          <Feather name={showHelp ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </Pressable>
        {showHelp ? (
          <View style={{ gap: 10, paddingTop: 2 }}>
            <HelpItem title={text(language, 'Funzionamento offline', 'Offline use')} body={text(language, 'Le funzioni principali non richiedono connessione. La disinstallazione dell’app elimina i dati locali; crea un backup prima di rimuoverla.', 'Core features work offline. Uninstalling the app removes its local data; create a backup before uninstalling.')} />
            <HelpItem title={text(language, 'Notifiche', 'Notifications')} body={text(language, 'Per mantenere le sveglie puntuali, verifica che Android non limiti l’attività in background di questa app.', 'For timely alarms, make sure Android does not restrict this app’s background activity.')} />
            <HelpItem title={text(language, 'Backup', 'Backups')} body={text(language, 'I backup locali aiutano a ripristinare i dati sullo stesso dispositivo. Per trasferirli su un altro telefono serve un’esportazione di file.', 'Local backups help restore data on this device. Moving data to another phone requires a file export.')} />
          </View>
        ) : null}
      </Section>
    </ScrollView>
  );
}

function PersonalTimeRow({
  item,
  language,
  settings,
  onChange,
}: {
  item: (typeof PERSONAL_TIMES)[number];
  language: string;
  settings: Settings;
  onChange: (changes: Partial<Settings>) => void;
}) {
  const colors = useColors();
  const label = settings[`${item.key}Label` as keyof typeof settings] as string | null;
  const hour = settings[`${item.key}Hour` as keyof typeof settings] as number | null;
  const minute = settings[`${item.key}Minute` as keyof typeof settings] as number | null;
  const color = settings[`${item.key}Color` as keyof typeof settings] as string | null;
  const fallback = translate(language, item.translationKey) as string ?? item.fallback;
  const key = item.key;
  return (
    <View style={{ padding: 10, borderRadius: 15, backgroundColor: colors.background, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color ?? colors.mutedForeground }} />
        <Text style={{ flex: 1, color: color ?? colors.foreground, fontSize: 13, fontWeight: '800' }}>{label?.trim() || fallback}</Text>
        <ClockInput
          hour={hour ?? 0}
          minute={minute ?? 0}
          onChange={(nextHour, nextMinute) => onChange({
            [`${key}Hour`]: nextHour,
            [`${key}Minute`]: nextMinute,
          } as Partial<Settings>)}
        />
        {hour !== null && minute !== null ? (
          <Pressable onPress={() => onChange({ [`${key}Hour`]: null, [`${key}Minute`]: null } as Partial<Settings>)} hitSlop={7}>
            <Feather name="x-circle" size={17} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <TextInput
        value={label ?? ''}
        onChangeText={value => onChange({ [`${key}Label`]: value || null } as Partial<Settings>)}
        placeholder={fallback}
        placeholderTextColor={colors.mutedForeground}
        maxLength={22}
        style={{ height: 34, borderRadius: 10, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontSize: 12 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginRight: 2 }}>{text(language, 'Colore', 'Color')}</Text>
        {COLORS.map(value => (
          <Pressable key={value} onPress={() => onChange({ [`${key}Color`]: value } as Partial<Settings>)} style={{ width: 20, height: 20, borderRadius: 11, backgroundColor: value, borderWidth: color === value ? 2 : 0, borderColor: colors.foreground }} />
        ))}
        {color ? <Pressable onPress={() => onChange({ [`${key}Color`]: null } as Partial<Settings>)} hitSlop={5}><Feather name="x" size={15} color={colors.mutedForeground} /></Pressable> : null}
      </View>
    </View>
  );
}

function ClockInput({ hour, minute, onChange }: { hour: number; minute: number; onChange: (hour: number, minute: number) => void }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <TextInput
        value={String(hour).padStart(2, '0')}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        onChangeText={value => /^\d{1,2}$/.test(value) && onChange(Math.min(23, Number(value)), minute)}
        style={{ width: 35, height: 32, textAlign: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontFamily: 'SpaceMono_400Regular', fontSize: 12 }}
      />
      <Text style={{ color: colors.mutedForeground }}>:</Text>
      <TextInput
        value={String(minute).padStart(2, '0')}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        onChangeText={value => /^\d{1,2}$/.test(value) && onChange(hour, Math.min(59, Number(value)))}
        style={{ width: 35, height: 32, textAlign: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.foreground, fontFamily: 'SpaceMono_400Regular', fontSize: 12 }}
      />
    </View>
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

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 33, paddingHorizontal: 10, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}20` : colors.background }}>
      <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontSize: 11, fontWeight: active ? '800' : '600' }}>{label}</Text>
    </Pressable>
  );
}

function SwitchToggle({ value, onPress, disabled = false }: { value: boolean; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} disabled={disabled} onPress={onPress} style={{ width: 45, height: 26, borderRadius: 14, justifyContent: 'center', backgroundColor: value ? colors.primary : colors.muted, borderWidth: 1, borderColor: value ? colors.primary : colors.border, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: colors.foreground, marginHorizontal: 2, alignSelf: value ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

function HelpItem({ title, body }: { title: string; body: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 3 }}>
      <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16 }}>{body}</Text>
    </View>
  );
}
