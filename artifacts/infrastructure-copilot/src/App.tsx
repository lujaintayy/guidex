import { useState, useEffect } from "react";
import { Route, Switch, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";

// Pages
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ServersPage from "@/pages/servers/index";
import ServerDetailPage from "@/pages/servers/detail";
import DeploymentsPage from "@/pages/deployments/index";
import DeploymentDetailPage from "@/pages/deployments/detail";
import TemplatesPage from "@/pages/templates";
import MonitoringPage from "@/pages/monitoring";
import AiAssistantPage from "@/pages/ai-assistant";
import AuditLogsPage from "@/pages/audit-logs";
import DocumentsPage from "@/pages/documents";
import ReportsPage from "@/pages/reports";
import OrganizationPage from "@/pages/organization";
import GuideXPage from "@/pages/guidex";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
      <h1 className="text-6xl font-bold font-mono text-primary mb-4">404</h1>
      <p className="text-muted-foreground text-lg">Page not found</p>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("infra-theme") as "dark" | "light") ?? "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
    localStorage.setItem("infra-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AppShell theme={theme} onThemeToggle={toggleTheme}>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/servers/:id" component={ServerDetailPage} />
        <Route path="/servers" component={ServersPage} />
        <Route path="/deployments/:id" component={DeploymentDetailPage} />
        <Route path="/deployments" component={DeploymentsPage} />
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/monitoring" component={MonitoringPage} />
        <Route path="/ai" component={AiAssistantPage} />
        <Route path="/audit-logs" component={AuditLogsPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/organization" component={OrganizationPage} />
        <Route path="/guidex" component={GuideXPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
