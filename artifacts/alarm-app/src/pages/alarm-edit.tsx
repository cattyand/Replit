import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useGetAlarm, useCreateAlarm, useUpdateAlarm, useGetSettings, useListProfiles, AlarmInput, AlarmInputAlarmType, AlarmInputVibration, getListAlarmsQueryKey, getGetAlarmQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Volume2, VolumeX, BellRing, Settings2, Play, Sparkles } from "lucide-react";
import { playRingtonePreview } from "@/hooks/use-alarm-audio";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockPicker } from "@/components/clock-picker";
import { Calendar } from "@/components/ui/calendar";
import { ALARM_ICON_OPTIONS, AlarmIcon } from "@/components/alarm-icons";
import { HelpButton } from "@/components/program-help";

const RINGTONES = ["Sveglia classica", "Campanelli", "Melodia mattutina", "Digitale", "Natura", "Gallo", "Sirena dolce", "Carillon"];

const AUTO_SNOOZE_DURATION_OPTIONS = [
  { key: "snooze10s" as const, seconds: 10 },
  { key: "snooze5m"  as const, seconds: 5 * 60 },
  { key: "snooze10m" as const, seconds: 10 * 60 },
  { key: "snooze15m" as const, seconds: 15 * 60 },
  { key: "snooze30m" as const, seconds: 30 * 60 },
  { key: "snooze1h"  as const, seconds: 60 * 60 },
  { key: "snooze2h"  as const, seconds: 2 * 60 * 60 },
  { key: "snooze3h"  as const, seconds: 3 * 60 * 60 },
  { key: "snooze4h"  as const, seconds: 4 * 60 * 60 },
  { key: "snooze5h"  as const, seconds: 5 * 60 * 60 },
  { key: "snooze6h"  as const, seconds: 6 * 60 * 60 },
  { key: "snooze7h"  as const, seconds: 7 * 60 * 60 },
  { key: "snooze8h"  as const, seconds: 8 * 60 * 60 },
];

const PERSONAL_TIME_OPTIONS = [
  { key: "wakeup",    tKey: "settings.wakeup",    hourField: "wakeupHour",    minuteField: "wakeupMinute",    labelField: "wakeupLabel"    },
  { key: "workStart", tKey: "settings.workStart",  hourField: "workStartHour", minuteField: "workStartMinute", labelField: "workStartLabel" },
  { key: "lunch",     tKey: "settings.lunch",      hourField: "lunchHour",     minuteField: "lunchMinute",     labelField: "lunchLabel"     },
  { key: "workEnd",   tKey: "settings.workEnd",    hourField: "workEndHour",   minuteField: "workEndMinute",   labelField: "workEndLabel"   },
  { key: "dinner",    tKey: "settings.dinner",     hourField: "dinnerHour",    minuteField: "dinnerMinute",    labelField: "dinnerLabel"    },
  { key: "sleep",     tKey: "settings.sleep",      hourField: "sleepHour",     minuteField: "sleepMinute",     labelField: "sleepLabel"     },
] as const;

