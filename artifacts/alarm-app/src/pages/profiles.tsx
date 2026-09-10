import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlarmInput, Profile, ProfileInput, useListAlarms, useListProfiles, useCreateProfile, useUpdateAlarm, useUpdateProfile,
  useDeleteProfile, getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { playRingtonePreview } from "@/hooks/use-alarm-audio";
import { HelpButton } from "@/components/program-help";

const RINGTONES = ["Sveglia classica", "Campanelli", "Melodia mattutina", "Digitale", "Natura", "Gallo", "Sirena dolce", "Carillon"];
const SNOOZES = [10, 300, 600, 900, 1800, 3600, 7200, 10800, 14400, 18000, 21600, 25200, 28800];
const empty = { name: "", isDefault: false, autoDelete: null, ringtone: null, volume: null, gradualVolume: null, vibration: null, autoSnooze: null, maxSnoozes: null } satisfies ProfileInput;

function OptionalSelect({ value, onChange, children }: { value: string | null | undefined; onChange: (value: string | null) => void; children: React.ReactNode }) {
  return <Select value={value ?? "unset"} onValueChange={v => onChange(v === "unset" ? null : v)}><SelectTrigger className="h-11 rounded-xl bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">Non impostato</SelectItem>{children}</SelectContent></Select>;
}

