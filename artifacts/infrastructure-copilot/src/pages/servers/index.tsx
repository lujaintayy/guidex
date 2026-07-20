import { useState } from "react";
import { Link } from "wouter";
import {
  Plus, Search, RefreshCw, Wifi, WifiOff, X, Loader2,
  Terminal, Server, Shield, Eye, Trash2, CheckCircle2, XCircle
} from "lucide-react";
import {
  useListServers, useListServerGroups, useTestServerConnection,
  useCreateServer, getListServersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricGroup } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { SshTerminal } from "@/components/ssh-terminal";

// ── Add Server Dialog ──────────────────────────────────────────────────────────
interface AddServerForm {
  name: string; clientName: string; host: string; sshPort: string;
  sshUsername: string; sshAuthMethod: string; sshPassword: string;
  deploymentStatus: string; notes: string;
}

function AddServerDialog({ orgId, onClose, onSuccess }: { orgId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<AddServerForm>({
    name: "", clientName: "", host: "", sshPort: "22",
    sshUsername: "root", sshAuthMethod: "password", sshPassword: "",
    deploymentStatus: "online", notes: "",
  });
  const [error, setError] = useState("");

  const create = useCreateServer({
    mutation: {
      onSuccess: () => { onSuccess(); onClose(); },
      onError: (e: any) => setError(e?.message ?? "Failed to add server"),
    },
  });

  const set = (k: keyof AddServerForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Display name is required."); return; }
    if (!form.clientName.trim()) { setError("Client / Project is required."); return; }
    if (!form.host.trim()) { setError("IP address / hostname is required."); return; }
    if (!form.sshUsername.trim()) { setError("SSH username is required."); return; }
    create.mutate({
      orgId,
      data: {
        name: form.name.trim(),
        clientName: form.clientName.trim(),
        host: form.host.trim(),
        sshPort: parseInt(form.sshPort) || 22,
        sshUsername: form.sshUsername.trim(),
        sshAuthMethod: form.sshAuthMethod,
        sshPassword: form.sshPassword || undefined,
        description: form.notes || undefined,
        status: form.deploymentStatus,
      } as any,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Add New Server</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identity */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Server Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name *</label>
                <Input placeholder="prod-web-01" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Client / Project *</label>
                <Input placeholder="Acme Corp" value={form.clientName} onChange={e => set("clientName", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deployment Status *</label>
                <select
                  value={form.deploymentStatus}
                  onChange={e => set("deploymentStatus", e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
          </div>

          {/* Connection */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connection</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address / Hostname *</label>
                <Input placeholder="192.168.1.10 or server.example.com" value={form.host} onChange={e => set("host", e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SSH Port *</label>
                <Input type="number" placeholder="22" value={form.sshPort} onChange={e => set("sshPort", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SSH Username *</label>
                <Input placeholder="root" value={form.sshUsername} onChange={e => set("sshUsername", e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Auth */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Authentication
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Auth Method</label>
                <select
                  value={form.sshAuthMethod}
                  onChange={e => set("sshAuthMethod", e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="password">Password</option>
                  <option value="key">SSH Private Key</option>
                  <option value="none">None / Agent</option>
                </select>
              </div>
              {form.sshAuthMethod === "password" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">SSH Password <span className="opacity-50">(optional)</span></label>
                  <Input type="password" placeholder="Leave empty to enter at connect" value={form.sshPassword} onChange={e => set("sshPassword", e.target.value)} />
                </div>
              )}
              {form.sshAuthMethod === "key" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Private Key Content</label>
                  <textarea
                    rows={3}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                    value={form.sshPassword}
                    onChange={e => set("sshPassword", e.target.value)}
                    className="w-full rounded-md border border-border bg-background text-xs px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes <span className="opacity-50">(optional)</span></label>
            <Input placeholder="Primary web server for production traffic…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
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

// ── Test result toast ──────────────────────────────────────────────────────────
function TestResult({ result, onClose }: { result: { success: boolean; message: string; latencyMs: number }; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm
      ${result.success ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-red-950 border-red-800 text-red-300"}`}>
      {result.success
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <XCircle className="w-4 h-4 shrink-0" />}
      <div>
        <p className="font-medium">{result.success ? "Connection successful" : "Connection failed"}</p>
        <p className="text-xs opacity-80">{result.message}{result.success ? ` · ${result.latencyMs}ms` : ""}</p>
      </div>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ServersPage() {
  const { orgId, token, user } = useAuth() as any;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sshServer, setSshServer] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: servers, isLoading } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });
  const { data: groups } = useListServerGroups(orgId, { query: { queryKey: ["server-groups", orgId] as any } });
  const testConn = useTestServerConnection({ mutation: {} });

  const allServers = (servers ?? []) as any[];
  const filtered = allServers.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.host.includes(search) || (s.clientName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const testConnection = async (serverId: number) => {
    setTestingId(serverId);
    setTestResult(null);
    try {
      const result = await testConn.mutateAsync({ orgId, serverId, data: {} } as any) as any;
      setTestResult(result);
      // Refresh server list to pick up status update
      qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) });
      setTimeout(() => setTestResult(null), 6000);
    } catch {
      setTestResult({ success: false, message: "Test failed", latencyMs: 0 });
    } finally {
      setTestingId(null);
    }
  };

  const deleteServer = async (serverId: number, name: string) => {
    if (!confirm(`Delete server "${name}"? This cannot be undone.`)) return;
    setDeletingId(serverId);
    try {
      const stored = localStorage.getItem("infra-auth");
      const t = token ?? (stored ? JSON.parse(stored).token ?? "" : "");
      await fetch(`/api/organizations/${orgId}/servers/${serverId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const authIcon = (method?: string) => {
    if (method === "key") return <span title="SSH Key auth"><Shield className="w-3 h-3 text-emerald-400" /></span>;
    if (method === "password") return <span title="Password auth"><Shield className="w-3 h-3 text-amber-400" /></span>;
    return null;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Dialogs */}
      {showAdd && (
        <AddServerDialog
          orgId={orgId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) })}
        />
      )}
      {sshServer && (
        <SshTerminal
          server={sshServer}
          orgId={orgId}
          token={token ?? ""}
          onClose={() => setSshServer(null)}
        />
      )}
      {testResult && (
        <TestResult result={testResult} onClose={() => setTestResult(null)} />
      )}

      {/* Page intro */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground mb-1">Manage Servers</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Register, monitor and connect to your infrastructure. Add a server with its SSH credentials,
              then use <span className="text-foreground font-medium">Connect</span> to open an interactive terminal,
              or use <span className="text-foreground font-medium">Test</span> to verify TCP connectivity.
            </p>
          </div>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allServers.length} server{allServers.length !== 1 ? "s" : ""} across {(groups ?? []).length} group{(groups ?? []).length !== 1 ? "s" : ""}
          </p>
        </div>
        {user?.role !== "reviewer" && (
          <Button size="sm" onClick={() => setShowAdd(true)} data-testid="btn-add-server">
            <Plus className="w-4 h-4 mr-2" />Add Server
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",   value: allServers.length,                                     color: "text-foreground" },
          { label: "Online",  value: allServers.filter(s => s.status === "online").length,  color: "text-emerald-400" },
          { label: "Offline", value: allServers.filter(s => s.status === "offline").length, color: "text-red-400" },
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
          <Input
            placeholder="Search by name, IP or client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
            data-testid="input-server-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          data-testid="select-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          title="Refresh server list"
          data-testid="btn-refresh-servers"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Server table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Server</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 min-w-[120px]">Resources</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-muted-foreground">
                  <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">
                    {allServers.length === 0 ? "No servers added yet" : "No servers match your filters"}
                  </p>
                  {allServers.length === 0 && user?.role !== "reviewer" && (
                    <button onClick={() => setShowAdd(true)} className="mt-3 text-sm text-primary hover:underline">
                      Add your first server →
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((server: any) => (
                <tr
                  key={server.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  data-testid={`row-server-${server.id}`}
                >
                  {/* Server name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {authIcon(server.sshAuthMethod)}
                      <div>
                        <p className="font-medium text-foreground">{server.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {server.sshUsername}@{server.host}:{server.sshPort}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Client */}
                  <td className="px-4 py-3">
                    {server.clientName
                      ? <Badge variant="outline" className="text-xs">{server.clientName}</Badge>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge status={server.status} /></td>
                  {/* Resources */}
                  <td className="px-4 py-3">
                    <MetricGroup cpu={server.cpuUsage} mem={server.memUsage} disk={server.diskUsage} />
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Test connection */}
                      <button
                        onClick={() => testConnection(server.id)}
                        disabled={testingId === server.id}
                        className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Test TCP connectivity"
                        data-testid={`btn-test-${server.id}`}
                      >
                        {testingId === server.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Wifi className="w-3.5 h-3.5" />}
                      </button>
                      {/* SSH terminal — hidden for view-only reviewers */}
                      {user?.role !== "reviewer" && (
                        <button
                          onClick={() => setSshServer(server)}
                          className="p-1.5 rounded text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Open SSH terminal"
                          data-testid={`btn-connect-${server.id}`}
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* View detail */}
                      <Link href={`/servers/${server.id}`}>
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="View server details"
                          data-testid={`btn-view-${server.id}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      {/* Delete — hidden for view-only reviewers */}
                      {user?.role !== "reviewer" && (
                        <button
                          onClick={() => deleteServer(server.id, server.name)}
                          disabled={deletingId === server.id}
                          className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete server"
                          data-testid={`btn-delete-${server.id}`}
                        >
                          {deletingId === server.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
