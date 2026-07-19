import { useState } from "react";
import { Plus, BarChart3, Download, Loader2, CheckCircle2, AlertCircle, X, Server, Trash2, Eye, Sparkles } from "lucide-react";
import {
  useListReports, useGenerateReport, getListReportsQueryKey,
  useListServers, getListServersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQueryClient, useMutation } from "@tanstack/react-query";

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

// Extract full content from report data
function getReportContent(r: any): string {
  const data = typeof r.data === "string" ? JSON.parse(r.data) : (r.data ?? {});
  return data.content ?? r.summary ?? r.title;
}

// ── View modal ─────────────────────────────────────────────────────────────────
function ViewReportModal({ report, onClose }: { report: any; onClose: () => void }) {
  const content = getReportContent(report);

  const download = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() ?? "report"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground text-sm">{report.title}</h2>
              <Badge className={`text-[10px] mt-0.5 ${TYPE_COLORS[report.type] ?? "bg-muted text-muted-foreground"}`}>
                {report.type?.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={download}>
              <Download className="w-3 h-3 mr-1" />Download
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">{content}</pre>
        </div>
      </div>
    </div>
  );
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
      onError: (e: any) => { setGenerating(false); setError(e?.message ?? "Generation failed. Please try again."); },
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const label = REPORT_TYPES.find(t => t.value === reportType)?.label ?? reportType;
    const server = servers.find((s: any) => String(s.id) === selectedServerId);
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

  const selectedServer = servers.find((s: any) => String(s.id) === selectedServerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Scope to Server <span className="opacity-50">(optional — AI uses server metrics)</span>
            </label>
            <select
              value={selectedServerId}
              onChange={e => setSelectedServerId(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— All servers (global) —</option>
              {servers.map((s: any) => (
                <option key={`srv-${s.id}`} value={String(s.id)}>{s.name} ({s.host})</option>
              ))}
            </select>
            {selectedServer && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                <Server className="w-3 h-3 shrink-0" />
                <span>{selectedServer.os} · {selectedServer.host} · {selectedServer.status}</span>
                {selectedServer.cpuUsage != null && <span>· CPU {selectedServer.cpuUsage}%</span>}
                {selectedServer.memUsage != null && <span>· RAM {selectedServer.memUsage}%</span>}
                {selectedServer.diskUsage != null && <span>· Disk {selectedServer.diskUsage}%</span>}
              </div>
            )}
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

          {generating && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              AI is writing your report — this takes 15–30 seconds…
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={generating}>Cancel</Button>
            <Button type="submit" size="sm" disabled={generating}>
              {generating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                : <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>}
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
  const [viewReport, setViewReport] = useState<any | null>(null);
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

  const deleteMut = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await fetch(`/api/organizations/${orgId}/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); showToast("success", "Report deleted"); },
    onError: () => showToast("error", "Failed to delete report"),
  });

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

      {viewReport && <ViewReportModal report={viewReport} onClose={() => setViewReport(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated reports scoped to your servers and infrastructure</p>
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
            <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Generate health, compliance, capacity, and deployment reports</p>
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
                  <Badge className={`text-xs shrink-0 ${TYPE_COLORS[r.type] ?? "bg-muted text-muted-foreground"}`}>
                    {r.type?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{r.summary}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(r.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" title="View" onClick={() => setViewReport(r)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Download" onClick={() => {
                  const content = getReportContent(r);
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
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive"
                  title="Delete"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(r.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
