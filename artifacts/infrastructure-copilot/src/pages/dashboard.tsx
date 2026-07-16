import { Link } from "wouter";
import { Server, Rocket, AlertTriangle, CheckCircle2, TrendingUp, Activity, ArrowRight, BarChart3 } from "lucide-react";
import {
  useGetOrganizationStats, useGetRecentDeployments, useListAlerts, useListServers,
  getGetOrganizationStatsQueryKey, getGetRecentDeploymentsQueryKey, getListAlertsQueryKey, getListServersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricBar } from "@/components/ui/metric-bar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`p-2 rounded-lg bg-muted ${color}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Build a simple deployment summary bar from stats (no per-day API exists yet)
function buildTrendData(stats: any) {
  if (!stats || stats.totalDeployments === 0) return [];
  const total = stats.totalDeployments ?? 0;
  const failed = stats.failedDeployments ?? 0;
  const success = total - failed;
  // Show a single summary bar so the chart isn't empty
  return [{ period: "All time", success, failed }];
}

export default function DashboardPage() {
  const { orgId } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetOrganizationStats(orgId, { query: { queryKey: getGetOrganizationStatsQueryKey(orgId) } });
  const { data: recentDeploys, isLoading: deploysLoading } = useGetRecentDeployments(orgId, { query: { queryKey: getGetRecentDeploymentsQueryKey(orgId) } });
  const { data: alerts } = useListAlerts(orgId, {}, { query: { queryKey: getListAlertsQueryKey(orgId, {}) } });
  const { data: servers } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });

  const s = stats ?? { totalServers: 0, onlineServers: 0, offlineServers: 0, activeDeployments: 0, failedDeployments: 0, totalDeployments: 0, pendingApprovals: 0, alertCount: 0, successRate: 0 };
  const deploys = (recentDeploys ?? []) as any[];
  const activeAlerts = (alerts ?? []).filter((a: any) => !a.resolved);
  const allServers = (servers ?? []) as any[];
  const trendData = buildTrendData(stats);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Infrastructure overview</p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md border border-border">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) : (
          <>
            <StatCard icon={Server} label="Total Servers" value={s.totalServers ?? 0} sub={`${s.onlineServers ?? 0} online, ${s.offlineServers ?? 0} offline`} color="text-primary" />
            <StatCard icon={Rocket} label="Deployments" value={s.totalDeployments ?? 0} sub={`${s.activeDeployments ?? 0} running now`} color="text-emerald-400" />
            <StatCard icon={AlertTriangle} label="Active Alerts" value={(s as any).alertCount ?? activeAlerts.length} sub={`${s.pendingApprovals ?? 0} pending approvals`} color="text-amber-400" />
            <StatCard icon={TrendingUp} label="Success Rate" value={`${s.successRate ?? 0}%`} sub={`${s.failedDeployments ?? 0} failed this period`} color="text-blue-400" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployment trend */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Deployment Trends</h2>
            <span className="text-xs text-muted-foreground">Lifetime totals</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : trendData.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No deployments yet</p>
              <p className="text-xs mt-1 opacity-70">Run your first deployment to see trends here</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trendData} barSize={40} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))", fontSize: 12 }} />
                <Bar dataKey="success" name="Successful" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--chart-5))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active alerts */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Active Alerts</h2>
            <Link href="/monitoring">
              <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">View all <ArrowRight className="w-3 h-3" /></span>
            </Link>
          </div>
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
              <p className="text-sm">All systems healthy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.slice(0, 4).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted border border-border">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === "critical" ? "text-red-400" : "text-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{a.serverName}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.message}</p>
                    <StatusBadge status={a.severity} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent deployments */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Deployments</h2>
          <Link href="/deployments">
            <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">View all <ArrowRight className="w-3 h-3" /></span>
          </Link>
        </div>
        {deploysLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : deploys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Rocket className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No deployments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {deploys.slice(0, 6).map((d: any) => (
              <Link key={d.id} href={`/deployments/${d.id}`}>
                <div className="flex items-center gap-4 py-3 hover:bg-muted/50 px-2 -mx-2 rounded-lg cursor-pointer transition-colors" data-testid={`row-deployment-${d.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.serverName} · {d.templateSoftware}</p>
                  </div>
                  <StatusBadge status={d.status} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(d.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">{d.createdByName}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Server status overview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Server Status</h2>
          <Link href="/servers">
            <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">All servers <ArrowRight className="w-3 h-3" /></span>
          </Link>
        </div>
        {allServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Activity className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No servers added yet</p>
            <Link href="/servers">
              <span className="text-xs text-primary hover:underline mt-1 cursor-pointer">Add your first server →</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allServers.map((server: any) => (
              <Link key={server.id} href={`/servers/${server.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer" data-testid={`card-server-${server.id}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${server.status === "online" ? "bg-emerald-400" : server.status === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{server.name}</p>
                    <p className="text-xs text-muted-foreground">{server.host}</p>
                  </div>
                  {server.cpuUsage != null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">CPU</p>
                      <MetricBar value={server.cpuUsage} label="" className="w-16" />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
