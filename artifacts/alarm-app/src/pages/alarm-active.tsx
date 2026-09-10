import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useGetAlarm, useUpdateAlarm, useDeleteAlarm, useCloneAlarm, getGetAlarmQueryKey, getListAlarmsQueryKey } from "@workspace/api-client-react";
import { firedNormalThisMinute } from "@/hooks/use-alarm-trigger";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, BellOff, Clock, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { snoozeAlarm, clearSnooze, getSnoozeCount, incrementSnoozeCount, resetSnoozeCount } from "@/lib/alarm-state";
import { useAlarmAudio } from "@/hooks/use-alarm-audio";
import { useAlarmVibration } from "@/hooks/use-alarm-vibration";
import { HelpButton } from "@/components/program-help";

const SNOOZE_OPTION_KEYS = [
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

function formatCountdown(s: number): string {
  if (s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export default function AlarmActive() {
  const { t } = useTranslation();
  const params = useParams();
  const id = parseInt(params.id!);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: alarm } = useGetAlarm(id, {
    query: { enabled: !!id, queryKey: getGetAlarmQueryKey(id) },
  });

  const updateAlarm = useUpdateAlarm();
  const deleteAlarm = useDeleteAlarm();
  const cloneAlarm  = useCloneAlarm();

  const [timeStr, setTimeStr] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [autoSnoozeCountdown, setAutoSnoozeCountdown] = useState<number | null>(null);
  const autoSnoozeCancelledRef = useRef(false);

  const vibrationOnly = alarm?.vibration === "only";

  const { stopAudio, muteAudio } = useAlarmAudio({
    enabled:           !!alarm && !vibrationOnly,
    volume:            alarm?.volume          ?? 50,
    gradualVolumeSecs: alarm?.gradualVolume   ?? 0,
    ringtone:          alarm?.ringtone        ?? "Sveglia classica",
  });

  const { stopVibration } = useAlarmVibration({
    enabled:   !!alarm,
    vibration: alarm?.vibration ?? "off",
  });

  useEffect(() => { muteAudio(isMuted); }, [isMuted, muteAudio]);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (id) clearSnooze(id);
  }, [id]);

  useEffect(() => {
    if (!alarm || !alarm.autoSnooze || alarm.autoSnooze <= 0) return;

    const duration  = alarm.autoSnooze;
    const alarmId   = alarm.id;
    const maxCount  = alarm.maxSnoozes;

    const currentCount = getSnoozeCount(alarmId);
    const limitReached = maxCount !== -1 && currentCount >= maxCount;
    if (limitReached) return;

    autoSnoozeCancelledRef.current = false;
    setAutoSnoozeCountdown(duration);

    const countdownInterval = setInterval(() => {
      if (autoSnoozeCancelledRef.current) { clearInterval(countdownInterval); return; }
      setAutoSnoozeCountdown(prev => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);

    const autoSnoozeTimeout = setTimeout(() => {
      if (autoSnoozeCancelledRef.current) return;
      const countNow = getSnoozeCount(alarmId);
      const stillOk  = maxCount === -1 || countNow < maxCount;
      stopAudio();
      stopVibration();
      if (stillOk) {
        incrementSnoozeCount(alarmId);
        snoozeAlarm(alarmId, duration, true);
      }
      setLocation("/");
    }, duration * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(autoSnoozeTimeout);
    };
  }, [alarm?.id, alarm?.autoSnooze, alarm?.maxSnoozes]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelAutoSnooze = useCallback(() => {
    autoSnoozeCancelledRef.current = true;
    setAutoSnoozeCountdown(null);
  }, []);

  const buildAlarmInput = (overrides: Record<string, unknown> = {}) => ({
    name:           alarm!.name,
    enabled:        alarm!.enabled,
    hour:           alarm!.hour,
    minute:         alarm!.minute,
    alarmType:      alarm!.alarmType,
    autoDelete:     alarm!.autoDelete,
    ringtone:       alarm!.ringtone,
    volume:         alarm!.volume,
    gradualVolume:  alarm!.gradualVolume,
    vibration:      alarm!.vibration,
    autoSnooze:     alarm!.autoSnooze,
    maxSnoozes:     alarm!.maxSnoozes,
    weekDays:       alarm!.weekDays      ?? [],
    specificDates:  alarm!.specificDates ?? [],
    skippedDates:   alarm!.skippedDates  ?? [],
    ...overrides,
  });

  const handleDismiss = () => {
    cancelAutoSnooze();
    stopAudio();
    stopVibration();
    resetSnoozeCount(id);
    if (!alarm) { setLocation("/"); return; }

    if (alarm.alarmType === "once") {
      if (alarm.autoDelete) {
        deleteAlarm.mutate({ id }, {
          onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() }); setLocation("/"); },
          onError:   () => setLocation("/"),
        });
      } else {
        updateAlarm.mutate({ id, data: buildAlarmInput({ enabled: false }) as never }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAlarmQueryKey(id) });
            setLocation("/");
          },
          onError: () => setLocation("/"),
        });
      }
    } else {
      setLocation("/");
    }
  };

  const handleSnooze = (seconds: number) => {
    cancelAutoSnooze();
    stopAudio();
    stopVibration();
    incrementSnoozeCount(id);
    snoozeAlarm(id, seconds, false);
    setShowSnoozeMenu(false);
    setLocation("/");
  };

  const handleCloneOnce = () => {
    cancelAutoSnooze();
    stopAudio();
    stopVibration();
    resetSnoozeCount(id);
    if (!alarm) return;

    const cloneAsOnce = alarm.alarmType !== "once";

    const doClone = () => {
      cloneAlarm.mutate(
        {
          id,
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
          onError: () => setLocation("/"),
        }
      );
    };

    if (alarm.alarmType === "once") {
      if (alarm.autoDelete) {
        deleteAlarm.mutate({ id }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
            doClone();
          },
          onError: doClone,
        });
      } else {
        updateAlarm.mutate({ id, data: buildAlarmInput({ enabled: false }) as never }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAlarmQueryKey(id) });
            doClone();
          },
          onError: doClone,
        });
      }
    } else {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const currentSkipped = alarm.skippedDates ?? [];
      const updatedSkipped = currentSkipped.includes(todayStr)
        ? currentSkipped
        : [...currentSkipped, todayStr];

      updateAlarm.mutate({ id, data: buildAlarmInput({ skippedDates: updatedSkipped }) as never }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlarmsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAlarmQueryKey(id) });
          doClone();
        },
        onError: doClone,
      });
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
  };

  if (!alarm) return null;

  const maxLimitReached =
    alarm.maxSnoozes !== -1 && getSnoozeCount(id) >= alarm.maxSnoozes;
  const autoSnoozeProgress =
    !maxLimitReached && alarm.autoSnooze > 0 && autoSnoozeCountdown !== null
      ? (autoSnoozeCountdown / alarm.autoSnooze) * 100
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isMuted ? "opacity-0" : "opacity-100"}`}>
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: "radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)" }}
        />
      </div>

      {autoSnoozeProgress !== null && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted/40 z-20">
          <div
            className="h-full bg-orange-400/80 transition-all duration-1000 ease-linear"
            style={{ width: `${autoSnoozeProgress}%` }}
          />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm gap-8">
        <div className="text-center space-y-2">
          <BellRing className={`w-14 h-14 mx-auto text-primary ${isMuted ? "opacity-40" : "animate-bounce"}`} />
          <p className="text-lg font-medium text-orange-400">
            <span>{alarm.name}</span>
            <span className="ml-2 inline-flex align-super">
              <HelpButton screen="alarmActive" />
            </span>
          </p>
          <div className="text-8xl font-mono tracking-tighter font-light text-primary tabular-nums">
            {timeStr}
          </div>

          {maxLimitReached && (
            <p className="text-sm text-muted-foreground/60">
              {t("alarmActive.snoozeLimitReached", { current: alarm.maxSnoozes, max: alarm.maxSnoozes })}
            </p>
          )}

          {!maxLimitReached && autoSnoozeCountdown !== null && autoSnoozeCountdown > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("alarmActive.autoSnoozeIn")}{" "}
              <span className="font-bold text-orange-400">
                {formatCountdown(autoSnoozeCountdown)}
              </span>
              {alarm.maxSnoozes !== -1 && (
                <span className="ml-1 text-muted-foreground/60">
                  {t("alarmActive.snoozeProgress", { current: getSnoozeCount(id) + 1, max: alarm.maxSnoozes })}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 w-full gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-20 rounded-2xl flex flex-col gap-2 bg-card border-border/50 hover:border-primary/40 disabled:opacity-40"
            onClick={handleMuteToggle}
            disabled={vibrationOnly}
          >
            {vibrationOnly
              ? <BellOff className="w-6 h-6 text-muted-foreground" />
              : isMuted
                ? <BellOff className="w-6 h-6 text-muted-foreground" />
                : <BellRing className="w-6 h-6 text-primary" />}
            <span className="text-xs font-medium">
              {vibrationOnly
                ? t("alarmActive.vibrationOnly")
                : isMuted
                  ? t("alarmActive.unmute")
                  : t("alarmActive.mute")}
            </span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-20 rounded-2xl flex flex-col gap-2 bg-card border-border/50 hover:border-primary/40 disabled:opacity-40"
            onClick={() => { cancelAutoSnooze(); setShowSnoozeMenu(!showSnoozeMenu); }}
            disabled={maxLimitReached}
          >
            <Clock className={`w-6 h-6 ${maxLimitReached ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium">{t("alarmActive.snooze")}</span>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-20 rounded-2xl flex flex-col gap-2 bg-card border-border/50 hover:border-primary/40 col-span-2 disabled:opacity-40"
            onClick={handleCloneOnce}
            disabled={cloneAlarm.isPending || !!alarm.autoDelete}
          >
            <Copy className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs font-medium">{t("alarmActive.cloneOnce")}</span>
          </Button>
        </div>

        <Button
          size="lg"
          className="w-full h-20 rounded-3xl text-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          onClick={handleDismiss}
          disabled={updateAlarm.isPending || deleteAlarm.isPending}
        >
          {t("alarmActive.dismiss")}
        </Button>
      </div>

      {showSnoozeMenu && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSnoozeMenu(false)} />
          <div className="relative bg-card rounded-t-3xl w-full max-w-lg p-6 pb-10 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">{t("alarmActive.snoozeMenuTitle")}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSnoozeMenu(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SNOOZE_OPTION_KEYS.map(opt => (
                <button
                  key={opt.seconds}
                  className="py-3 px-2 rounded-xl bg-background border border-border text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                  onClick={() => handleSnooze(opt.seconds)}
                >
                  {t(`alarmActive.${opt.key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
