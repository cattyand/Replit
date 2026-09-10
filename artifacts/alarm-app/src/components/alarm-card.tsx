import { useState, useEffect } from "react";
import { Alarm } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import {
  CalendarIcon,
  Clock,
  MoreVertical,
  Repeat,
  Trash2,
  Copy,
  SkipForward,
  SkipBack,
  Edit3,
  BellRing,
  AlarmClockCheck,
} from "lucide-react";
import { calculateNextActivation, formatTimeLeft } from "@/lib/date-utils";
import { getSnoozeState } from "@/lib/alarm-state";
import { AlarmIcon } from "@/components/alarm-icons";
import { Switch } from "./ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

export function AlarmCard({
  alarm,
  accentColor,
  personalTimeName,
  onToggle,
  onDelete,
  onSkip,
  onUnskip,
  onClone,
  onCloneOnce,
  onEdit,
  onActiveSimulate,
}: {
  alarm: Alarm;
  accentColor?: string | null;
  personalTimeName?: string | null;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onClone: () => void;
  onCloneOnce: () => void;
  onEdit: () => void;
  onActiveSimulate: () => void;
}) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const weekdays = t("alarmCard.weekdays", { returnObjects: true }) as string[];

  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const entry = getSnoozeState()[alarm.id];
      if (entry && Date.now() < entry.snoozedUntil) {
        setSnoozeUntil(entry.snoozedUntil);
      } else {
        setSnoozeUntil(null);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [alarm.id]);

  const isSnoozed = snoozeUntil !== null;
  const nextDate = isSnoozed
    ? new Date(snoozeUntil!)
    : calculateNextActivation(alarm);

  const isOnce   = alarm.alarmType === "once";
  const isWeekly = alarm.alarmType === "weekly";
  const isDates  = alarm.alarmType === "specific_dates";

  const cardClass = isSnoozed
    ? "bg-orange-950/30 border-orange-400/50 shadow-lg shadow-orange-900/10"
    : alarm.enabled
      ? "bg-card shadow-lg shadow-primary/5"
      : "bg-card/50 border-border/50 opacity-75 grayscale-[0.2]";

  const hasAccent = !isSnoozed && alarm.enabled && !!accentColor;
  const cardStyle = hasAccent
    ? { borderColor: accentColor + "90", backgroundColor: accentColor + "18", boxShadow: `0 4px 24px 0 ${accentColor}18` }
    : undefined;
  const borderClass = !isSnoozed && alarm.enabled && !accentColor ? "border-primary/20" : "";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${cardClass} ${borderClass}`}
      style={cardStyle}
    >
      {/* Personal time badge */}
      {personalTimeName && (
        <div
          className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl rounded-tr-3xl text-[10px] font-bold uppercase tracking-widest"
          style={
            accentColor
              ? { backgroundColor: accentColor + "30", color: accentColor, borderLeft: `1px solid ${accentColor}40`, borderBottom: `1px solid ${accentColor}40` }
              : { backgroundColor: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))", borderLeft: "1px solid hsl(var(--primary) / 0.25)", borderBottom: "1px solid hsl(var(--primary) / 0.25)" }
          }
        >
          {personalTimeName}
        </div>
      )}

      <div className="p-3">

        {/* ── Row 1: name ── */}
        <div className="w-full mb-1 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                alarm.enabled ? "border-primary/20 bg-primary/10 text-primary" : "border-border/50 bg-muted/50 text-muted-foreground"
              }`}
              aria-label={t("alarmCard.icon")}
            >
              <AlarmIcon name={alarm.iconName || "alarm-clock"} className="h-3.5 w-3.5" />
            </div>
            <span className="min-w-0 flex-1 text-lg font-bold tracking-tight leading-tight text-orange-400">
              {alarm.name}
            </span>
          </div>
          {isSnoozed && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-400/80">
              <AlarmClockCheck className="w-3 h-3" />
              {t("alarmCard.snoozed")}
            </span>
          )}
        </div>

        {/* ── Row 2: time + switch + menu ── */}
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={`text-xl font-mono tracking-tight font-light cursor-pointer ${
              alarm.enabled ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={onEdit}
          >
            {String(alarm.hour).padStart(2, "0")}:{String(alarm.minute).padStart(2, "0")}
          </span>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Switch
              checked={alarm.enabled}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-primary"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-card/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" />{t("alarmCard.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onClone} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />{t("alarmCard.clone")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCloneOnce} className="cursor-pointer">
                  <Copy className="mr-2 h-4 w-4 text-primary" />{t("alarmCard.cloneOnce")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onActiveSimulate} className="cursor-pointer">
                  <BellRing className="mr-2 h-4 w-4 text-primary" />{t("alarmCard.simulateSound")}
                </DropdownMenuItem>
                {alarm.enabled && (isWeekly || isDates) && (
                  <DropdownMenuItem onClick={onSkip} className="cursor-pointer">
                    <SkipForward className="mr-2 h-4 w-4" />{t("alarmCard.skipNext")}
                  </DropdownMenuItem>
                )}
                {(isWeekly || isDates) && (
                  <DropdownMenuItem
                    onClick={onUnskip}
                    disabled={(alarm.skippedDates?.length ?? 0) === 0}
                    className="cursor-pointer"
                  >
                    <SkipBack className="mr-2 h-4 w-4" />{t("alarmCard.revertOccurrence")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={e => e.preventDefault()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />{t("alarmCard.delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("alarmCard.deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("alarmCard.deleteDesc")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("alarmCard.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("alarmCard.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Row 3: next activation ── */}
        {alarm.enabled && nextDate && (
          <span
            className={`text-xs font-medium block mb-1.5 cursor-pointer ${
              isSnoozed ? "text-orange-400/80" : "text-primary/80"
            }`}
            onClick={onEdit}
          >
            {isSnoozed ? `${t("alarmCard.ringsAt")} ` : ""}
            {formatTimeLeft(nextDate)}{" "}
            ({format(nextDate, "EEE d MMM HH:mm", { locale: dateLocale })})
          </span>
        )}

        {/* ── Row 4: type info ── */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {isOnce && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{t("alarmCard.once")}</span>
            </div>
          )}
          {isDates && (
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>{t("alarmCard.specificDates", { count: alarm.specificDates?.length || 0 })}</span>
            </div>
          )}
          {isWeekly && (
            <div className="flex items-center gap-2 w-full">
              <Repeat className="w-4 h-4 shrink-0" />
              <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
                {weekdays.map((day, i) => {
                  const isActive = alarm.weekDays?.includes(i);
                  const isNext   = alarm.enabled && !isSnoozed && nextDate !== null && nextDate instanceof Date && nextDate.getDay() === i;
                  return (
                    <span
                      key={i}
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${
                        isNext
                          ? "bg-orange-500/20 text-orange-400"
                          : isActive
                            ? alarm.enabled
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                            : "text-muted-foreground/30"
                      }`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {alarm.autoDelete && (
            <div className="ml-auto flex items-center gap-1 text-[10px] uppercase font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
              <Trash2 className="w-3 h-3" />{t("alarmCard.autodel")}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
