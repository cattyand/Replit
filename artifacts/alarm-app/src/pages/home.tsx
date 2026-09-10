import { useListAlarms, useUpdateAlarm, useDeleteAlarm, useSkipNextOccurrence, useCloneAlarm, useGetSettings, getListAlarmsQueryKey, type Alarm } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState as useReactState, useEffect as useReactEffect } from "react";
import { calculateNextActivation, formatTimeLeft } from "@/lib/date-utils";
import { useDateLocale } from "@/hooks/use-date-locale";
import { AlarmCard } from "@/components/alarm-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Check, Clock, ArrowUpDown, Search, X } from "lucide-react";
import { useLocation } from "wouter";
import { firedNormalThisMinute } from "@/hooks/use-alarm-trigger";
import { HelpButton } from "@/components/program-help";

type SortOrder = "activation" | "name" | "personalTimes";

const PERSONAL_TIME_ORDER: Record<string, number> = {
  wakeup: 0,
  workStart: 1,
  lunch: 2,
  workEnd: 3,
  dinner: 4,
  sleep: 5,
};

function compareByActivation(a: Alarm, b: Alarm): number {
  const nextA = calculateNextActivation(a);
  const nextB = calculateNextActivation(b);
  if (!nextA && !nextB) return 0;
  if (!nextA) return 1;
  if (!nextB) return -1;
  return nextA.getTime() - nextB.getTime();
}

function sortAlarms(alarms: Alarm[], sortOrder: SortOrder): Alarm[] {
  return [...alarms].sort((a, b) => {
    if (!a.enabled && b.enabled) return 1;
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && !b.enabled) return 0;

    if (sortOrder === "name") {
      return a.name.localeCompare(b.name) || compareByActivation(a, b);
    }

    if (sortOrder === "personalTimes") {
      const orderA = a.personalTimeKey ? PERSONAL_TIME_ORDER[a.personalTimeKey] ?? 99 : 99;
      const orderB = b.personalTimeKey ? PERSONAL_TIME_ORDER[b.personalTimeKey] ?? 99 : 99;
      if (orderA !== orderB) return orderA - orderB;
      return compareByActivation(a, b);
    }

    return compareByActivation(a, b);
  });
}

const PERSONAL_TIME_COLOR_FIELDS: Record<string, "wakeupColor" | "workStartColor" | "lunchColor" | "workEndColor" | "dinnerColor" | "sleepColor"> = {
  wakeup:    "wakeupColor",
  workStart: "workStartColor",
  lunch:     "lunchColor",
  workEnd:   "workEndColor",
  dinner:    "dinnerColor",
  sleep:     "sleepColor",
};

const PERSONAL_TIME_LABEL_FIELDS: Record<string, "wakeupLabel" | "workStartLabel" | "lunchLabel" | "workEndLabel" | "dinnerLabel" | "sleepLabel"> = {
  wakeup:    "wakeupLabel",
  workStart: "workStartLabel",
  lunch:     "lunchLabel",
  workEnd:   "workEndLabel",
  dinner:    "dinnerLabel",
  sleep:     "sleepLabel",
};

const PERSONAL_TIME_I18N_KEYS: Record<string, string> = {
  wakeup:    "settings.wakeup",
  workStart: "settings.workStart",
  lunch:     "settings.lunch",
  workEnd:   "settings.workEnd",
  dinner:    "settings.dinner",
  sleep:     "settings.sleep",
};

