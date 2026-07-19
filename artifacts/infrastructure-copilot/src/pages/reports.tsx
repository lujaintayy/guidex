import { useState } from "react";
import { Plus, BarChart3, Download, Loader2, CheckCircle2, AlertCircle, X, Server } from "lucide-react";
import {
  useListReports, useGenerateReport, getListReportsQueryKey,
  useListServers, getListServersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const REPORT_TYPES = [
  { value: "deployment_summary", label: "Deployment Summary" },
  { value: "server_health",      label: "Server Health" },
  { value: "compliance",         label: "Compliance" },
  { value: "incident_report",    label: "Incident Report" },
  { value: "capacity_planning",  label: "Capacity Planning" },
];

const TYPE_COLORS: Record<string, string> = {
  deployment_summary: "bg-purple-400/10 text-purple-400",
  server_health:      "bg-blue-400/10 text-blue-400",
  compliance:         "bg-emerald-400/10 text-emerald-400",
  incident_report:    "bg-red-400/10 text-red-400",
  capacity_planning:  "bg-amber-400/10 text-amber-400",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// ── Generate report dialog ─────────────────────────────────────────────────────
function GenerateDialog({
  orgId, servers, onClose, onSuccess,
}: {
  orgId: number; servers: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [reportType, setReportType] = useState("deployment_summary");
  const [selectedServerId, setSelectedServerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = useGenerateReport({
    mutation: {
      onSuccess: () => { setGenerating(false); onSuccess(); onClose(); },
      onError: (e: any) => { setGenerating(false); setError(e?.message ?? "Failed"); },
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const label = REPORT_TYPES.find(t => t.value === reportType)?.label ?? reportType;
    const server = servers.find(s => String(s.id) === selectedServerId);
    const finalTitle = title.trim() || [
      label,
      server ? `— ${server.name}` : "",
      new Date().toLocaleDateString(),
    ].filter(Boolean).join(" ");
    setGenerating(true);
    generate.mutate({
      orgId,
      data: {
        type: reportType,
        title: finalTitle,
        serverId: selectedServerId ? parseInt(selectedServerId) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Generate Report</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          {/* Report type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Type *</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Server scope */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Server className="w-3 h-3" />Scope to Server <span className="opacity-50">(optional)</span>
            </label>
            <select
              value={selectedServerId}
              onChange={e => setSelectedServerId(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— All servers (global) —</option>
              {servers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From <span className="opacity-50">(optional)</span></label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To <span className="opacity-50">(optional)</span></label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          {/* Custom title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title <span className="opacity-50">(optional — auto-generated if empty)</span></label>
            <Input placeholder="Leave empty to auto-generate" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : "Generate Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const queryKey = getListReportsQueryKey(orgId);
  const { data: reports, isLoading } = useListReports(orgId, { query: { queryKey } });
  const { data: servers } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });
  const allReports = (reports ?? []) as any[];
  const allServers = (servers ?? []) as any[];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {showGenerate && (
        <GenerateDialog
          orgId={orgId}
          servers={allServers}
          onClose={() => setShowGenerate(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey }); showToast("success", "Report generated successfully"); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform reports scoped to specific servers or deployments</p>
        </div>
        <Button size="sm" onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4 mr-2" />Generate Report
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : allReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No reports yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Generate reports scoped to specific servers or deployments</p>
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Plus className="w-4 h-4 mr-2" />Generate Report
            </Button>
          </div>
        ) : (
          allReports.map((r: any) => (
            <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors">
              <BarChart3 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground text-sm">{r.title}</p>
                  <Badge className={`text-xs ${TYPE_COLORS[r.type] ?? "bg-muted text-muted-foreground"}`}>
                    {r.type?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.summary}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(r.createdAt)}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" title="Download" onClick={() => {
                const content = [`# ${r.title}`, `Type: ${r.type?.replace(/_/g, " ")}`, `Generated: ${new Date(r.createdAt).toLocaleString()}`, "", r.summary ?? ""].join("\n");
                const blob = new Blob([content], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${r.title?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() ?? "report"}.md`;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
