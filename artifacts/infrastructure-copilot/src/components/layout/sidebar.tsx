import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Server, Rocket, FileCode2, Activity,
  Bot, ScrollText, FileText, BarChart3, Users, Bell,
  ChevronLeft, ChevronRight, Moon, Sun, LogOut, Building2,
  ShieldCheck, Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useListNotifications } from "@workspace/api-client-react";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/servers", icon: Server, label: "Servers" },
  { href: "/deployments", icon: Rocket, label: "Deployments" },
  { href: "/templates", icon: FileCode2, label: "Templates" },
  { href: "/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/ai", icon: Bot, label: "AI Assistant" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/organization", icon: Users, label: "Organization" },
  { href: "/guidex", icon: Info, label: "GuideX" },
];

interface SidebarProps {
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export function Sidebar({ theme, onThemeToggle }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const { data: notifications } = useListNotifications();
  const notifs = notifications ?? MOCK_NOTIFICATIONS;
  const unread = notifs.filter((n: any) => !n.read).length;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <aside
      className={`flex flex-col h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      } shrink-0`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">GuideX</p>
            <p className="text-[10px] text-muted-foreground truncate">Enterprise</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          data-testid="btn-collapse-sidebar"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Org badge */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-sidebar-foreground truncate font-medium">My Organisation</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 scrollbar-thin">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${collapsed ? "justify-center" : ""}`}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : ""}`} />
                {!collapsed && <span className="text-sm truncate">{label}</span>}
                {!collapsed && label === "AI Assistant" && (
                  <span className="ml-auto text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">AI</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-1">
        <button
          onClick={onThemeToggle}
          className={`flex items-center gap-3 w-full px-2 py-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "justify-center" : ""}`}
          data-testid="btn-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span className="text-sm">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>

        {user && (
          <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">Engineer</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  data-testid="btn-logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