export default function ProfilesPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: profiles = [], isLoading } = useListProfiles();
  const { data: alarms = [] } = useListAlarms();
  const create = useCreateProfile();
  const update = useUpdateProfile();
  const updateAlarm = useUpdateAlarm();
  const remove = useDeleteProfile();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileInput>(empty);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedAlarmIds, setSelectedAlarmIds] = useState<number[]>([]);
  const [pendingData, setPendingData] = useState<ProfileInput | null>(null);

  useEffect(() => {
    if (editing) setForm({ name: editing.name, isDefault: editing.isDefault ?? false, autoDelete: editing.autoDelete ?? null, ringtone: editing.ringtone ?? null, volume: editing.volume ?? null, gradualVolume: editing.gradualVolume ?? null, vibration: editing.vibration ?? null, autoSnooze: editing.autoSnooze ?? null, maxSnoozes: editing.maxSnoozes ?? null });
  }, [editing]);

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const finishProfileSave = (data: ProfileInput) => {
    if (!editing?.id) {
      create.mutate({ data }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() }); setEditing(null); } });
      return;
    }
    update.mutate({ id: editing.id, data }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() }); setEditing(null); },
    });
  };

  const save = () => {
    if (!form.name.trim()) return;
    const data = { ...form, name: form.name.trim() };
    const linked = editing?.id ? alarms.filter(alarm => alarm.profileId === editing.id) : [];
    if (linked.length > 0) {
      setPendingData(data);
      setSelectedAlarmIds(linked.map(alarm => alarm.id));
      setConfirmOpen(true);
      return;
    }
    finishProfileSave(data);
  };

  const toggleAlarm = (id: number) => setSelectedAlarmIds(ids => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]);

  const confirmProfileSave = async () => {
    if (!pendingData || !editing?.id) return;
    const linked = alarms.filter(alarm => alarm.profileId === editing.id);
    const selected = new Set(selectedAlarmIds);
    try {
      await update.mutateAsync({ id: editing.id, data: pendingData });
      await Promise.all(linked.map(alarm => {
        const next: AlarmInput = {
          name: alarm.name, enabled: alarm.enabled, hour: alarm.hour, minute: alarm.minute,
          alarmType: alarm.alarmType, specificDates: alarm.specificDates, weekDays: alarm.weekDays,
          autoDelete: selected.has(alarm.id) && pendingData.autoDelete != null ? pendingData.autoDelete : alarm.autoDelete,
          ringtone: selected.has(alarm.id) && pendingData.ringtone != null ? pendingData.ringtone : alarm.ringtone,
          volume: selected.has(alarm.id) && pendingData.volume != null ? pendingData.volume : alarm.volume,
          gradualVolume: selected.has(alarm.id) && pendingData.gradualVolume != null ? pendingData.gradualVolume : alarm.gradualVolume,
          vibration: selected.has(alarm.id) && pendingData.vibration != null ? pendingData.vibration : alarm.vibration,
          autoSnooze: selected.has(alarm.id) && pendingData.autoSnooze != null ? pendingData.autoSnooze : alarm.autoSnooze,
          maxSnoozes: selected.has(alarm.id) && pendingData.maxSnoozes != null ? pendingData.maxSnoozes : alarm.maxSnoozes,
          skippedDates: alarm.skippedDates, personalTimeKey: alarm.personalTimeKey,
          iconName: alarm.iconName, profileId: selected.has(alarm.id) ? editing.id : null,
        };
        return updateAlarm.mutateAsync({ id: alarm.id, data: next });
      }));
      await queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: ["/api/alarms"] });
      setConfirmOpen(false);
      setPendingData(null);
      setEditing(null);
    } catch {
      // Keep the confirmation dialog open so the operator can retry.
    }
  };
  const fmt = (seconds: number | null | undefined) => seconds == null ? t("profiles.unset") : seconds < 60 ? `${seconds}s` : `${seconds / 60} min`;

  if (editing) return <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-3 duration-300">
     <div className="flex items-center gap-3 px-2"><Button variant="ghost" size="icon" onClick={() => setEditing(null)}><ArrowLeft className="w-5 h-5" /></Button><div className="flex items-start gap-2"><h1 className="text-3xl font-bold">{editing.id ? t("profiles.title") : t("profiles.new")}</h1><HelpButton screen="profileEdit" /></div><Button className="ml-auto" onClick={save} disabled={!form.name.trim() || create.isPending || update.isPending}><Check className="mr-2 h-4 w-4" />{t("profiles.save")}</Button></div>
    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm space-y-7">
       <div className="space-y-2"><Label>{t("profiles.name")}</Label><Input className="h-12 rounded-xl bg-background text-lg" value={form.name} onChange={e => set("name", e.target.value)} placeholder={t("profiles.namePlaceholder")} /></div>
       <div className="flex items-center justify-between rounded-xl border border-border/60 p-4"><div><Label>{t("profiles.default")}</Label><p className="text-xs text-muted-foreground">{t("profiles.defaultDescription")}</p></div><Switch checked={form.isDefault ?? false} onCheckedChange={value => set("isDefault", value)} /></div>
      <div className="flex items-center justify-between"><Label>{t("profiles.autoDelete")}</Label><OptionalSelect value={form.autoDelete == null ? null : String(form.autoDelete)} onChange={v => set("autoDelete", v == null ? null : v === "true")}><SelectItem value="true">Sì</SelectItem><SelectItem value="false">No</SelectItem></OptionalSelect></div>
      <div className="border-t border-border/60 pt-6 space-y-5"><h2 className="font-bold flex items-center gap-2"><Volume2 className="w-5 h-5 text-primary" />{t("profiles.soundVibration")}</h2>
        <div className="space-y-2"><Label>{t("profiles.ringtone")}</Label><OptionalSelect value={form.ringtone} onChange={v => set("ringtone", v)}>{RINGTONES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</OptionalSelect></div>
        <div className="space-y-2"><Label>{t("profiles.volume")}</Label><div className="flex items-center gap-3"><VolumeX className="w-4 h-4 text-muted-foreground" /><Slider value={[form.volume ?? 50]} onValueChange={v => set("volume", v[0])} max={100} /><span className="w-10 text-right text-sm">{form.volume == null ? "—" : `${form.volume}%`}</span></div><Button variant="ghost" size="sm" onClick={() => set("volume", null)}>{t("profiles.unset")}</Button></div>
        <div className="space-y-2"><Label>{t("profiles.gradualVolume")}</Label><OptionalSelect value={form.gradualVolume == null ? null : String(form.gradualVolume)} onChange={v => set("gradualVolume", v == null ? null : Number(v))}>{[0, 5, 10, 15, 30, 60].map(n => <SelectItem key={n} value={String(n)}>{n === 0 ? t("alarmEdit.disabled") : fmt(n)}</SelectItem>)}</OptionalSelect></div>
        <div className="space-y-2"><Label>{t("profiles.vibration")}</Label><OptionalSelect value={form.vibration} onChange={v => set("vibration", v as ProfileInput["vibration"])}><SelectItem value="off">{t("profiles.vibrationOff")}</SelectItem><SelectItem value="on">{t("profiles.vibrationOn")}</SelectItem><SelectItem value="only">{t("profiles.vibrationOnly")}</SelectItem></OptionalSelect></div>
      </div>
      <div className="border-t border-border/60 pt-6 space-y-5"><h2 className="font-bold">{t("profiles.snooze")}</h2><div className="space-y-2"><Label>{t("profiles.autoSnooze")}</Label><OptionalSelect value={form.autoSnooze == null ? null : String(form.autoSnooze)} onChange={v => set("autoSnooze", v == null ? null : Number(v))}>{SNOOZES.map(n => <SelectItem key={n} value={String(n)}>{fmt(n)}</SelectItem>)}</OptionalSelect></div><div className="space-y-2"><Label>{t("profiles.maxSnoozes")}</Label><OptionalSelect value={form.maxSnoozes == null ? null : String(form.maxSnoozes)} onChange={v => set("maxSnoozes", v == null ? null : Number(v))}><SelectItem value="-1">{t("profiles.unlimited")}</SelectItem>{Array.from({ length: 20 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}</OptionalSelect></div></div>
    </div>
       <Dialog open={confirmOpen} onOpenChange={open => { if (!open) { setConfirmOpen(false); setPendingData(null); } }}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>{t("profiles.applyTitle")}</DialogTitle>
             <DialogDescription>{t("profiles.applyDescription")}</DialogDescription>
           </DialogHeader>
           <div className="max-h-64 space-y-3 overflow-y-auto py-2">
             {alarms.filter(alarm => alarm.profileId === editing.id).map(alarm => (
               <label key={alarm.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
                 <Checkbox checked={selectedAlarmIds.includes(alarm.id)} onCheckedChange={() => toggleAlarm(alarm.id)} />
                 <span className="flex-1">{alarm.name}</span>
                 <span className="text-sm text-muted-foreground">{String(alarm.hour).padStart(2, "0")}:{String(alarm.minute).padStart(2, "0")}</span>
               </label>
             ))}
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => { setConfirmOpen(false); setPendingData(null); }}>{t("profiles.cancel")}</Button>
             <Button onClick={confirmProfileSave} disabled={update.isPending || updateAlarm.isPending}>{t("profiles.confirm")}</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>;

   return <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-3 duration-300"><div className="flex items-center px-2"><div className="flex items-start gap-2"><h1 className="text-3xl font-bold">{t("profiles.title")}</h1><HelpButton screen="profilesList" /></div><Button className="ml-auto" onClick={() => { setForm(empty); setEditing({ id: 0, name: "", isDefault: false, createdAt: "", updatedAt: "" }); }}><Plus className="mr-2 h-4 w-4" />{t("profiles.new")}</Button></div>{isLoading ? <div className="h-32 rounded-3xl bg-card animate-pulse" /> : profiles.length === 0 ? <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl">{t("profiles.empty")}</div> : <div className="space-y-3">{[...profiles].sort((a, b) => a.name.localeCompare(b.name)).map(profile => <div key={profile.id} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3"><button className="flex-1 text-left font-semibold hover:text-primary" onClick={() => setEditing(profile)}>{profile.isDefault ? <><span className="text-orange-400">(default)</span>{" "}</> : null}{profile.name}</button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate({ id: profile.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() }) })}><Trash2 className="w-4 h-4" /></Button></div>)}</div>}</div>;
}