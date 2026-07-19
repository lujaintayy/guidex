import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  ChevronRight, Server, Cpu, HardDrive, MemoryStick, Activity, ArrowLeft,
  Wifi, Scan, Terminal, Package, Lock, Network, CheckCircle2, XCircle,
  Clock, RefreshCw, Loader2, AlertTriangle,
} from "lucide-react";
import {
  useGetServer, useGetServerHealth, useListDeployments,
  getGetServerQueryKey, getGetServerHealthQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricBar } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SshTerminal } from "@/components/ssh-terminal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MOCK_METRICS = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 5}m`,
  cpu: 15 + Math.random() * 40,
  mem: 50 + Math.random() * 20,
}));

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export default function ServerDetailPage() {
  const [, params] = useRoute("/servers/:id");
  const { orgId, token } = useAuth() as any;
  const serverId = parseInt(params?.id ?? "0");

  const { data: server, isLoading, refetch } = useGetServer(orgId, serverId, {
    query: { queryKey: getGetServerQueryKey(orgId, serverId) },
  });
  const { data: health } = useGetServerHealth(orgId, serverId, {
    query: { queryKey: getGetServerHealthQueryKey(orgId, serverId) },
  });
  const { data: deploys } = useListDeployments(orgId, {}, {
    query: { queryKey: ["deploys-by-server", orgId, serverId] as any },
  });

  const [showTerminal, setShowTerminal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const s = server as any;
  const h = health as any;

  // ── Scan handler ─────────────────────────────────────────────────────────────
  const runScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const stored = localStorage.getItem("infra-auth");
      const t = token ?? (stored ? (JSON.parse(stored) as { token?: string }).token ?? "" : "");
      const resp = await fetch(`/api/organizations/${orgId}/servers/${serverId}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      await refetch();
    } catch (e: any) {
      setScanError(e?.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  const scanData = (s?.scanData ?? null) as Record<string, any> | null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* SSH Terminal modal */}
      {showTerminal && s && (
        <SshTerminal
          server={{ id: s.id, name: s.name, host: s.host, sshPort: s.sshPort, sshUsername: s.sshUsername, sshAuthMethod: s.sshAuthMethod }}
          orgId={orgId}
          token={token ?? ""}
          onClose={() => setShowTerminal(false)}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/servers">
          <span className="hover:text-foreground cursor-pointer flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />Servers
          </span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{s?.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
            <Server className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{s?.name}</h1>
              {s?.clientName && <Badge variant="outline" className="text-xs">{s.clientName}</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-muted-foreground">{s?.sshUsername}@{s?.host}:{s?.sshPort}</span>
              <StatusBadge status={s?.status ?? "unknown"} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={runScan}
            disabled={scanning}
            data-testid="btn-scan-server"
          >
            {scanning
              ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Scanning…</>
              : <><Scan className="w-3.5 h-3.5 mr-2" />Scan</>}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowTerminal(true)}
            data-testid="btn-connect-ssh"
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600"
          >
            <Terminal className="w-3.5 h-3.5 mr-2" />Connect
          </Button>
          <Link href={`/deployments?serverId=${serverId}`}>
            <Button size="sm" data-testid="btn-deploy-to-server">New Deployment</Button>
          </Link>
        </div>
      </div>

      {scanError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {scanError}
        </div>
      )}

      {/* Basic info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard label="Operating System" value={`${s?.os ?? "—"} ${s?.osVersion ?? ""}`.trim()} />
        <InfoCard label="SSH User" value={s?.sshUsername} />
        <InfoCard label="Auth Method" value={
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-muted-foreground" />
            {s?.sshAuthMethod === "key" ? "SSH Key" : s?.sshAuthMethod === "none" ? "Agent" : "Password"}
          </span>
        } />
        <InfoCard label="Last Seen" value={s?.lastSeen ? new Date(s.lastSeen).toLocaleString() : "Never"} />
      </div>

      {/* Scan results — shown after a successful scan */}
      {scanData ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              System Information
            </h2>
            <span className="text-xs text-muted-foreground">
              Scanned {scanData["scannedAt"] ? new Date(scanData["scannedAt"] as string).toLocaleString() : "recently"}
            </span>
          </div>

          {/* Hardware specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard label="Kernel" value={scanData["kernel"] as string} />
            <InfoCard label="CPU Model" value={scanData["cpuModel"] as string} />
            <InfoCard label="CPU Cores" value={scanData["cpuCores"] ? `${scanData["cpuCores"]} cores` : undefined} />
            <InfoCard label="RAM" value={scanData["totalMemoryMb"] ? `${Math.round((scanData["totalMemoryMb"] as number) / 1024)} GB` : undefined} />
            <InfoCard label="Disk" value={scanData["totalDiskGb"] ? `${scanData["totalDiskGb"]} GB` : undefined} />
            <InfoCard label="Docker" value={
              <span className="flex items-center gap-1">
                {scanData["dockerInstalled"]
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Installed</>
                  : <><XCircle className="w-3.5 h-3.5 text-muted-foreground" />Not installed</>}
              </span>
            } />
            <InfoCard label="Kubernetes" value={
              <span className="flex items-center gap-1">
                {scanData["kubernetesInstalled"]
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Installed</>
                  : <><XCircle className="w-3.5 h-3.5 text-muted-foreground" />Not installed</>}
              </span>
            } />
            <InfoCard label="Firewall" value={
              <span className="flex items-center gap-1">
                {scanData["firewallEnabled"]
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Enabled</>
                  : <><XCircle className="w-3.5 h-3.5 text-amber-400" />Disabled</>}
              </span>
            } />
          </div>

          {/* Open ports */}
          {Array.isArray(scanData["ports"]) && (scanData["ports"] as number[]).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-muted-foreground" />Open Ports
              </h3>
              <div className="flex flex-wrap gap-2">
                {(scanData["ports"] as number[]).map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground border border-border">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Installed packages */}
          {Array.isArray(scanData["packages"]) && (scanData["packages"] as any[]).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-muted-foreground" />Key Packages
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(scanData["packages"] as { name: string; version: string }[]).map(pkg => (
                  <div key={pkg.name} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium text-foreground">{pkg.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{pkg.version}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {Array.isArray(scanData["services"]) && (scanData["services"] as any[]).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {(scanData["services"] as { name: string; status: string }[]).map(svc => (
                  <div key={svc.name} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${svc.status === "active" ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" : "bg-muted text-muted-foreground border-border"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${svc.status === "active" ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                    {svc.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Scan className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-medium text-muted-foreground text-sm">No scan data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
            Click <strong>Scan</strong> to collect OS, CPU, RAM, disk, packages and services info from this server.
          </p>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
            {scanning ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Scanning…</> : <><Scan className="w-3.5 h-3.5 mr-2" />Run Scan</>}
          </Button>
        </div>
      )}

      {/* Live health metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "CPU Usage",    value: h?.cpuUsage    ?? s?.cpuUsage,    icon: Cpu },
          { label: "Memory Usage", value: h?.memoryUsage ?? s?.memUsage,    icon: MemoryStick },
          { label: "Disk Usage",   value: h?.diskUsage   ?? s?.diskUsage,   icon: HardDrive },
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

      {/* Additional health info from API */}
      {h && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard label="Uptime" value={h.uptime ? `${Math.floor(h.uptime / 86400)}d ${Math.floor((h.uptime % 86400) / 3600)}h` : undefined} />
          <InfoCard label="Load Average" value={h.loadAverage ? (h.loadAverage as number[]).join(" / ") : undefined} />
          <InfoCard label="Processes" value={h.runningProcesses} />
          <InfoCard label="Network In/Out" value={h.networkIn != null ? `↓${h.networkIn} ↑${h.networkOut} MB/s` : undefined} />
        </div>
      )}

      {/* Resource history chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          Resource History (1h)
        </h2>
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
            <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="cpu" name="CPU" stroke="hsl(var(--chart-1))" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="mem" name="Memory" stroke="hsl(var(--chart-2))" fill="url(#memGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Running services from health */}
      {h?.runningServices && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Running Services</h2>
          <div className="flex flex-wrap gap-2">
            {(h.runningServices as string[]).map(svc => (
              <div key={svc} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/10 text-emerald-400 text-xs border border-emerald-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {svc}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Deployment History
        </h2>
        {!deploys || (deploys as any[]).filter((d: any) => d.serverId === serverId).length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">No deployments for this server yet</p>
        ) : (
          <div className="divide-y divide-border">
            {(deploys as any[]).filter((d: any) => d.serverId === serverId).map((d: any) => (
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

      {/* Tags */}
      {s?.tags && (s.tags as string[]).length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-3">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {(s.tags as string[]).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}
