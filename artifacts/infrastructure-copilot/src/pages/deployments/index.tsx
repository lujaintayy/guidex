import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, CheckCircle2, Clock, Loader2, Rocket } from "lucide-react";
import {
  useListDeployments, useCreateDeployment, useListServers, useListTemplates,
  getListDeploymentsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function NewDeploymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serverId, setServerId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");

  const { data: servers } = useListServers(orgId, {}, {});
  const { data: templates } = useListTemplates(orgId, {}, {});
  const serverList = (servers ?? []) as any[];
  const templateList = (templates ?? []) as any[];

  const create = useCreateDeployment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListDeploymentsQueryKey(orgId, {}) });
        setName(""); setDescription(""); setServerId(""); setTemplateId(""); setError("");
        onClose();
      },
      onError: (err: any) => setError(err?.message ?? "Failed to create deployment"),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverId || !templateId || !name) { setError("Please fill all required fields."); return; }
    setError("");
    create.mutate({ orgId, data: { serverId: Number(serverId), templateId: Number(templateId), name, description } } as any);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Deployment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="dep-name">Deployment name *</Label>
            <Input id="dep-name" className="mt-1" placeholder="e.g. Nginx install on web-01" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="dep-server">Server *</Label>
            {serverList.length === 0 ? (
              <p className="text-xs text-amber-400 mt-1">No servers registered yet. Add a server in the Servers tab first.</p>
            ) : (
              <select id="dep-server" value={serverId} onChange={e => setServerId(e.target.value)} required
                className="mt-1 w-full h-9 rounded-md border border-border bg-background text-sm px-2 text-foreground">
                <option value="">Select server…</option>
                {serverList.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.host})</option>)}
              </select>
            )}
          </div>
          <div>
            <Label htmlFor="dep-template">Template *</Label>
            {templateList.length === 0 ? (
              <p className="text-xs text-amber-400 mt-1">No templates available. Add a template in the Templates tab first.</p>
            ) : (
              <select id="dep-template" value={templateId} onChange={e => setTemplateId(e.target.value)} required
                className="mt-1 w-full h-9 rounded-md border border-border bg-background text-sm px-2 text-foreground">
                <option value="">Select template…</option>
                {templateList.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.software} {t.version})</option>)}
              </select>
            )}
          </div>
          <div>
            <Label htmlFor="dep-desc">Description</Label>
            <Input id="dep-desc" className="mt-1" placeholder="Optional notes" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Deployment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DeploymentsPage() {
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);

  const { data: deployments, isLoading } = useListDeployments(orgId, {}, { query: { queryKey: getListDeploymentsQueryKey(orgId, {}) } });
  const allDeploys = (deployments ?? []) as any[];
  const filtered = allDeploys.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.serverName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const pending = allDeploys.filter(d => d.status === "awaiting_approval");

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <NewDeploymentDialog open={showNew} onClose={() => setShowNew(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground text-sm mt-1">{allDeploys.length} total deployment{allDeploys.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} data-testid="btn-new-deployment">
          <Plus className="w-4 h-4 mr-2" />New Deployment
        </Button>
      </div>

      {/* Approval queue */}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-amber-400 text-sm">{pending.length} deployment{pending.length !== 1 ? "s" : ""} awaiting approval</h2>
          </div>
          <div className="space-y-2">
            {pending.map((d: any) => (
              <Link key={d.id} href={`/deployments/${d.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.serverName} · {d.templateName}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.createdByName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</span>
                  <Button size="sm" variant="outline" className="text-xs">Review</Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search deployments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === tab.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Deployment</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Server</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Template</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created By</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td colSpan={6} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td>
              </tr>
            )) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-muted-foreground">
                  <Rocket className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-medium">No deployments yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Click "New Deployment" to create your first one</p>
                </td>
              </tr>
            ) : filtered.map((d: any) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <Link href={`/deployments/${d.id}`}>
                    <div>
                      <p className="font-medium text-foreground hover:text-primary transition-colors">{d.name}</p>
                      {d.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{d.description}</p>}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{d.serverName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{d.serverHost}</p>
                </td>
                <td className="px-4 py-3"><p className="text-foreground">{d.templateName ?? d.templateSoftware}</p></td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{d.createdByName}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
