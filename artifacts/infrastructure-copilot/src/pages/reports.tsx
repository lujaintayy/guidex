import { useState } from "react";
import { Plus, BarChart3, Download, Loader2 } from "lucide-react";
import { useListReports, useGenerateReport, getListReportsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const REPORT_TYPES = [
  { value: "deployment_summary", label: "Deployment Summary" },
  { value: "server_health", label: "Server Health" },
  { value: "compliance", label: "Compliance" },
];

const TYPE_COLORS: Record<string, string> = {
  deployment_summary: "bg-purple-400/10 text-purple-400",
  server_health: "bg-blue-400/10 text-blue-400",
  compliance: "bg-emerald-400/10 text-emerald-400",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export default function ReportsPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("deployment_summary");

  const { data: reports, isLoading } = useListReports(orgId, { query: { queryKey: getListReportsQueryKey(orgId) } });
  const allReports = (reports ?? []) as any[];

  const generate = useGenerateReport({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListReportsQueryKey(orgId) });
        setGenerating(false);
      },
      onError: () => setGenerating(false),
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    const label = REPORT_TYPES.find(t => t.value === selectedType)?.label ?? selectedType;
    generate.mutate({ orgId, data: { type: selectedType, title: `${label} — ${new Date().toLocaleDateString()}` } } as any);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated reports from your platform data</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-8 rounded-md border border-border bg-card text-sm px-2 text-foreground"
          >
            {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Plus className="w-4 h-4 mr-2" />Generate Report</>}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : allReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border bg-card text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">No reports yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Generate your first report using the button above</p>
          </div>
        ) : (
          allReports.map((r: any) => (
            <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors">
              <BarChart3 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground text-sm">{r.title}</p>
                  <Badge className={`text-xs ${TYPE_COLORS[r.type] ?? "bg-muted text-muted-foreground"}`}>{r.type?.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.summary}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(r.createdAt)}</p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
