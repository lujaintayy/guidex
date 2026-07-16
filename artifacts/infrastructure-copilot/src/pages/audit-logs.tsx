import { useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_COLORS: Record<string, string> = {
  server_registered: "bg-blue-400/10 text-blue-400",
  deployment_created: "bg-purple-400/10 text-purple-400",
  deployment_approved: "bg-emerald-400/10 text-emerald-400",
  deployment_rejected: "bg-red-400/10 text-red-400",
  deployment_executed: "bg-cyan-400/10 text-cyan-400",
  deployment_rollback_initiated: "bg-amber-400/10 text-amber-400",
  member_added: "bg-indigo-400/10 text-indigo-400",
  member_removed: "bg-rose-400/10 text-rose-400",
  member_role_updated: "bg-violet-400/10 text-violet-400",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AuditLogsPage() {
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useListAuditLogs(orgId, {}, { query: { queryKey: getListAuditLogsQueryKey(orgId, {}) } });
  const allLogs = (logs ?? []) as any[];
  const filtered = allLogs.filter(l =>
    !search ||
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.userName?.toLowerCase().includes(search.toLowerCase()) ||
    l.resourceName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Immutable record of all platform actions</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search logs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ScrollText className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No audit events yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Actions taken on the platform will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log: any) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
                <Badge className={`text-xs shrink-0 ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                  {log.action?.replace(/_/g, " ")}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{log.resourceName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{log.userName} · {log.ipAddress}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
