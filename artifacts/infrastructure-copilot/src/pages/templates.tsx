import { useState } from "react";
import { Plus, Search, FileCode2, Database, Globe, Container, Server, Cpu, X, Loader2 } from "lucide-react";
import { useListTemplates, useCreateTemplate, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_ICONS: Record<string, any> = {
  webserver: Globe, database: Database, container: Container,
  language: Cpu, messaging: Server, security: Server, monitoring: Server, other: FileCode2,
};

const CATEGORIES = ["all", "webserver", "database", "container", "language", "messaging", "security", "monitoring", "other"];

// ── Create Template Dialog ─────────────────────────────────────────────────────
function CreateTemplateDialog({ orgId, onClose, onSuccess }: { orgId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", software: "", version: "", category: "webserver",
    description: "", osRequirements: "ubuntu, debian",
  });
  const [error, setError] = useState("");
  const create = useCreateTemplate({
    mutation: {
      onSuccess: () => { onSuccess(); onClose(); },
      onError: (e: any) => setError(e?.message ?? "Failed to create template"),
    },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.software || !form.version) { setError("Name, software, and version are required."); return; }
    const osReqs = form.osRequirements.split(",").map(s => s.trim()).filter(Boolean);
    create.mutate({
      orgId,
      data: {
        name: form.name,
        software: form.software,
        version: form.version,
        category: form.category,
        description: form.description || undefined,
        osRequirements: osReqs,
      } as any,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Create Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name *</label>
              <Input placeholder="Nginx 1.28 with SSL" value={form.name} onChange={e => set("name", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Software Package *</label>
              <Input placeholder="nginx" value={form.software} onChange={e => set("software", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Version *</label>
              <Input placeholder="1.28.0" value={form.version} onChange={e => set("version", e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">OS Requirements</label>
              <Input placeholder="ubuntu, debian" value={form.osRequirements} onChange={e => set("osRequirements", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description <span className="opacity-50">(optional)</span></label>
              <Input placeholder="Describe what this template installs and configures" value={form.description} onChange={e => set("description", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <p className="text-xs text-muted-foreground">The AI assistant will generate step-by-step installation instructions for your template automatically.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: templates, isLoading } = useListTemplates(orgId, {}, { query: { queryKey: getListTemplatesQueryKey(orgId, {}) } });
  const all = (templates ?? []) as any[];
  const filtered = all.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.software ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {showCreate && (
        <CreateTemplateDialog
          orgId={orgId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: getListTemplatesQueryKey(orgId, {}) })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">{all.length} installation templates available</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="btn-create-template">
          <Plus className="w-4 h-4 mr-2" />Create Template
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" data-testid="input-template-search" />
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${category === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`tab-category-${cat}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : all.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-border bg-card text-muted-foreground">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1 mb-4">Create your first template to start running deployments</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Create Template
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No templates match your search</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t: any) => {
            const Icon = CATEGORY_ICONS[t.category] ?? FileCode2;
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer" data-testid={`card-template-${t.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {t.isBuiltIn && <Badge variant="secondary" className="text-[10px]">Built-in</Badge>}
                    <Badge variant="outline" className="text-[10px] capitalize">{t.category}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">{t.version}</span>
                    {(t.osRequirements ?? []).slice(0, 2).map((os: string) => (
                      <span key={os} className="text-[10px] text-muted-foreground capitalize">{os}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.usageCount ?? 0} uses</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
