import { useState as useReactState, useEffect as useReactEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import {
  useGetSettings, useUpdateSettings,
  useListBackups, useCreateBackup, useRestoreBackup, useDeleteBackup,
  getGetSettingsQueryKey, getListBackupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Save, Download, HardDrive, ShieldCheck, Clock, User, CheckCircle2, Globe, Trash2, Check, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import i18n, { SUPPORTED_LANGUAGES, NATIVE_NAMES, type SupportedLanguage } from "@/i18n";
import { HelpButton, rebuildHelpCatalog } from "@/components/program-help";

const PERSONAL_TIME_FIELDS = [
  { key: "wakeup",    tKey: "settings.wakeup",    labelField: "wakeupLabel"    as const, colorField: "wakeupColor"    as const },
  { key: "workStart", tKey: "settings.workStart",  labelField: "workStartLabel" as const, colorField: "workStartColor" as const },
  { key: "lunch",     tKey: "settings.lunch",      labelField: "lunchLabel"     as const, colorField: "lunchColor"     as const },
  { key: "workEnd",   tKey: "settings.workEnd",    labelField: "workEndLabel"   as const, colorField: "workEndColor"   as const },
  { key: "dinner",    tKey: "settings.dinner",     labelField: "dinnerLabel"    as const, colorField: "dinnerColor"    as const },
  { key: "sleep",     tKey: "settings.sleep",      labelField: "sleepLabel"     as const, colorField: "sleepColor"     as const },
] as const;

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145;
}

const COLOR_PALETTE: { hex: string; label: string }[] = [
  { hex: "#ffffff", label: "Bianco"  },
  { hex: "#60a5fa", label: "Azzurro" },
  { hex: "#22c55e", label: "Verde"   },
  { hex: "#facc15", label: "Giallo"  },
  { hex: "#f472b6", label: "Rosa"    },
  { hex: "#ef4444", label: "Rosso"   },
  { hex: "#a855f7", label: "Viola"   },
  { hex: "#92400e", label: "Marrone" },
  { hex: "#18181b", label: "Nero"    },
];

type PersonalTimeKey = typeof PERSONAL_TIME_FIELDS[number]["key"];

function hourKey(k: PersonalTimeKey) { return `${k}Hour` as const; }
function minuteKey(k: PersonalTimeKey) { return `${k}Minute` as const; }

function TimeInput({
  hour, minute, onChange,
}: {
  hour: number | null;
  minute: number | null;
  onChange: (h: number | null, m: number | null) => void;
}) {
  const isSet = hour !== null && minute !== null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-background rounded-xl border border-border/50 px-3 h-11 flex-1">
        <input
          type="number" min="0" max="23"
          value={isSet ? String(hour).padStart(2, "0") : ""}
          placeholder="--"
          onChange={e => {
            const v = e.target.value === "" ? null : Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
            onChange(v, minute);
          }}
          className="bg-transparent w-full text-center text-base font-mono outline-none"
        />
        <span className="text-muted-foreground mx-1">:</span>
        <input
          type="number" min="0" max="59"
          value={isSet ? String(minute).padStart(2, "0") : ""}
          placeholder="--"
          onChange={e => {
            const v = e.target.value === "" ? null : Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
            onChange(hour, v);
          }}
          className="bg-transparent w-full text-center text-base font-mono outline-none"
        />
      </div>
      {isSet && (
        <Button variant="ghost" size="sm" className="h-11 px-3 text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null, null)}>
          ✕
        </Button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const { data: backups, isLoading: isLoadingBackups } = useListBackups();

  const updateSettings = useUpdateSettings();
  const createBackup   = useCreateBackup();
  const restoreBackup  = useRestoreBackup();
  const deleteBackup   = useDeleteBackup();

  const [langCode,      setLangCode]      = useReactState<string>("auto");
  const [autoBackup,    setAutoBackup]    = useReactState(false);
  const [backupHour,    setBackupHour]    = useReactState(20);
  const [backupMinute,  setBackupMinute]  = useReactState(0);
  const [retentionDays, setRetentionDays] = useReactState(7);
  const [sortOrder, setSortOrder] = useReactState<"activation" | "name" | "personalTimes">("activation");

  const [personalTimes, setPersonalTimes] = useReactState<
    Record<PersonalTimeKey, { hour: number | null; minute: number | null }>
  >({
    wakeup:    { hour: null, minute: null },
    workStart: { hour: null, minute: null },
    lunch:     { hour: null, minute: null },
    workEnd:   { hour: null, minute: null },
    dinner:    { hour: null, minute: null },
    sleep:     { hour: null, minute: null },
  });

  const [personalLabels, setPersonalLabels] = useReactState<Record<PersonalTimeKey, string>>({
    wakeup: "", workStart: "", lunch: "", workEnd: "", dinner: "", sleep: "",
  });

  const [personalColors, setPersonalColors] = useReactState<Record<PersonalTimeKey, string>>({
    wakeup: "", workStart: "", lunch: "", workEnd: "", dinner: "", sleep: "",
  });

  useReactEffect(() => {
    if (settings) {
      setLangCode(settings.languageCode ?? "auto");
      setAutoBackup(settings.autoBackup);
      setBackupHour(settings.backupHour);
      setBackupMinute(settings.backupMinute);
      setRetentionDays(settings.backupRetentionDays);
      setSortOrder((settings.sortOrder as "activation" | "name" | "personalTimes") ?? "activation");
      setPersonalTimes({
        wakeup:    { hour: settings.wakeupHour    ?? null, minute: settings.wakeupMinute    ?? null },
        workStart: { hour: settings.workStartHour ?? null, minute: settings.workStartMinute ?? null },
        lunch:     { hour: settings.lunchHour     ?? null, minute: settings.lunchMinute     ?? null },
        workEnd:   { hour: settings.workEndHour   ?? null, minute: settings.workEndMinute   ?? null },
        dinner:    { hour: settings.dinnerHour    ?? null, minute: settings.dinnerMinute    ?? null },
        sleep:     { hour: settings.sleepHour     ?? null, minute: settings.sleepMinute     ?? null },
      });
      setPersonalLabels({
        wakeup:    settings.wakeupLabel    ?? "",
        workStart: settings.workStartLabel ?? "",
        lunch:     settings.lunchLabel     ?? "",
        workEnd:   settings.workEndLabel   ?? "",
        dinner:    settings.dinnerLabel    ?? "",
        sleep:     settings.sleepLabel     ?? "",
      });
      setPersonalColors({
        wakeup:    settings.wakeupColor    ?? "",
        workStart: settings.workStartColor ?? "",
        lunch:     settings.lunchColor     ?? "",
        workEnd:   settings.workEndColor   ?? "",
        dinner:    settings.dinnerColor    ?? "",
        sleep:     settings.sleepColor     ?? "",
      });
    }
  }, [settings]);

  const handleLanguageChange = (code: string) => {
    setLangCode(code);
    if (code === "auto") {
      const browserLang = navigator.language.split("-")[0];
      const lang = SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage) ? browserLang : "it";
      i18n.changeLanguage(lang);
    } else {
      i18n.changeLanguage(code);
    }
    localStorage.setItem("alarm_app_language", code);
  };

  const handleSaveAll = () => {
    updateSettings.mutate({
      data: {
        languageCode:       langCode === "auto" ? null : langCode,
        autoBackup,
        backupHour,
        backupMinute,
        backupRetentionDays: retentionDays,
        sortOrder,
        wakeupHour:          personalTimes.wakeup.hour,
        wakeupMinute:        personalTimes.wakeup.minute,
        workStartHour:       personalTimes.workStart.hour,
        workStartMinute:     personalTimes.workStart.minute,
        lunchHour:           personalTimes.lunch.hour,
        lunchMinute:         personalTimes.lunch.minute,
        workEndHour:         personalTimes.workEnd.hour,
        workEndMinute:       personalTimes.workEnd.minute,
        dinnerHour:          personalTimes.dinner.hour,
        dinnerMinute:        personalTimes.dinner.minute,
        sleepHour:           personalTimes.sleep.hour,
        sleepMinute:         personalTimes.sleep.minute,
        wakeupLabel:         personalLabels.wakeup    || null,
        workStartLabel:      personalLabels.workStart || null,
        lunchLabel:          personalLabels.lunch     || null,
        workEndLabel:        personalLabels.workEnd   || null,
        dinnerLabel:         personalLabels.dinner    || null,
        sleepLabel:          personalLabels.sleep     || null,
        wakeupColor:         personalColors.wakeup    || null,
        workStartColor:      personalColors.workStart || null,
        lunchColor:          personalColors.lunch     || null,
        workEndColor:        personalColors.workEnd   || null,
        dinnerColor:         personalColors.dinner    || null,
        sleepColor:          personalColors.sleep     || null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: t("settings.savedToast"), description: t("settings.savedToastDesc") });
      }
    });
  };

  const handleCreateBackup = () => {
    createBackup.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBackupsQueryKey() });
        toast({ title: t("settings.backupCreated"), description: t("settings.backupCreatedDesc") });
      }
    });
  };

  const handleRestore = (id: number) => {
    restoreBackup.mutate({ id }, {
      onSuccess: () => {
        toast({ title: t("settings.backupRestored"), description: t("settings.backupRestoredDesc") });
      }
    });
  };

  const handleDeleteBackup = (id: number) => {
    deleteBackup.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBackupsQueryKey() });
        toast({ title: t("settings.deleteBackup"), description: t("settings.backupDeletedDesc") });
      }
    });
  };

  const handleRebuildHelp = () => {
    const languageCount = rebuildHelpCatalog();
    toast({
      title: "Help ricostruito",
      description: `Help aggiornato in ${languageCount} lingue supportate.`,
    });
  };

  if (isLoadingSettings) {
    return <div className="space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
       <div className="flex items-center gap-3 px-2">
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
          <HelpButton screen="settings" />
        </div>
         <div className="ml-auto flex items-center gap-2">
           {import.meta.env.DEV && (
             <Button
               onClick={handleRebuildHelp}
               size="sm"
               className="bg-orange-500 text-white hover:bg-orange-400"
             >
               Ricostruisci Help
             </Button>
           )}
         </div>
      </div>

      {/* ── Lingua ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> {t("settings.language")}
        </h2>
        <Select value={langCode} onValueChange={handleLanguageChange}>
          <SelectTrigger className="h-12 rounded-xl bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("settings.deviceLanguage")}</SelectItem>
            {SUPPORTED_LANGUAGES.map(code => (
              <SelectItem key={code} value={code}>
                {t(`settings.languageNames.${code}`)} ({NATIVE_NAMES[code]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Ordinamento Sveglie ────────────────────────────────────── */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" /> {t("settings.sortOrder")}
          </h2>
          <Button onClick={handleSaveAll} disabled={updateSettings.isPending} size="sm" variant="secondary">
            {t("settings.save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {t("settings.sortOrderDesc")}
        </p>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as typeof sortOrder)}>
          <SelectTrigger className="h-12 rounded-xl bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activation">{t("settings.sortOrderActivation")}</SelectItem>
            <SelectItem value="name">{t("settings.sortOrderName")}</SelectItem>
            <SelectItem value="personalTimes">{t("settings.sortOrderPersonalTimes")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Orari Personali ─────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> {t("settings.personalTimes")}
          </h2>
          <Button onClick={handleSaveAll} disabled={updateSettings.isPending} size="sm" variant="secondary">
            {t("settings.save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {t("settings.personalTimesDesc")}
        </p>
        <div className="space-y-5">
          {PERSONAL_TIME_FIELDS.map(({ key, tKey }) => (
            <div key={key} className="space-y-2">
              {/* Custom label input */}
              <Input
                value={personalLabels[key]}
                onChange={e => setPersonalLabels(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={t(tKey)}
                className="h-9 rounded-xl bg-background border-border/50 text-sm"
              />
              {/* Time input */}
              <TimeInput
                hour={personalTimes[key].hour}
                minute={personalTimes[key].minute}
                onChange={(h, m) =>
                  setPersonalTimes(prev => ({ ...prev, [key]: { hour: h, minute: m } }))
                }
              />
              {/* Color picker */}
              <div className="space-y-2 pt-0.5">
                {/* Anteprima colore selezionato */}
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-xs text-muted-foreground shrink-0">Colore:</span>
                  {personalColors[key] ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: personalColors[key] + "30",
                        borderColor:     personalColors[key] + "70",
                        color:           personalColors[key],
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full inline-block border border-white/20 shrink-0"
                        style={{ backgroundColor: personalColors[key] }}
                      />
                      {COLOR_PALETTE.find(c => c.hex === personalColors[key])?.label ?? personalColors[key]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/40 text-muted-foreground bg-muted/40">
                      Nessun colore
                    </span>
                  )}
                </div>
                {/* Palette */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonalColors(prev => ({ ...prev, [key]: "" }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      !personalColors[key]
                        ? "border-foreground scale-110 shadow-sm"
                        : "border-border/50 hover:border-border"
                    } bg-muted flex items-center justify-center text-[11px] text-muted-foreground`}
                    title="Nessun colore"
                  >✕</button>
                  {COLOR_PALETTE.map(({ hex, label }) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setPersonalColors(prev => ({ ...prev, [key]: hex }))}
                      className={`relative w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                        personalColors[key] === hex
                          ? "border-foreground scale-110 shadow-md"
                          : "border-border/40 hover:scale-105 hover:border-border/70"
                      }`}
                      style={{ backgroundColor: hex }}
                      title={label}
                    >
                      {personalColors[key] === hex && (
                        <Check
                          className="w-3.5 h-3.5 shrink-0"
                          strokeWidth={3}
                          style={{ color: isLightColor(hex) ? "#000000" : "#ffffff" }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Backup Automatico ────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> {t("settings.autoBackup")}
          </h2>
          <Button onClick={handleSaveAll} disabled={updateSettings.isPending} size="sm" variant="secondary">
            {t("settings.save")}
          </Button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-background p-4 rounded-xl border border-border/50">
            <div className="space-y-0.5">
              <Label className="text-base">{t("settings.enableCloud")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.enableCloudDesc")}</p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>
          {autoBackup && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-muted-foreground">{t("settings.backupTime")}</Label>
                <div className="flex items-center bg-background rounded-xl border border-border/50 px-3 h-12">
                  <input type="number" min="0" max="23"
                    value={String(backupHour).padStart(2, "0")}
                    onChange={e => setBackupHour(parseInt(e.target.value) || 0)}
                    className="bg-transparent w-full text-center text-lg font-mono outline-none"
                  />
                  <span className="text-muted-foreground">:</span>
                  <input type="number" min="0" max="59"
                    value={String(backupMinute).padStart(2, "0")}
                    onChange={e => setBackupMinute(parseInt(e.target.value) || 0)}
                    className="bg-transparent w-full text-center text-lg font-mono outline-none"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-muted-foreground">{t("settings.retentionDays")}</Label>
                <Select value={String(retentionDays)} onValueChange={v => setRetentionDays(parseInt(v))}>
                  <SelectTrigger className="h-12 rounded-xl bg-background border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 7, 14, 30].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {t("settings.day", { count: n })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Gestione Backup ──────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" /> {t("settings.backupManagement")}
          </h2>
          <Button onClick={handleCreateBackup} disabled={createBackup.isPending} size="sm" className="gap-2">
            <Save className="w-4 h-4" /> {t("settings.createNow")}
          </Button>
        </div>
        <div className="space-y-3">
          {isLoadingBackups ? (
            <Skeleton className="h-20 w-full" />
          ) : !backups || backups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              {t("settings.noBackups")}
            </div>
          ) : (
            backups.map(backup => {
              const dateStr = format(new Date(backup.createdAt), "dd MMM yyyy, HH:mm", { locale: dateLocale });
              const dateLabelStr = format(new Date(backup.createdAt), "dd MMM yyyy", { locale: dateLocale });
              return (
                <div key={backup.id} className="flex items-center justify-between bg-background p-4 rounded-xl border border-border/50 group hover:border-primary/30 transition-colors gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{dateStr}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("settings.backupAlarmCount", { count: backup.alarmCount })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Restore */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3">
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t("settings.restore")}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("settings.restoreTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("settings.restoreDesc", { date: dateLabelStr })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("settings.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestore(backup.id)} className="gap-2">
                            <CheckCircle2 className="w-4 h-4" /> {t("settings.confirmRestore")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("settings.deleteBackupTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("settings.deleteBackupDesc", { date: dateLabelStr })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("settings.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteBackup(backup.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" /> {t("settings.confirmDeleteBackup")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
