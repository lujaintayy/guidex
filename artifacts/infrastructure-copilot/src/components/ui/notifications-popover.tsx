import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Server, Rocket, AlertTriangle, Info, X } from "lucide-react";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const ORG_ID = 1;

function notifIcon(type: string) {
  switch (type) {
    case "deployment_completed": return <Rocket className="w-3.5 h-3.5 text-emerald-400" />;
    case "deployment_failed":    return <Rocket className="w-3.5 h-3.5 text-destructive" />;
    case "approval_required":    return <CheckCheck className="w-3.5 h-3.5 text-amber-400" />;
    case "server_alert":         return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
    case "server_online":        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
    default:                     return <Info className="w-3.5 h-3.5 text-primary" />;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications, refetch } = useListNotifications();
  const notifs = (notifications ?? MOCK_NOTIFICATIONS) as any[];
  const unread = notifs.filter(n => !n.read).length;

  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  function handleMarkRead(notifId: number) {
    markRead.mutate(
      { notificationId: notifId },
      { onSuccess: () => refetch() },
    );
  }

  function handleMarkAll() {
    markAll.mutate(
      undefined,
      { onSuccess: () => refetch() },
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        data-testid="btn-notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unread > 0 && (
                <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
            {notifs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifs.map((n: any) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors group",
                    !n.read ? "bg-primary/[0.04] hover:bg-primary/[0.07]" : "hover:bg-muted/40",
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    !n.read ? "bg-primary/15" : "bg-muted",
                  )}>
                    {notifIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link href={n.link} onClick={() => { handleMarkRead(n.id); setOpen(false); }}>
                        <p className={cn(
                          "text-sm leading-snug cursor-pointer hover:text-primary transition-colors",
                          !n.read ? "text-foreground font-medium" : "text-muted-foreground",
                        )}>
                          {n.title}
                        </p>
                      </Link>
                    ) : (
                      <p className={cn(
                        "text-sm leading-snug",
                        !n.read ? "text-foreground font-medium" : "text-muted-foreground",
                      )}>
                        {n.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot + mark-read */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <p className="text-xs text-center text-muted-foreground">
                {notifs.length} total notification{notifs.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
