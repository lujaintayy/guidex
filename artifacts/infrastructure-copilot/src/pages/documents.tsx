import { useState } from "react";
import { Plus, FileText, Download, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useListDocuments, useGenerateDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_LABELS: Record<string, string> = {
  deployment_report: "Deployment Report",
  sop: "SOP",
  architecture_doc: "Architecture",
  troubleshooting_report: "Troubleshooting",
};

const TYPE_COLORS: Record<string, string> = {
  deployment_report: "bg-purple-400/10 text-purple-400",
  sop: "bg-blue-400/10 text-blue-400",
  architecture_doc: "bg-cyan-400/10 text-cyan-400",
  troubleshooting_report: "bg-amber-400/10 text-amber-400",
};

const DOC_TYPES = [
  { value: "deployment_report", label: "Deployment Report" },
  { value: "sop", label: "SOP" },
  { value: "architecture_doc", label: "Architecture Doc" },
  { value: "troubleshooting_report", label: "Troubleshooting Report" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export default function DocumentsPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("sop");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Use consistent query key matching getListDocumentsQueryKey(orgId, undefined)
  const queryKey = getListDocumentsQueryKey(orgId, undefined);
  const { data: documents, isLoading } = useListDocuments(orgId, undefined, { query: { queryKey } });
  const allDocs = (documents ?? []) as any[];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const generate = useGenerateDocument({
    mutation: {
      onSuccess: () => {
        // Invalidate with the exact same key used by useListDocuments
        qc.invalidateQueries({ queryKey });
        setGenerating(false);
        showToast("success", "Document generated successfully");
      },
      onError: (e: any) => {
        setGenerating(false);
        showToast("error", e?.message ?? "Failed to generate document");
      },
    },
  });

  const deleteMut = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey });
        showToast("success", "Document deleted");
      },
    },
  });

  const handleGenerate = () => {
    setGenerating(true);
    const label = DOC_TYPES.find(t => t.value === selectedType)?.label ?? selectedType;
    generate.mutate({
      orgId,
      data: {
        type: selectedType,
        title: `${label} — ${new Date().toLocaleDateString()}`,
        prompt: `Generate ${label} for GuideX platform`,
      } as any,
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all
          ${toast.type === "success" ? "bg-emerald-950 border-emerald-800 text-emerald-300" : "bg-red-950 border-red-800 text-red-300"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated documentation from your deployments and infrastructure</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-8 rounded-md border border-border bg-card text-sm px-2 text-foreground"
          >
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Plus className="w-4 h-4 mr-2" />Generate</>}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
        ) : allDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card text-center">
            <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No documents yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Generate your first document using the button above</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  title="Download"
                  onClick={() => {
                    const blob = new Blob([doc.content ?? doc.title], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${doc.title}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMut.mutate({ orgId, documentId: doc.id } as any)}
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
