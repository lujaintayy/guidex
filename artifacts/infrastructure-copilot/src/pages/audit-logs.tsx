import { useState } from "react";
import { Search, ScrollText, ChevronDown, ChevronUp } from "lucide-react";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_COLORS: Record<string, string> = {
  server_registered:              "bg-blue-400/10 text-blue-400",
  deployment_created:             "bg-purple-400/10 text-purple-400",
  deployment_approved:            "bg-emerald-400/10 text-emerald-400",
  deployment_rejected:            "bg-red-400/10 text-red-400",
  deployment_executed:            "bg-cyan-400/10 text-cyan-400",
  deployment_rollback_initiated:  "bg-amber-400/10 text-amber-400",
  member_added:                   "bg-indigo-400/10 text-indigo-400",
  member_removed:                 "bg-rose-400/10 text-rose-400",
  member_role_updated:            "bg-violet-400/10 text-violet-400",
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

// ── Expandable log row ─────────────────────────────────────────────────────────
function LogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);

  // Build a list of detail fields to show when expanded
  const details: Array<[string, string | undefined]> = [
    ["Action",        log.action],
    ["Resource Type", log.resourceType],
    ["Resource ID",   log.resourceId ? String(log.resourceId) : undefined],
    ["Resource Name", log.resourceName],
    ["User",          log.userName],
    ["User ID",       log.userId ? String(log.userId) : undefined],
    ["IP Address",    log.ipAddress],
    ["Org ID",        log.orgId ? String(log.orgId) : undefined],
    ["Timestamp",     log.createdAt ? new Date(log.createdAt).toLocaleString() : undefined],
  ].filter(([, v]) => v != null) as Array<[string, string]>;

  // Extra metadata from payload if present
  const metadata = log.metadata ?? log.details ?? log.payload;

  return (
    <div
      className={`border-b border-border last:border-0 transition-colors ${expanded ? "bg-muted/20" : "hover:bg-muted/30"}`}
    >
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-4 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge className={`text-xs shrink-0 ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
          {log.action?.replace(/_/g, " ")}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{log.resourceName ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{log.userName ?? "—"}{log.ipAddress ? ` · ${log.ipAddress}` : ""}</p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Details</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {details.map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="text-xs text-foreground font-medium break-all">{value}</p>
                </div>
              ))}
            </div>
            {metadata && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Additional Data</p>
                <pre className="text-[10px] font-mono text-foreground bg-muted/40 rounded-md px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                  {typeof metadata === "string" ? metadata : JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");

  const { data: logsRaw, isLoading } = useListAuditLogs(orgId, {}, { query: { queryKey: getListAuditLogsQueryKey(orgId, {}) } });
  const allLogs = (Array.isArray(logsRaw) ? logsRaw : (logsRaw as any)?.items ?? []) as any[];
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
          <p className="text-muted-foreground text-sm mt-1">
            Immutable record of all platform actions · {allLogs.length} event{allLogs.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by action, user, or resource…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ScrollText className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No audit events found</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {allLogs.length === 0 ? "Actions taken on the platform will appear here" : "No events match your search"}
            </p>
          </div>
        ) : (
          <div>
            {/* Header hint */}
            <div className="px-4 py-2 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">Click any row to expand full event details</p>
            </div>
            {filtered.map((log: any) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
