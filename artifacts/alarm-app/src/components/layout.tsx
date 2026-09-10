import { Link, useLocation } from "wouter";
import { Settings, Clock, Plus, AlarmClock } from "lucide-react";
import { Button } from "./ui/button";
import { useAlarmTrigger } from "@/hooks/use-alarm-trigger";
import { useTranslation } from "react-i18next";

function AlarmWatcher() {
  useAlarmTrigger();
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col pb-20">
      <AlarmWatcher />
      <main className="flex-1 w-full max-w-2xl mx-auto p-4 pt-8">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-xl z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-around p-3">
          <Link href="/" className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${location === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{t("nav.alarms")}</span>
          </Link>

          <div className="relative -top-6">
            <Link href="/alarm/new">
              <Button size="icon" className="w-14 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground">
                <Plus className="w-6 h-6" />
              </Button>
            </Link>
          </div>

          <Link href="/profiles" className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${location === "/profiles" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            <AlarmClock className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{t("nav.profiles")}</span>
          </Link>

          <Link href="/settings" className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${location === "/settings" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">{t("nav.settings")}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
