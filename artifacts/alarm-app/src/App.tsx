import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useGetSettings } from "@workspace/api-client-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Home from "@/pages/home";
import AlarmEdit from "@/pages/alarm-edit";
import SettingsPage from "@/pages/settings";
import AlarmActive from "@/pages/alarm-active";
import ProfilesPage from "@/pages/profiles";

const queryClient = new QueryClient();

function LanguageSync() {
  const { data: settings } = useGetSettings();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!settings?.languageCode) return;
    const code = settings.languageCode;
    if (!SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)) return;
    const stored = localStorage.getItem("alarm_app_language");
    if (!stored || stored === "auto") {
      i18n.changeLanguage(code);
      localStorage.setItem("alarm_app_language", code);
    }
  }, [settings?.languageCode, i18n]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Layout><Home /></Layout>} />
      <Route path="/alarm/new" component={() => <Layout><AlarmEdit /></Layout>} />
      <Route path="/alarm/:id/edit" component={() => <Layout><AlarmEdit /></Layout>} />
      <Route path="/settings" component={() => <Layout><SettingsPage /></Layout>} />
      <Route path="/profiles" component={() => <Layout><ProfilesPage /></Layout>} />
      <Route path="/alarm/:id/active" component={AlarmActive} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <LanguageSync />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
