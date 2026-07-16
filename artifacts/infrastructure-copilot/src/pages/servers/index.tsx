import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, RefreshCw, Wifi, WifiOff, Zap, X, Loader2 } from "lucide-react";
import {
  useListServers, useListServerGroups, useTestServerConnection,
  useCreateServer, getListServersQueryKey, ServerInputOs,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricGroup } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

// ── Add Server Dialog ──────────────────────────────────────────────────────────
function AddServerDialog({ orgId, onClose, onSuccess }: { orgId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", host: "", sshPort: "22", sshUsername: "ubuntu",
    os: "ubuntu", osVersion: "", description: "",
  });
  const [error, setError] = useState("");
  const create = useCreateServer({ mutation: { onSuccess: () => { onSuccess(); onClose(); }, onError: (e: any) => setError(e?.message ?? "Failed to add server") } });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.host || !form.sshUsername) { setError("Name, host, and SSH username are required."); return; }
    create.mutate({ orgId, data: { name: form.name, host: form.host, sshPort: parseInt(form.sshPort) || 22, sshUsername: form.sshUsername, os: form.os as ServerInputOs, osVersion: form.osVersion || undefined, description: form.description || undefined } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Add Server</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name *</label>
              <Input placeholder="prod-web-01" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hostname / IP Address *</label>
              <Input placeholder="192.168.1.10 or server.example.com" value={form.host} onChange={e => set("host", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">SSH Port</label>
              <Input type="number" placeholder="22" value={form.sshPort} onChange={e => set("sshPort", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">SSH Username *</label>
              <Input placeholder="ubuntu" value={form.sshUsername} onChange={e => set("sshUsername", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Operating System</label>
              <select value={form.os} onChange={e => set("os", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="ubuntu">Ubuntu</option>
                <option value="debian">Debian</option>
                <option value="centos">CentOS</option>
                <option value="rhel">RHEL</option>
                <option value="windows">Windows</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">OS Version <span className="opacity-50">(optional)</span></label>
              <Input placeholder="22.04" value={form.osVersion} onChange={e => set("osVersion", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description <span className="opacity-50">(optional)</span></label>
              <Input placeholder="Primary web server for production traffic" value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <strong>Note:</strong> GuideX connects via SSH. Ensure port {form.sshPort || 22} is reachable and your SSH key or password is configured on the server.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : "Add Server"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ServersPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: servers, isLoading } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });
  const { data: groups } = useListServerGroups(orgId, { query: { queryKey: ["server-groups", orgId] as any } });
  const testConn = useTestServerConnection({ mutation: {} });

  const allServers = (servers ?? []) as any[];
  const filtered = allServers.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.host.includes(search);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const testConnection = async (serverId: number) => {
    setTestingId(serverId);
    try { await testConn.mutateAsync({ orgId, serverId, data: {} } as any); }
    finally { setTestingId(null); }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {showAdd && (
        <AddServerDialog
          orgId={orgId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-muted-foreground text-sm mt-1">{allServers.length} servers across {(groups ?? []).length} groups</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="btn-add-server">
          <Plus className="w-4 h-4 mr-2" />Add Server
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: allServers.length, color: "text-foreground" },
          { label: "Online", value: allServers.filter(s => s.status === "online").length, color: "text-emerald-400" },
          { label: "Offline", value: allServers.filter(s => s.status === "offline").length, color: "text-red-400" },
          { label: "Unknown", value: allServers.filter(s => s.status === "unknown").length, color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" data-testid="input-server-search" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-sm bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring" data-testid="select-status-filter">
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="unknown">Unknown</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button onClick={() => qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) })}
          className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" data-testid="btn-refresh-servers">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Server</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">OS</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Group</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 min-w-[120px]">Resources</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tags</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td>
              </tr>
            )) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{allServers.length === 0 ? "No servers added yet" : "No servers match your filters"}</p>
                  {allServers.length === 0 && (
                    <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-primary hover:underline">
                      Add your first server →
                    </button>
                  )}
                </td>
              </tr>
            ) : filtered.map((server: any) => (
              <tr key={server.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-server-${server.id}`}>
                <td className="px-4 py-3">
                  <Link href={`/servers/${server.id}`}>
                    <div className="cursor-pointer">
                      <p className="font-medium text-foreground hover:text-primary transition-colors">{server.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{server.host}:{server.sshPort}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3"><StatusBadge status={server.status} /></td>
                <td className="px-4 py-3">
                  <p className="text-foreground capitalize">{server.os}</p>
                  {server.osVersion && <p className="text-xs text-muted-foreground">{server.osVersion}</p>}
                </td>
                <td className="px-4 py-3">
                  {server.groupName ? <Badge variant="outline" className="text-xs">{server.groupName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-4 py-3"><MetricGroup cpu={server.cpuUsage} mem={server.memUsage} disk={server.diskUsage} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(server.tags ?? []).slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => testConnection(server.id)} disabled={testingId === server.id}
                      className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Test SSH connection" data-testid={`btn-test-connection-${server.id}`}>
                      {testingId === server.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    </button>
                    <Link href={`/servers/${server.id}`}>
                      <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View details" data-testid={`btn-view-server-${server.id}`}>
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
