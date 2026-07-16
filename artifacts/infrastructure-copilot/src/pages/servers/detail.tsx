import { useRoute, Link } from "wouter";
import { ChevronRight, Server, Cpu, HardDrive, MemoryStick, Activity, Clock, ArrowLeft, Wifi, Scan } from "lucide-react";
import { useGetServer, useGetServerHealth, useListDeployments, getGetServerQueryKey, getGetServerHealthQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricBar } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_SERVERS, MOCK_DEPLOYMENTS } from "@/lib/mock-data";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MOCK_METRICS = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 5}m`,
  cpu: 15 + Math.random() * 45,
  mem: 50 + Math.random() * 25,
  disk: 40 + Math.random() * 10,
}));

export default function ServerDetailPage() {
  const [, params] = useRoute("/servers/:id");
  const { orgId } = useAuth();
  const serverId = parseInt(params?.id ?? "1");

  const { data: server, isLoading: serverLoading } = useGetServer(orgId, serverId, { query: { queryKey: getGetServerQueryKey(orgId, serverId) } });
  const { data: health } = useGetServerHealth(orgId, serverId, { query: { queryKey: getGetServerHealthQueryKey(orgId, serverId) } });
  const { data: deploys } = useListDeployments(orgId, {}, { query: { queryKey: ["deploys-by-server", orgId, serverId] as any } });

  const s = server ?? MOCK_SERVERS.find(s => s.id === serverId) ?? MOCK_SERVERS[0];
  const serverDeploys = (deploys ?? MOCK_DEPLOYMENTS).filter((d: any) => d.serverId === serverId);

  if (serverLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/servers"><span className="hover:text-foreground cursor-pointer flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Servers</span></Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{s?.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
            <Server className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{s?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-muted-foreground">{s?.host}:{s?.sshPort}</span>
              <StatusBadge status={s?.status ?? "unknown"} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="btn-test-ssh">
            <Wifi className="w-3.5 h-3.5 mr-2" />Test SSH
          </Button>
          <Button variant="outline" size="sm" data-testid="btn-scan-server">
            <Scan className="w-3.5 h-3.5 mr-2" />Scan
          </Button>
          <Link href={`/deployments?serverId=${serverId}`}>
            <Button size="sm" data-testid="btn-deploy-to-server">New Deployment</Button>
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Operating System", value: `${s?.os ?? "—"} ${s?.osVersion ?? ""}` },
          { label: "SSH User", value: s?.sshUsername ?? "—" },
          { label: "Group", value: (s as any)?.groupName ?? "Ungrouped" },
          { label: "Last Seen", value: s?.lastSeen ? new Date(s.lastSeen).toLocaleString() : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-sm font-medium text-foreground capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Health metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "CPU Usage", value: (health as any)?.cpuUsage ?? s?.cpuUsage, icon: Cpu },
          { label: "Memory Usage", value: (health as any)?.memoryUsage ?? s?.memUsage, icon: MemoryStick },
          { label: "Disk Usage", value: (health as any)?.diskUsage ?? s?.diskUsage, icon: HardDrive },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold tabular-nums text-foreground mb-2">
              {value != null ? `${Math.round(value as number)}%` : "—"}
            </p>
            <MetricBar value={value as number} label="" className="w-full" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">Resource History (1h)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={MOCK_METRICS}>
            <defs>
              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" width={35} />
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))", fontSize: 12 }} />
            <Area type="monotone" dataKey="cpu" name="CPU" stroke="hsl(var(--chart-1))" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="mem" name="Memory" stroke="hsl(var(--chart-2))" fill="url(#memGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tags */}
      {s?.tags && (s.tags as string[]).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {(s.tags as string[]).map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>
      )}

      {/* Running services */}
      {(health as any)?.runningServices && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Running Services</h2>
          <div className="flex flex-wrap gap-2">
            {((health as any).runningServices as string[]).map(svc => (
              <div key={svc} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {svc}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4">Deployment History</h2>
        {serverDeploys.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No deployments for this server yet</p>
        ) : (
          <div className="divide-y divide-border">
            {serverDeploys.map((d: any) => (
              <Link key={d.id} href={`/deployments/${d.id}`}>
                <div className="flex items-center gap-4 py-3 hover:bg-muted/30 px-2 -mx-2 rounded-lg cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.templateName}</p>
                  </div>
                  <StatusBadge status={d.status} />
                  <span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
