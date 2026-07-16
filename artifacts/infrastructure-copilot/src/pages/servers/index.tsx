import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import { useListServers, useListServerGroups, useTestServerConnection, getListServersQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricGroup } from "@/components/ui/metric-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_SERVERS } from "@/lib/mock-data";
import { useQueryClient } from "@tanstack/react-query";

export default function ServersPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: servers, isLoading } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });
  const { data: groups } = useListServerGroups(orgId, { query: { queryKey: ["server-groups", orgId] as any } });
  const testConn = useTestServerConnection({ mutation: {} });

  const allServers = (servers && servers.length > 0 ? servers : MOCK_SERVERS) as any[];
  const filtered = allServers.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.host.includes(search);
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchGroup = !groupFilter || String(s.groupId) === groupFilter;
    return matchSearch && matchStatus && matchGroup;
  });

  const testConnection = async (orgId: number, serverId: number) => {
    setTestingId(serverId);
    try {
      await testConn.mutateAsync({ orgId, serverId, data: {} } as any);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servers</h1>
          <p className="text-muted-foreground text-sm mt-1">{allServers.length} servers across {(groups ?? []).length || 3} groups</p>
        </div>
        <Button size="sm" data-testid="btn-add-server">
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
          <Input
            placeholder="Search by name or IP..."
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
          <option value="">All Status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="unknown">Unknown</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: getListServersQueryKey(orgId, {}) })}
          className="p-2 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          data-testid="btn-refresh-servers"
        >
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
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <WifiOff className="w-8 h-8 mx-auto mb-2" />
                  <p>No servers found</p>
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
                  {server.groupName ? (
                    <Badge variant="outline" className="text-xs">{server.groupName}</Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <MetricGroup cpu={server.cpuUsage} mem={server.memUsage} disk={server.diskUsage} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(server.tags ?? []).slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => testConnection(orgId, server.id)}
                      disabled={testingId === server.id}
                      className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Test SSH connection"
                      data-testid={`btn-test-connection-${server.id}`}
                    >
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
