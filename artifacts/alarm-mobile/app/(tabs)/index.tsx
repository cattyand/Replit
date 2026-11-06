import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AlarmIcon } from '@/components/alarm-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalData } from '@/lib/local-data';
import { calculateNextActivation, formatNextOccurrence, formatPersonalTimeName, nextAlarmSummary, sortAlarms } from '@/lib/alarm-utils';
import { text, translate, useAppLanguage } from '@/lib/strings';
import type { Alarm, SortOrder } from '@/lib/alarm-types';

type MenuItem = { title: string; icon: keyof typeof Feather.glyphMap; onPress: () => void; destructive?: boolean };

function AlarmCard({
  alarm,
  accentColor,
  personalTimeName,
  snoozedUntil,
  onOpenMenu,
  onEdit,
  onToggle,
}: {
  alarm: Alarm;
  accentColor: string | null;
  personalTimeName: string | null;
  snoozedUntil: number | null;
  onOpenMenu: () => void;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const colors = useColors();
  const language = useAppLanguage();
  const weekdays = translate(language, 'alarmCard.weekdays') as string[];
  const snoozed = snoozedUntil !== null && snoozedUntil > Date.now();
  const nextDate = snoozed ? new Date(snoozedUntil) : calculateNextActivation(alarm);
  const enabledBg = accentColor ? `${accentColor}18` : colors.card;
  const borderColor = snoozed ? colors.alarmWarningBorder : accentColor ? `${accentColor}90` : alarm.enabled ? `${colors.primary}35` : colors.border;
  const foreground = alarm.enabled ? colors.primary : colors.mutedForeground;
  const weekly = alarm.alarmType === 'weekly';
  const oneTime = alarm.alarmType === 'once';
  const specific = alarm.alarmType === 'specific_dates';

  return (
    <View
      style={{
        overflow: 'hidden',
        borderRadius: 25,
        borderWidth: 1,
        borderColor,
        backgroundColor: snoozed ? colors.alarmWarningBackground : enabledBg,
        opacity: alarm.enabled ? 1 : 0.78,
      }}
    >
      {personalTimeName ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderBottomLeftRadius: 18,
            backgroundColor: accentColor ? `${accentColor}30` : `${colors.primary}25`,
          }}
        >
          <Text style={{ color: accentColor ?? colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
            {personalTimeName.toLocaleUpperCase(language)}
          </Text>
        </View>
      ) : null}
      <View style={{ padding: 13, gap: 2 }}>
        <Pressable onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30 }}>
          <View style={{
            width: 29,
            height: 29,
            borderRadius: 10,
            backgroundColor: alarm.enabled ? `${colors.primary}18` : colors.muted,
            borderWidth: 1,
            borderColor: alarm.enabled ? `${colors.primary}45` : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlarmIcon name={alarm.iconName} size={16} color={alarm.enabled ? colors.primary : colors.mutedForeground} />
          </View>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.alarmName, fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.3 }}>
            {alarm.name}
          </Text>
        </Pressable>

        {snoozed ? (
          <Text style={{ color: colors.alarmName, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginLeft: 37 }}>
            ◷  {text(language, 'Posticipata', 'Snoozed').toLocaleUpperCase(language)}
          </Text>
        ) : null}

        <View style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Pressable onPress={onEdit} style={{ flex: 1 }}>
            <Text style={{ color: foreground, fontFamily: 'SpaceMono_400Regular', fontSize: 20, letterSpacing: -0.7 }}>
              {String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')}
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: alarm.enabled }}
              accessibilityLabel={alarm.enabled ? 'Disattiva sveglia' : 'Attiva sveglia'}
              onPress={() => onToggle(!alarm.enabled)}
              style={{
                width: 42,
                height: 25,
                borderRadius: 14,
                justifyContent: 'center',
                backgroundColor: alarm.enabled ? colors.primary : colors.muted,
                borderWidth: 1,
                borderColor: alarm.enabled ? colors.primary : colors.border,
              }}
            >
              <View style={{
                width: 19,
                height: 19,
                borderRadius: 10,
                marginHorizontal: 2,
                alignSelf: alarm.enabled ? 'flex-end' : 'flex-start',
                backgroundColor: colors.foreground,
                elevation: 2,
              }} />
            </Pressable>
            <Pressable onPress={onOpenMenu} hitSlop={10} style={{ width: 31, height: 34, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="more-vertical" size={17} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {alarm.enabled && nextDate ? (
          <Pressable onPress={onEdit}>
            <Text style={{ color: snoozed ? colors.alarmName : `${colors.primary}dc`, fontSize: 12, fontWeight: '500', marginBottom: 4 }}>
              {snoozed ? `${text(language, 'Suona alle', 'Rings at')} ` : ''}
              {formatNextOccurrence(nextDate, language)}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 19 }}>
          {oneTime ? (
            <>
              <Feather name="clock" size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{text(language, 'Una tantum', 'One time')}</Text>
            </>
          ) : specific ? (
            <>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {text(language, `${alarm.specificDates.length} date specifiche`, `${alarm.specificDates.length} specific dates`)}
              </Text>
            </>
          ) : (
            <>
              <Feather name="repeat" size={14} color={colors.mutedForeground} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                {(weekdays ?? []).map((day, index) => {
                  const active = alarm.weekDays.includes(index);
                  const next = alarm.enabled && !snoozed && nextDate?.getDay() === index;
                  return (
                    <Text key={`${day}-${index}`} style={{
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                      borderRadius: 6,
                      overflow: 'hidden',
                      fontSize: 9,
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: next ? colors.alarmName : active ? colors.primary : `${colors.mutedForeground}55`,
                      backgroundColor: next ? `${colors.alarmWarning}28` : active ? `${colors.primary}20` : 'transparent',
                    }}>
                      {day}
                    </Text>
                  );
                })}
              </View>
            </>
          )}
          {alarm.autoDelete ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
              <Feather name="trash-2" size={10} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontSize: 9, fontWeight: '800' }}>
                {text(language, 'ELIM. AUTO', 'AUTO-DEL.')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const language = useAppLanguage();
  const router = useRouter();
  const store = useLocalData();
  const [sortOpen, setSortOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(store.settings.sortOrder);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);
  const [menuAlarm, setMenuAlarm] = useState<Alarm | null>(null);
  const [clock, setClock] = useState(Date.now());

  React.useEffect(() => {
    setSortOrder(store.settings.sortOrder);
  }, [store.settings.sortOrder]);

  React.useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const sortedAlarms = useMemo(() => sortAlarms(store.alarms, sortOrder), [store.alarms, sortOrder, clock]);
  const visibleAlarms = searchMode
    ? submittedSearch?.trim()
      ? sortedAlarms.filter(alarm => alarm.name.toLocaleLowerCase(language).includes(submittedSearch.trim().toLocaleLowerCase(language)))
      : []
    : sortedAlarms;

  const personalBadge = (alarm: Alarm) => {
    const key = alarm.personalTimeKey;
    if (!key) return { label: null, color: null };
    return {
      label: formatPersonalTimeName(store.settings as unknown as Record<string, unknown>, key, language),
      color: store.settings[`${key}Color` as keyof typeof store.settings] as string | null,
    };
  };

  const deleteAlarm = (alarm: Alarm) => {
    setMenuAlarm(null);
    Alert.alert(
      text(language, 'Eliminare la sveglia?', 'Delete this alarm?'),
      text(language, `“${alarm.name}” verrà eliminata definitivamente.`, `“${alarm.name}” will be permanently deleted.`),
      [
        { text: text(language, 'Annulla', 'Cancel'), style: 'cancel' },
        { text: text(language, 'Elimina', 'Delete'), style: 'destructive', onPress: () => store.deleteAlarm(alarm.id) },
      ],
    );
  };

  const menuItems = (alarm: Alarm): MenuItem[] => [
    { title: text(language, 'Modifica', 'Edit'), icon: 'edit-2', onPress: () => { setMenuAlarm(null); router.push({ pathname: '/alarm/[id]', params: { id: String(alarm.id) } }); } },
    { title: text(language, 'Duplica', 'Clone'), icon: 'copy', onPress: () => { store.cloneAlarm(alarm.id); setMenuAlarm(null); } },
    { title: text(language, 'Clona come una volta', 'Clone once'), icon: 'copy', onPress: () => { const clone = store.cloneAlarm(alarm.id, { once: true }); setMenuAlarm(null); if (clone) router.push({ pathname: '/alarm/[id]', params: { id: String(clone.id) } }); } },
    { title: text(language, 'Simula suono', 'Simulate alarm'), icon: 'bell', onPress: () => { setMenuAlarm(null); router.push({ pathname: '/alarm/active/[id]', params: { id: String(alarm.id), simulate: 'true' } }); } },
    ...(alarm.enabled && alarm.alarmType !== 'once'
      ? [{ title: text(language, 'Salta prossima occorrenza', 'Skip next occurrence'), icon: 'skip-forward' as const, onPress: () => { store.skipNextOccurrence(alarm.id); setMenuAlarm(null); } }]
      : []),
    ...(alarm.alarmType !== 'once' && alarm.skippedDates.length > 0
      ? [{ title: text(language, 'Ripristina occorrenza', 'Revert skipped occurrence'), icon: 'skip-back' as const, onPress: () => { store.revertSkippedOccurrence(alarm.id); setMenuAlarm(null); } }]
      : []),
    { title: text(language, 'Elimina', 'Delete'), icon: 'trash-2', destructive: true, onPress: () => deleteAlarm(alarm) },
  ];

  if (!store.loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.mutedForeground }}>{text(language, 'Caricamento sveglie…', 'Loading alarms…')}</Text>
    </View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 126, gap: 15 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 5, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 35, letterSpacing: -0.9 }}>
              {translate(language, 'home.title') as string ?? 'Alarms'}
            </Text>
            <Pressable onPress={() => Alert.alert(text(language, 'Sveglie', 'Alarms'), text(language, 'Gestisci le tue sveglie locali: restano salvate su questo telefono.', 'Manage your local alarms. They stay saved on this phone.'))} style={{ paddingTop: 5 }}>
              <Feather name="help-circle" size={19} color={colors.alarmWarning} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            {searchMode ? (
              <>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  onSubmitEditing={() => setSubmittedSearch(searchText.trim())}
                  placeholder={text(language, 'Cerca sveglie…', 'Search alarms…')}
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="search"
                  style={{ width: 144, height: 41, borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }}
                />
                <HeaderIcon icon="check" label={text(language, 'Conferma ricerca', 'Confirm search')} onPress={() => setSubmittedSearch(searchText.trim())} />
                <HeaderIcon icon="x" label={text(language, 'Chiudi ricerca', 'Close search')} onPress={() => { setSearchMode(false); setSearchText(''); setSubmittedSearch(null); }} />
              </>
            ) : (
              <>
                <Pressable onPress={() => setSortOpen(true)} style={{ height: 41, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="shuffle" size={15} color={colors.mutedForeground} />
                  <Text style={{ color: colors.foreground, fontSize: 13 }}>
                    {sortOrder === 'name' ? text(language, 'Nome', 'Name') : sortOrder === 'personalTimes' ? text(language, 'Orario personale', 'Personal time') : text(language, 'Ordine attivazione', 'Activation order')}
                  </Text>
                  <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                </Pressable>
                <HeaderIcon icon="search" label={text(language, 'Cerca', 'Search')} onPress={() => { setSearchMode(true); setSubmittedSearch(null); setSearchText(''); }} />
              </>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Feather name="clock" size={13} color={colors.primary} />
            <Text style={{ flex: 1, color: colors.mutedForeground, fontSize: 13, lineHeight: 19 }}>
              {nextAlarmSummary(store.alarms, language)}
            </Text>
          </View>
        </View>

        {visibleAlarms.length === 0 ? (
          <View style={{ minHeight: 210, alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 26, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, gap: 12 }}>
            <Feather name={searchMode ? 'search' : 'clock'} size={34} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', lineHeight: 21 }}>
              {searchMode
                ? submittedSearch ? text(language, 'Nessuna sveglia trovata.', 'No alarms found.') : text(language, 'Inserisci un nome e conferma la ricerca.', 'Enter a name and confirm your search.')
                : text(language, 'Non ci sono sveglie. Premi + per crearne una.', 'No alarms yet. Tap + to create one.')}
            </Text>
          </View>
        ) : visibleAlarms.map(alarm => {
          const badge = personalBadge(alarm);
          return (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              accentColor={badge.color}
              personalTimeName={badge.label}
              snoozedUntil={store.snoozes[String(alarm.id)]?.until ?? null}
              onOpenMenu={() => setMenuAlarm(alarm)}
              onEdit={() => router.push({ pathname: '/alarm/[id]', params: { id: String(alarm.id) } })}
              onToggle={enabled => store.updateAlarm(alarm.id, { enabled })}
            />
          );
        })}
      </ScrollView>

      <ChoiceModal
        visible={sortOpen}
        title={text(language, 'Ordina sveglie', 'Sort alarms')}
        items={[
          { title: text(language, 'Prossima attivazione', 'Next activation'), value: 'activation' as SortOrder },
          { title: text(language, 'Nome', 'Name'), value: 'name' as SortOrder },
          { title: text(language, 'Orario personale', 'Personal time'), value: 'personalTimes' as SortOrder },
        ]}
        selected={sortOrder}
        onClose={() => setSortOpen(false)}
        onSelect={value => { setSortOrder(value); store.updateSettings({ sortOrder: value }); setSortOpen(false); }}
      />

      <Modal visible={Boolean(menuAlarm)} transparent animationType="fade" onRequestClose={() => setMenuAlarm(null)}>
        <Pressable onPress={() => setMenuAlarm(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, padding: 20, paddingBottom: 34, gap: 4, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, marginBottom: 8 }}>
              {menuAlarm?.name}
            </Text>
            {menuAlarm ? menuItems(menuAlarm).map(item => (
              <Pressable key={item.title} onPress={item.onPress} style={{ minHeight: 47, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Feather name={item.icon} size={17} color={item.destructive ? colors.destructive : colors.mutedForeground} />
                <Text style={{ color: item.destructive ? colors.destructive : colors.foreground, fontSize: 15 }}>{item.title}</Text>
              </Pressable>
            )) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 41, height: 41, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ChoiceModal<T extends string>({
  visible,
  title,
  items,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: Array<{ title: string; value: T }>;
  selected: T;
  onClose: () => void;
  onSelect: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: 'center', padding: 26, backgroundColor: 'rgba(0,0,0,0.62)' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, marginBottom: 4 }}>{title}</Text>
          {items.map(item => (
            <Pressable key={item.value} onPress={() => onSelect(item.value)} style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
              <Text style={{ color: item.value === selected ? colors.primary : colors.foreground }}>{item.title}</Text>
              {item.value === selected ? <Feather name="check" size={17} color={colors.primary} /> : null}
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
