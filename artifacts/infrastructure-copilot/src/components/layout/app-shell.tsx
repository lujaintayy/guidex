import { type ReactNode } from "react";
import { Search } from "lucide-react";
import { Sidebar } from "./sidebar";
import { NotificationsPopover } from "@/components/ui/notifications-popover";

interface AppShellProps {
  children: ReactNode;
  theme: "dark" | "light";
  onThemeToggle: () => void;
}

export function AppShell({ children, theme, onThemeToggle }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar theme={theme} onThemeToggle={onThemeToggle} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search servers, deployments..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                data-testid="input-global-search"
              />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsPopover />
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
