import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Server } from "lucide-react";
import { useGetMonitoringOverview, useListAlerts, getGetMonitoringOverviewQueryKey, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricBar, MetricGroup } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_ALERTS, MOCK_SERVERS } from "@/lib/mock-data";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQueryClient } from "@tanstack/react-query";

const METRICS_HISTORY = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  avgCpu: 20 + Math.sin(i / 4) * 15 + Math.random() * 10,
  avgMem: 55 + Math.cos(i / 6) * 10 + Math.random() * 5,
}));

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function MonitoringPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("");

  const { data: overview, isLoading } = useGetMonitoringOverview(orgId, { query: { queryKey: getGetMonitoringOverviewQueryKey(orgId) } });
  const { data: alerts } = useListAlerts(orgId, {}, { query: { queryKey: getListAlertsQueryKey(orgId, {}) } });

  const allAlerts = (alerts && alerts.length > 0 ? alerts : MOCK_ALERTS) as any[];
  const servers = (overview as any)?.servers ?? MOCK_SERVERS;
  const filteredAlerts = allAlerts.filter((a: any) => !severityFilter || a.severity === severityFilter);
  const activeAlerts = allAlerts.filter((a: any) => !a.resolved);
  const criticalCount = activeAlerts.filter((a: any) => a.severity === "critical").length;
  const warningCount = activeAlerts.filter((a: any) => a.severity === "warning").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time infrastructure health overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()} data-testid="btn-refresh-monitoring">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400 tabular-nums">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Critical Alerts</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400 tabular-nums">{warningCount}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{servers.filter((s: any) => s.status === "online").length}</p>
            <p className="text-xs text-muted-foreground">Servers Online</p>
          </div>
        </div>
      </div>

      {/* Cluster metrics chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Cluster Resource Usage</h2>
          <span className="text-xs text-muted-foreground">Last 24 hours</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={METRICS_HISTORY}>
            <defs>
              <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" width={30} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))", fontSize: 12 }} formatter={(v: any) => [`${Math.round(v)}%`]} />
            <Area type="monotone" dataKey="avgCpu" name="Avg CPU" stroke="hsl(var(--chart-1))" fill="url(#cpuG)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="avgMem" name="Avg Memory" stroke="hsl(var(--chart-2))" fill="url(#memG)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Server health grid */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Server Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) :
            servers.map((server: any) => (
              <div key={server.id ?? server.serverId} className="rounded-xl border border-border bg-card p-4" data-testid={`card-server-health-${server.id ?? server.serverId}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${server.status === "online" ? "bg-emerald-400" : server.status === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
                    <p className="text-sm font-medium text-foreground">{server.name}</p>
                  </div>
                  {(server.alertCount ?? 0) > 0 && (
                    <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">{server.alertCount} alerts</span>
                  )}
                </div>
                <p className="text-xs font-mono text-muted-foreground mb-3">{server.host}</p>
                {server.status === "online" ? (
                  <MetricGroup cpu={server.cpuUsage} mem={server.memUsage} disk={server.diskUsage} />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" />Unreachable
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Active Alerts</h2>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {["", "critical", "warning", "info"].map(sev => (
              <button key={sev} onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${severityFilter === sev ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid={`tab-severity-${sev || "all"}`}>
                {sev || "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground rounded-xl border border-border bg-card">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              <p>No active alerts</p>
            </div>
          ) : filteredAlerts.map((a: any) => (
            <div key={a.id} className={`flex items-start gap-4 p-4 rounded-xl border bg-card ${a.severity === "critical" ? "border-red-500/30" : a.severity === "warning" ? "border-amber-500/30" : "border-border"}`} data-testid={`alert-${a.id}`}>
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-blue-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{a.serverName}</p>
                  <StatusBadge status={a.severity} />
                </div>
                <p className="text-sm text-muted-foreground">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(a.triggeredAt)}</p>
              </div>
              {!a.resolved && (
                <Button size="sm" variant="outline" className="text-xs shrink-0" data-testid={`btn-resolve-alert-${a.id}`}>Resolve</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
