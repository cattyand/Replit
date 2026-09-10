import type { SVGProps, ComponentType } from "react";
import {
  AlarmClock, Bell, BellRing, CalendarDays, BriefcaseBusiness, Coffee, Dumbbell,
  Heart, Home, Laptop, Music, Moon, PawPrint, Plane, School, ShoppingBag,
  Star, Sun, Utensils, Bus, Car, BookOpen, Baby, Cake, Church, CloudSun,
  Gamepad2, Gift, Guitar, Headphones, Leaf, LockKeyhole, MapPin, Phone,
  Pill, Rocket, ShieldCheck, Sparkles, Target, Waves, Zap,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;
type IconComponent = ComponentType<IconProps>;

export const ALARM_ICON_OPTIONS: { name: string; label: string }[] = [
  ["alarm-clock", "Sveglia"], ["bell", "Campanella"], ["bell-ring", "Campanella attiva"],
  ["calendar", "Calendario"], ["briefcase", "Lavoro"], ["coffee", "Caffè"],
  ["dumbbell", "Sport"], ["heart", "Salute"], ["home", "Casa"], ["laptop", "Computer"],
  ["music", "Musica"], ["moon", "Notte"], ["paw", "Animali"], ["plane", "Viaggio"],
  ["school", "Scuola"], ["shopping", "Spesa"], ["star", "Preferito"], ["sun", "Mattina"],
  ["utensils", "Pasto"], ["bus", "Autobus"], ["car", "Auto"], ["book", "Studio"],
  ["baby", "Bambino"], ["cake", "Compleanno"], ["church", "Appuntamento"],
  ["cloud-sun", "Meteo"], ["gamepad", "Gioco"], ["gift", "Regalo"], ["guitar", "Chitarra"],
  ["headphones", "Audio"], ["leaf", "Natura"], ["lock", "Sicurezza"], ["map-pin", "Luogo"],
  ["phone", "Telefono"], ["pill", "Farmaci"], ["rocket", "Progetto"], ["shield", "Protezione"],
  ["sparkles", "Speciale"], ["target", "Obiettivo"], ["waves", "Relax"], ["zap", "Energia"],
].map(([name, label]) => ({ name, label }));

const ICONS: Record<string, IconComponent> = {
  "alarm-clock": AlarmClock, bell: Bell, "bell-ring": BellRing, calendar: CalendarDays,
  briefcase: BriefcaseBusiness, coffee: Coffee, dumbbell: Dumbbell, heart: Heart, home: Home,
  laptop: Laptop, music: Music, moon: Moon, paw: PawPrint, plane: Plane, school: School,
  shopping: ShoppingBag, star: Star, sun: Sun, utensils: Utensils, bus: Bus, car: Car,
  book: BookOpen, baby: Baby, cake: Cake, church: Church, "cloud-sun": CloudSun,
  gamepad: Gamepad2, gift: Gift, guitar: Guitar, headphones: Headphones, leaf: Leaf,
  lock: LockKeyhole, "map-pin": MapPin, phone: Phone, pill: Pill, rocket: Rocket,
  shield: ShieldCheck, sparkles: Sparkles, target: Target, waves: Waves, zap: Zap,
};

export function AlarmIcon({ name, ...props }: { name?: string } & IconProps) {
  const Icon = ICONS[name || "alarm-clock"] || AlarmClock;
  return <Icon aria-hidden="true" {...props} />;
}