import { useState } from "react";
import { Plus, FileText, Download, Trash2, Loader2, CheckCircle2, AlertCircle, Eye, X, Server, Layers } from "lucide-react";
import {
  useListDocuments, useGenerateDocument, useDeleteDocument, getListDocumentsQueryKey,
  useListServers, getListServersQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_LABELS: Record<string, string> = {
  deployment_report:    "Deployment Report",
  sop:                  "SOP",
  architecture_doc:     "Architecture Doc",
  troubleshooting_report: "Troubleshooting",
  srs:                  "SRS",
};

const TYPE_COLORS: Record<string, string> = {
  deployment_report:    "bg-purple-400/10 text-purple-400",
  sop:                  "bg-blue-400/10 text-blue-400",
  architecture_doc:     "bg-cyan-400/10 text-cyan-400",
  troubleshooting_report: "bg-amber-400/10 text-amber-400",
  srs:                  "bg-emerald-400/10 text-emerald-400",
};

const DOC_TYPES = [
  { value: "sop",                   label: "Standard Operating Procedure (SOP)" },
  { value: "deployment_report",     label: "Deployment Report" },
  { value: "architecture_doc",      label: "Architecture Documentation" },
  { value: "troubleshooting_report", label: "Troubleshooting Report" },
  { value: "srs",                   label: "Software Requirements Specification (SRS)" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

// ── Document viewer modal ──────────────────────────────────────────────────────
function ViewDocModal({ doc, onClose }: { doc: any; onClose: () => void }) {
  const download = () => {
    const blob = new Blob([doc.content ?? doc.title], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <h2 className="font-semibold text-foreground text-sm">{doc.title}</h2>
              <Badge className={`text-[10px] mt-0.5 ${TYPE_COLORS[doc.type] ?? "bg-muted text-muted-foreground"}`}>
                {TYPE_LABELS[doc.type] ?? doc.type}
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
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed">{doc.content}</pre>
        </div>
      </div>
    </div>
  );
}

// ── Generate dialog ────────────────────────────────────────────────────────────
function GenerateDialog({
  orgId, servers, onClose, onSuccess,
}: {
  orgId: number; servers: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"template" | "server">("template");
  const [docType, setDocType] = useState("sop");
  const [title, setTitle] = useState("");
  const [selectedServerId, setSelectedServerId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = useGenerateDocument({
    mutation: {
      onSuccess: () => { setGenerating(false); onSuccess(); onClose(); },
      onError: (e: any) => { setGenerating(false); setError(e?.message ?? "Failed"); },
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const label = DOC_TYPES.find(t => t.value === docType)?.label ?? docType;
    const finalTitle = title.trim() || `${label} — ${new Date().toLocaleDateString()}`;
    setGenerating(true);
    generate.mutate({
      orgId,
      data: {
        type: docType,
        title: finalTitle,
        mode,
        serverId: mode === "server" && selectedServerId ? parseInt(selectedServerId) : undefined,
        prompt: `Generate ${label}`,
      } as any,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Generate Document</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-5">
          {/* Mode selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Generation Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${mode === "template" ? "border-primary/60 bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <Layers className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">Placeholder Template</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Structured template with fields to fill in</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("server")}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${mode === "server" ? "border-primary/60 bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <Server className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground">Server Report</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Report scoped to a specific server</p>
                </div>
              </button>
            </div>
          </div>

          {/* Document type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Type *</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Server selector (server mode) */}
          {mode === "server" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Server <span className="opacity-50">(optional)</span></label>
              <select
                value={selectedServerId}
                onChange={e => setSelectedServerId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— All servers —</option>
                {servers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title <span className="opacity-50">(optional)</span></label>
            <Input
              placeholder="Leave empty to auto-generate"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : "Generate Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [showGenerate, setShowGenerate] = useState(false);
  const [viewDoc, setViewDoc] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const queryKey = getListDocumentsQueryKey(orgId, undefined);
  const { data: documents, isLoading } = useListDocuments(orgId, undefined, { query: { queryKey } });
  const { data: servers } = useListServers(orgId, {}, { query: { queryKey: getListServersQueryKey(orgId, {}) } });
  const allDocs = (documents ?? []) as any[];
  const allServers = (servers ?? []) as any[];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const deleteMut = useDeleteDocument({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey }); showToast("success", "Document deleted"); },
    },
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
          onSuccess={() => { qc.invalidateQueries({ queryKey }); showToast("success", "Document generated successfully"); }}
        />
      )}

      {viewDoc && <ViewDocModal doc={viewDoc} onClose={() => setViewDoc(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">Generated documentation for your infrastructure</p>
        </div>
        <Button size="sm" onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4 mr-2" />Generate Document
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : allDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No documents yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1 mb-4">Generate SOPs, architecture docs, reports, and SRS documents</p>
            <Button size="sm" onClick={() => setShowGenerate(true)}>
              <Plus className="w-4 h-4 mr-2" />Generate Document
            </Button>
          </div>
        ) : (
          allDocs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                  <Badge className={`text-xs shrink-0 ${TYPE_COLORS[doc.type] ?? "bg-muted text-muted-foreground"}`}>
                    {TYPE_LABELS[doc.type] ?? doc.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{timeAgo(doc.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" title="View" onClick={() => setViewDoc(doc)}>
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Download" onClick={() => {
                  const blob = new Blob([doc.content ?? doc.title], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${doc.title}.md`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => deleteMut.mutate({ orgId, documentId: doc.id } as any)}>
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