export default function AlarmEdit() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const weekdays = t("alarmCard.weekdays", { returnObjects: true }) as string[];

  const [, setLocation] = useLocation();
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  const isNew = !id;

  const queryClient = useQueryClient();
  const createAlarm = useCreateAlarm();
  const updateAlarm = useUpdateAlarm();

  const { data: alarm, isLoading: isLoadingAlarm } = useGetAlarm(id!, {
    query: { enabled: !!id, queryKey: getGetAlarmQueryKey(id!) }
  });
  const { data: settings } = useGetSettings();
  const { data: profiles = [] } = useListProfiles();

  const availablePersonalTimes = settings
    ? PERSONAL_TIME_OPTIONS.filter(
        opt => settings[opt.hourField] != null && settings[opt.minuteField] != null
      )
    : [];

  const previewStopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { previewStopRef.current?.(); }, []);

  const [selectedPersonalTime, setSelectedPersonalTime] = useState<string>("none");
  const [name, setName] = useState("");
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [alarmType, setAlarmType] = useState<AlarmInputAlarmType>("once");
  const [autoDelete, setAutoDelete] = useState(false);
  const [ringtone, setRingtone] = useState("Sveglia classica");
  const [volume, setVolume] = useState(50);
  const [gradualVolume, setGradualVolume] = useState(0);
  const [vibration, setVibration] = useState<AlarmInputVibration>("on");
  const [autoSnooze, setAutoSnooze] = useState(0);
  const [maxSnoozes, setMaxSnoozes] = useState(-1);
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [onceDate, setOnceDate] = useState<Date | undefined>(undefined);
  const [profileId, setProfileId] = useState<number | null>(null);
  const appliedProfileFields = useRef<Set<string>>(new Set());
  const [iconName, setIconName] = useState("alarm-clock");
  const defaultProfileApplied = useRef(false);
  const defaultProfile = profiles.find(profile => profile.isDefault);

  useEffect(() => {
    if (alarm) {
      setName(alarm.name);
      setHour(alarm.hour);
      setMinute(alarm.minute);
      setAlarmType(alarm.alarmType);
      setAutoDelete(alarm.autoDelete);
      setRingtone(alarm.ringtone);
      setVolume(alarm.volume);
      setGradualVolume(alarm.gradualVolume);
      setVibration(alarm.vibration);
      setAutoSnooze(alarm.autoSnooze);
      setMaxSnoozes(alarm.maxSnoozes);
      setWeekDays(alarm.weekDays || []);
      setSelectedPersonalTime(alarm.personalTimeKey ?? "none");
       setIconName(alarm.iconName || "alarm-clock");
       setProfileId(alarm.profileId ?? null);
       const linkedProfile = alarm.profileId == null ? undefined : profiles.find(profile => profile.id === alarm.profileId);
       appliedProfileFields.current = new Set(
         linkedProfile
           ? ["autoDelete", "ringtone", "volume", "gradualVolume", "vibration", "autoSnooze", "maxSnoozes"]
               .filter(field => linkedProfile[field as keyof typeof linkedProfile] != null)
           : []
       );
      if (alarm.alarmType === "once" && alarm.specificDates && alarm.specificDates.length > 0) {
        setOnceDate(new Date(alarm.specificDates[0]));
        setSpecificDates([]);
      } else {
        setSpecificDates(alarm.specificDates?.map(d => new Date(d)) || []);
      }
    }
  }, [alarm, isNew]);

  useEffect(() => {
    if (!isNew || !defaultProfile || defaultProfileApplied.current) return;
    if (defaultProfile.autoDelete != null) setAutoDelete(defaultProfile.autoDelete);
    if (defaultProfile.ringtone != null) setRingtone(defaultProfile.ringtone);
    if (defaultProfile.volume != null) setVolume(defaultProfile.volume);
    if (defaultProfile.gradualVolume != null) setGradualVolume(defaultProfile.gradualVolume);
    if (defaultProfile.vibration != null) setVibration(defaultProfile.vibration);
    if (defaultProfile.autoSnooze != null) setAutoSnooze(defaultProfile.autoSnooze);
    if (defaultProfile.maxSnoozes != null) setMaxSnoozes(defaultProfile.maxSnoozes);
    setProfileId(defaultProfile.id);
    appliedProfileFields.current = new Set(
      ["autoDelete", "ringtone", "volume", "gradualVolume", "vibration", "autoSnooze", "maxSnoozes"]
        .filter(field => defaultProfile[field as keyof typeof defaultProfile] != null)
    );
    defaultProfileApplied.current = true;
  }, [isNew, defaultProfile]);

  const handleSave = () => {
    const input: AlarmInput = {
      name,
      enabled: isNew ? true : (alarm?.enabled ?? true),
      hour,
      minute,
      alarmType,
      autoDelete,
      ringtone,
      volume,
      gradualVolume,
      vibration,
      autoSnooze,
      maxSnoozes,
      weekDays: alarmType === "weekly" ? weekDays : undefined,
      specificDates: alarmType === "specific_dates"
        ? specificDates.map(d => format(d, "yyyy-MM-dd"))
        : alarmType === "once" && onceDate
          ? [format(onceDate, "yyyy-MM-dd")]
          : undefined,
       personalTimeKey: selectedPersonalTime === "none" ? null : selectedPersonalTime,
       profileId,
      iconName,
    };

    if (isNew) {
      createAlarm.mutate({ data: input }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() }); setLocation("/"); },
        onError: () => setLocation("/"),
      });
    } else {
      updateAlarm.mutate({ id: id!, data: input }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAlarmQueryKey(id!) });
          setLocation("/");
        },
        onError: () => setLocation("/"),
      });
    }
  };

  const detachProfileIfNeeded = (field: string) => {
    if (profileId !== null && appliedProfileFields.current.has(field)) {
      setProfileId(null);
      appliedProfileFields.current = new Set();
    }
  };

  const chooseProfile = (value: string) => {
    if (value === "none") {
      setProfileId(null);
      appliedProfileFields.current = new Set();
      return;
    }
    const profile = profiles.find(p => String(p.id) === value);
    if (!profile) return;
    const values: Array<[string, unknown, (value: any) => void]> = [
      ["autoDelete", profile.autoDelete, setAutoDelete],
      ["ringtone", profile.ringtone, setRingtone],
      ["volume", profile.volume, setVolume],
      ["gradualVolume", profile.gradualVolume, setGradualVolume],
      ["vibration", profile.vibration, setVibration],
      ["autoSnooze", profile.autoSnooze, setAutoSnooze],
      ["maxSnoozes", profile.maxSnoozes, setMaxSnoozes],
    ];
    const applied = new Set<string>();
    values.forEach(([field, value, setter]) => {
      if (value !== null && value !== undefined) {
        setter(value);
        applied.add(field);
      }
    });
    appliedProfileFields.current = applied;
    setProfileId(profile.id);
  };

  const isProfileField = (field: string) => profileId !== null && appliedProfileFields.current.has(field);
  const fieldLabelClass = (field: string) => isProfileField(field) ? "text-orange-400" : "text-muted-foreground";

  const handleToggleAllWeekDays = () => {
    setWeekDays(weekDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]);
  };

  /** Translates a duration in seconds to a human label */
  const fmtDuration = (secs: number): string => {
    if (secs === 0) return t("alarmEdit.disabled");
    if (secs < 60) return t("duration.second", { count: secs });
    return t("duration.minute", { count: secs / 60 });
  };

  if (id && isLoadingAlarm) {
    return <div className="space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center gap-4 px-2">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {isNew ? t("alarmEdit.titleNew") : t("alarmEdit.titleEdit")}
          </h1>
          <HelpButton screen="alarmEdit" />
        </div>
        <Button className="ml-auto" onClick={handleSave} disabled={createAlarm.isPending || updateAlarm.isPending}>
          {t("alarmEdit.save")}
        </Button>
      </div>

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-8">

        {/* Personal time preset */}
        {availablePersonalTimes.length > 0 && (
          <div className="space-y-3">
            <Label className="text-muted-foreground">{t("alarmEdit.personalTime")}</Label>
            <Select
              value={selectedPersonalTime}
              onValueChange={key => {
                setSelectedPersonalTime(key);
                if (key === "none" || !settings) return;
                const opt = PERSONAL_TIME_OPTIONS.find(o => o.key === key);
                if (!opt) return;
                const h = settings[opt.hourField];
                const m = settings[opt.minuteField];
                if (h != null && m != null) { setHour(h); setMinute(m); }
              }}
            >
              <SelectTrigger className="h-12 rounded-xl bg-background">
                <SelectValue placeholder={t("alarmEdit.noPersonalTime")} />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="none">{t("alarmEdit.noPersonalTime")}</SelectItem>
                {availablePersonalTimes.map(opt => {
                  const h     = settings![opt.hourField]!;
                  const m     = settings![opt.minuteField]!;
                  const label = (settings as unknown as Record<string, unknown>)[opt.labelField] as string | null | undefined;
                  return (
                    <SelectItem key={opt.key} value={opt.key}>
                      {label || t(opt.tKey)} — {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-muted-foreground">{t("alarmEdit.profile")}</Label>
          <Select value={profileId === null ? "none" : String(profileId)} onValueChange={chooseProfile}>
            <SelectTrigger className="h-12 rounded-xl bg-background">
              <SelectValue placeholder={t("alarmEdit.noProfile")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("alarmEdit.noProfile")}</SelectItem>
              {[...profiles].sort((a, b) => a.name.localeCompare(b.name)).map(profile => (
                <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-center justify-center py-2">
          <ClockPicker
            hour={hour}
            minute={minute}
            onChange={(h, m) => { setHour(h); setMinute(m); setSelectedPersonalTime("none"); }}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-muted-foreground">{t("alarmEdit.label")}</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("alarmEdit.labelPlaceholder")}
              className="h-12 rounded-xl text-lg bg-background"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {t("alarmEdit.icon")}
            </Label>
            <div className="rounded-2xl border border-border/60 bg-background p-3">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {ALARM_ICON_OPTIONS.map(option => {
                  const selected = iconName === option.name;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={selected}
                      onClick={() => setIconName(option.name)}
                      className={`flex h-11 w-full items-center justify-center rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/15 text-primary shadow-sm shadow-primary/20 scale-105"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <AlarmIcon name={option.name} className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-muted-foreground">{t("alarmEdit.repetition")}</Label>
            <Select value={alarmType} onValueChange={(v: AlarmInputAlarmType) => setAlarmType(v)}>
              <SelectTrigger className="h-12 rounded-xl text-lg bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">{t("alarmEdit.typeOnce")}</SelectItem>
                <SelectItem value="weekly">{t("alarmEdit.typeWeekly")}</SelectItem>
                <SelectItem value="specific_dates">{t("alarmEdit.typeSpecificDates")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {alarmType === "weekly" && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">{t("alarmEdit.weekdaysLabel")}</Label>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleToggleAllWeekDays}>
                  {weekDays.length === 7 ? t("alarmEdit.deselectAll") : t("alarmEdit.selectAll")}
                </Button>
              </div>
              <div className="flex gap-2 justify-between">
                {weekdays.map((day, i) => {
                  const active = weekDays.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (active) setWeekDays(weekDays.filter(d => d !== i));
                        else setWeekDays([...weekDays, i]);
                      }}
                      className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                        active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-110" : "bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {alarmType === "specific_dates" && (
            <div className="space-y-3 pt-2 flex flex-col items-center">
              <Label className="text-muted-foreground self-start">{t("alarmEdit.specificDatesLabel")}</Label>
              <Calendar
                mode="multiple"
                selected={specificDates}
                onSelect={(dates) => setSpecificDates(dates as Date[] || [])}
                className="rounded-xl border bg-background"
                locale={dateLocale}
              />
            </div>
          )}

          {alarmType === "once" && (
            <div className="space-y-4">
              <div className="space-y-3 pt-2 flex flex-col items-center">
                <Label className="text-muted-foreground self-start">{t("alarmEdit.activationDate")}</Label>
                <Calendar
                  mode="single"
                  selected={onceDate}
                  onSelect={(date) => setOnceDate(date ?? undefined)}
                  className="rounded-xl border bg-background"
                  locale={dateLocale}
                  disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                />
              </div>
              <div className="flex items-center justify-between bg-background p-4 rounded-xl border border-border/50">
                <div className="space-y-0.5">
                 <Label className={fieldLabelClass("autoDelete")}>{t("alarmEdit.autoDelete")}</Label>
                 <p className={`text-xs ${isProfileField("autoDelete") ? "text-orange-400/80" : "text-muted-foreground"}`}>
                   {isProfileField("autoDelete") ? t("alarmEdit.profileApplied") : t("alarmEdit.autoDeleteDesc")}
                 </p>
                </div>
                <Switch checked={autoDelete} onCheckedChange={value => { detachProfileIfNeeded("autoDelete"); setAutoDelete(value); }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" /> {t("alarmEdit.soundVibration")}
        </h2>

        <div className="space-y-3">
           <Label className={fieldLabelClass("ringtone")}>{t("alarmEdit.ringtone")}</Label>
          <Select value={ringtone} onValueChange={r => {
             detachProfileIfNeeded("ringtone");
             setRingtone(r);
            previewStopRef.current?.();
            previewStopRef.current = playRingtonePreview(r, volume || 50);
          }}>
            <SelectTrigger className="h-12 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RINGTONES.map(r => (
                <SelectItem key={r} value={r} className="flex items-center gap-2">
                  <Play className="w-3 h-3 opacity-40" /> {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
             <Label className={fieldLabelClass("volume")}>{t("alarmEdit.volume", { value: volume })}</Label>
            {volume === 0 && <span className="text-xs text-destructive font-bold uppercase tracking-wider">{t("alarmEdit.silentAlarm")}</span>}
          </div>
          <div className="flex items-center gap-4">
            <VolumeX className={`w-5 h-5 ${volume === 0 ? "text-destructive" : "text-muted-foreground"}`} />
             <Slider value={[volume]} onValueChange={v => { detachProfileIfNeeded("volume"); setVolume(v[0]); }} max={100} step={1} className="flex-1" />
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-3 pt-2">
           <Label className={fieldLabelClass("gradualVolume")}>{t("alarmEdit.gradualVolume")}</Label>
           <Select value={String(gradualVolume)} onValueChange={v => { detachProfileIfNeeded("gradualVolume"); setGradualVolume(parseInt(v)); }}>
            <SelectTrigger className="h-12 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 5, 10, 15, 30, 60].map(n => (
                <SelectItem key={n} value={String(n)}>{fmtDuration(n)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-2">
           <Label className={fieldLabelClass("vibration")}>{t("alarmEdit.vibration")}</Label>
           <Select value={vibration} onValueChange={(v: AlarmInputVibration) => { detachProfileIfNeeded("vibration"); setVibration(v); }}>
            <SelectTrigger className="h-12 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">{t("alarmEdit.vibrationOff")}</SelectItem>
              <SelectItem value="on">{t("alarmEdit.vibrationOn")}</SelectItem>
              <SelectItem value="only">{t("alarmEdit.vibrationOnly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" /> {t("alarmEdit.snoozeSection")}
        </h2>

        <div className="flex items-center justify-between">
           <Label className={fieldLabelClass("autoSnooze")}>{t("alarmEdit.autoSnooze")}</Label>
          <Switch
            checked={autoSnooze > 0}
             onCheckedChange={checked => { detachProfileIfNeeded("autoSnooze"); setAutoSnooze(checked ? (autoSnooze > 0 ? autoSnooze : 300) : 0); }}
          />
        </div>

        {autoSnooze > 0 && (
          <div className="space-y-3">
             <Label className={fieldLabelClass("autoSnooze")}>{t("alarmEdit.autoSnoozeDuration")}</Label>
             <Select value={String(autoSnooze)} onValueChange={v => { detachProfileIfNeeded("autoSnooze"); setAutoSnooze(parseInt(v)); }}>
              <SelectTrigger className="h-12 rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-56 overflow-y-auto">
                {AUTO_SNOOZE_DURATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.seconds} value={String(opt.seconds)}>
                    {t(`alarmActive.${opt.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3 pt-2">
         <Label className={fieldLabelClass("maxSnoozes")}>{t("alarmEdit.maxSnoozes")}</Label>
         <Select value={String(maxSnoozes)} onValueChange={v => { detachProfileIfNeeded("maxSnoozes"); setMaxSnoozes(parseInt(v)); }}>
            <SelectTrigger className="h-12 rounded-xl bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-56 overflow-y-auto">
              <SelectItem value="-1">{t("alarmEdit.unlimited")}</SelectItem>
              {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