export default function Home() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { data: alarms, isLoading } = useListAlarms();
  const { data: settings } = useGetSettings();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const updateAlarm = useUpdateAlarm();
  const deleteAlarm = useDeleteAlarm();
  const skipNext = useSkipNextOccurrence();
  const cloneAlarm = useCloneAlarm();

  const [sortOrder, setSortOrder] = useReactState<SortOrder>("activation");
  const [searchMode, setSearchMode] = useReactState(false);
  const [searchText, setSearchText] = useReactState("");
  const [submittedSearch, setSubmittedSearch] = useReactState<string | null>(null);

  useReactEffect(() => {
    if (settings?.sortOrder) {
      setSortOrder(settings.sortOrder as SortOrder);
    }
  }, [settings?.sortOrder]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 px-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("home.title")}</h1>
          <HelpButton screen="home" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl bg-card" />
        ))}
      </div>
    );
  }

  const sortedAlarms = sortAlarms(alarms || [], sortOrder);
  const visibleAlarms = searchMode
    ? submittedSearch && submittedSearch.trim()
      ? sortedAlarms.filter(alarm => alarm.name.toLocaleLowerCase().includes(submittedSearch.trim().toLocaleLowerCase()))
      : []
    : sortedAlarms;

  const openSearch = () => {
    setSearchMode(true);
    setSearchText("");
    setSubmittedSearch(null);
  };

  const closeSearch = () => {
    setSearchMode(false);
    setSearchText("");
    setSubmittedSearch(null);
  };

  const submitSearch = () => {
    setSubmittedSearch(searchText.trim());
  };

  const handleToggle = (alarm: any, enabled: boolean) => {
    updateAlarm.mutate({ id: alarm.id, data: { ...alarm, enabled } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() })
    });
  };

  const handleDelete = (id: number) => {
    deleteAlarm.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() })
    });
  };

  const handleSkip = (id: number) => {
    skipNext.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() })
    });
  };

  const handleUnskip = (alarm: any) => {
    const skipped = [...(alarm.skippedDates ?? [])];
    if (skipped.length === 0) return;
    skipped.sort();
    skipped.pop();
    updateAlarm.mutate({ id: alarm.id, data: { ...alarm, skippedDates: skipped } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() })
    });
  };

  const handleClone = (id: number) => {
    cloneAlarm.mutate({ id, data: { nameSuffix: " (Copia)" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() })
    });
  };

  const handleCloneOnce = (alarm: any) => {
    const cloneAsOnce = alarm.alarmType !== "once";
    cloneAlarm.mutate(
      {
        id: alarm.id,
        data: {
          autoDelete: true,
          enabled: true,
          nameSuffix: " (clonata)",
          ...(cloneAsOnce ? { alarmType: "once" } : {}),
        },
      },
      {
        onSuccess: (newAlarm: { id: number }) => {
          const minuteKey = format(new Date(), "yyyy-MM-dd-HH-mm");
          firedNormalThisMinute.add(`normal-${newAlarm.id}-${minuteKey}`);
          queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
          setLocation(`/alarm/${newAlarm.id}/edit`);
        },
      }
    );
  };

  const nextActiveAlarm = sortedAlarms.find(a => a.enabled && calculateNextActivation(a));
  const nextDate = nextActiveAlarm ? calculateNextActivation(nextActiveAlarm) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-start gap-2">
          <h1 className="text-4xl font-bold tracking-tight">{t("home.title")}</h1>
          <HelpButton screen="home" />
        </div>
        <div className="flex items-center justify-end gap-2">
          {searchMode ? (
            <div className="flex items-center gap-2 shrink-0">
              <Input
                autoFocus
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter") submitSearch(); }}
                placeholder={t("home.searchPlaceholder")}
                aria-label={t("home.searchPlaceholder")}
                className="h-10 w-36 rounded-xl bg-card border-border/50"
              />
              <button type="button" onClick={submitSearch} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/50 text-primary hover:bg-accent" aria-label={t("home.searchConfirm")}>
                <Check className="h-4 w-4" />
              </button>
              <button type="button" onClick={closeSearch} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground" aria-label={t("home.searchClose")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="h-10 rounded-xl bg-card border-border/50 w-auto gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activation">{t("settings.sortOrderActivation")}</SelectItem>
                  <SelectItem value="name">{t("settings.sortOrderName")}</SelectItem>
                  <SelectItem value="personalTimes">{t("settings.sortOrderPersonalTimes")}</SelectItem>
                </SelectContent>
              </Select>
              <button type="button" onClick={openSearch} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground" aria-label={t("home.searchOpen")}>
                <Search className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground flex items-center gap-2">
          {nextDate ? (
            <>
              <Clock className="w-4 h-4 text-primary animate-pulse-slow" />
              <span>
                {t("home.nextAlarm", {
                  timeLeft: formatTimeLeft(nextDate),
                  datetime: format(nextDate, "EEE d MMM, HH:mm", { locale: dateLocale }),
                })}
              </span>
            </>
          ) : (
            <span>{t("home.noActiveAlarm")}</span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {visibleAlarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              {searchMode ? <Search className="w-8 h-8 opacity-50" /> : <Clock className="w-8 h-8 opacity-50" />}
            </div>
            <p>{searchMode ? (submittedSearch ? t("home.noSearchResults") : t("home.searchPrompt")) : t("home.noAlarms")}</p>
          </div>
        ) : (
          visibleAlarms.map((alarm) => {
            const ptKey = alarm.personalTimeKey ?? null;
            const colorField = ptKey ? PERSONAL_TIME_COLOR_FIELDS[ptKey] : null;
            const accentColor = colorField && settings ? (settings[colorField] ?? null) : null;
            const labelField = ptKey ? PERSONAL_TIME_LABEL_FIELDS[ptKey] : null;
            const customLabel = labelField && settings ? (settings[labelField] ?? null) : null;
            const personalTimeName = ptKey ? (customLabel || t(PERSONAL_TIME_I18N_KEYS[ptKey])) : null;
            return (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              accentColor={accentColor}
              personalTimeName={personalTimeName}
              onToggle={(enabled) => handleToggle(alarm, enabled)}
              onDelete={() => handleDelete(alarm.id)}
              onSkip={() => handleSkip(alarm.id)}
              onUnskip={() => handleUnskip(alarm)}
              onClone={() => handleClone(alarm.id)}
              onCloneOnce={() => handleCloneOnce(alarm)}
              onEdit={() => setLocation(`/alarm/${alarm.id}/edit`)}
              onActiveSimulate={() => setLocation(`/alarm/${alarm.id}/active`)}
            />
            );
          })
        )}
      </div>
    </div>
  );
}
