import { useState } from "react";
import {
  Plus, Search, FileCode2, Database, Globe, Container, Server, Cpu, X,
  Loader2, Wand2, Eye, Trash2, Edit3, Code2, ChevronDown, ChevronUp
} from "lucide-react";
import {
  useListTemplates, useCreateTemplate, getListTemplatesQueryKey
} from "@workspace/api-client-react";
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

// ── Create Template Dialog ─────────────────────────────────────────────────────
function CreateTemplateDialog({ orgId, onClose, onSuccess }: { orgId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", software: "", description: "", scriptContent: "",
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [error, setError] = useState("");

  const create = useCreateTemplate({
    mutation: {
      onSuccess: () => { onSuccess(); onClose(); },
      onError: (e: any) => setError(e?.message ?? "Failed to create template"),
    },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const analyzeScript = async () => {
    if (!form.scriptContent.trim()) { setAnalyzeError("Paste a script first."); return; }
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const stored = localStorage.getItem("infra-auth");
      const token = stored ? JSON.parse(stored).token ?? "" : "";
      const res = await fetch(`/api/organizations/${orgId}/templates/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scriptContent: form.scriptContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setForm(p => ({
        ...p,
        name: data.name || p.name,
        software: data.software || p.software,
        description: data.description || p.description,
      }));
    } catch (e: any) {
      setAnalyzeError(e?.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Template name is required."); return; }
    if (!form.software.trim()) { setError("Software package is required."); return; }
    create.mutate({
      orgId,
      data: {
        name: form.name.trim(),
        software: form.software.trim(),
        description: form.description.trim() || undefined,
        scriptContent: form.scriptContent.trim() || undefined,
      } as any,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Create Template</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Script content with AI analyze */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />Script / Template Content
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={analyzeScript}
                disabled={analyzing || !form.scriptContent.trim()}
                className="h-6 text-xs px-2 gap-1"
              >
                {analyzing
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing…</>
                  : <><Wand2 className="w-3 h-3" />AI Auto-fill</>}
              </Button>
            </div>
            <textarea
              rows={8}
              placeholder="Paste your shell script or configuration here…&#10;&#10;Example:&#10;#!/bin/bash&#10;apt-get update -y&#10;apt-get install -y nginx&#10;systemctl enable nginx && systemctl start nginx"
              value={form.scriptContent}
              onChange={e => set("scriptContent", e.target.value)}
              className="w-full rounded-md border border-border bg-background text-xs px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
            {analyzeError && <p className="text-xs text-destructive mt-1">{analyzeError}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Click <strong>AI Auto-fill</strong> to automatically detect the software package and description from your script.
            </p>
          </div>

          {/* Name & software */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name *</label>
              <Input
                placeholder="e.g. Nginx with SSL Setup"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Software Package *</label>
              <Input
                placeholder="e.g. nginx, docker, postgresql"
                value={form.software}
                onChange={e => set("software", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description <span className="opacity-50">(optional)</span></label>
              <Input
                placeholder="What does this template install/configure?"
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
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

// ── View Template Modal ────────────────────────────────────────────────────────
function ViewTemplateModal({
  template, orgId, onClose, onDeleted, onEdited,
}: {
  template: any; orgId: number; onClose: () => void;
  onDeleted: () => void; onEdited: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: template.name ?? "",
    software: template.software ?? "",
    description: template.description ?? "",
    scriptContent: template.scriptContent ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [showScript, setShowScript] = useState(true);

  const deleteTemplate = async () => {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    setDeleting(true);
    try {
      const stored = localStorage.getItem("infra-auth");
      const token = stored ? JSON.parse(stored).token ?? "" : "";
      await fetch(`/api/organizations/${orgId}/templates/${template.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const stored = localStorage.getItem("infra-auth");
      const token = stored ? JSON.parse(stored).token ?? "" : "";
      await fetch(`/api/organizations/${orgId}/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editForm.name,
          software: editForm.software,
          description: editForm.description,
          scriptContent: editForm.scriptContent,
        }),
      });
      onEdited();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const Icon = CATEGORY_ICONS[template.category] ?? FileCode2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            {editing
              ? <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-7 text-sm font-semibold" />
              : <h2 className="font-semibold text-foreground">{template.name}</h2>}
          </div>
          <div className="flex items-center gap-2">
            {!template.isBuiltIn && (
              <>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(!editing)}>
                  <Edit3 className="w-3 h-3" />{editing ? "Cancel" : "Edit"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive" onClick={deleteTemplate} disabled={deleting}>
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </Button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Software Package</p>
              {editing
                ? <Input value={editForm.software} onChange={e => setEditForm(p => ({ ...p, software: e.target.value }))} className="h-7 text-xs" />
                : <p className="text-sm font-mono text-foreground">{template.software || "—"}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              {editing
                ? <Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="h-7 text-xs" placeholder="Description" />
                : <p className="text-sm text-foreground">{template.description || "—"}</p>}
            </div>
          </div>

          {/* Script content */}
          <div>
            <button
              className="flex items-center gap-2 text-sm font-medium text-foreground mb-2"
              onClick={() => setShowScript(!showScript)}
            >
              <Code2 className="w-4 h-4 text-muted-foreground" />
              Script Content
              {showScript ? <ChevronUp className="w-3.5 h-3.5 ml-auto text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
            </button>
            {showScript && (
              editing ? (
                <textarea
                  rows={12}
                  value={editForm.scriptContent}
                  onChange={e => setEditForm(p => ({ ...p, scriptContent: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background text-xs px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
              ) : template.scriptContent ? (
                <pre className="rounded-lg border border-border bg-sidebar p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {template.scriptContent}
                </pre>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">No script content stored for this template.</p>
                </div>
              )
            )}
          </div>

          {/* Steps */}
          {Array.isArray(template.steps) && template.steps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Installation Steps ({template.steps.length})</p>
              <div className="space-y-2">
                {template.steps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">{step.order ?? i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{step.name}</p>
                      <code className="text-[10px] font-mono text-muted-foreground">{step.command}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editing && (
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</> : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewTemplate, setViewTemplate] = useState<any | null>(null);

  const { data: templates, isLoading } = useListTemplates(orgId, {}, { query: { queryKey: getListTemplatesQueryKey(orgId, {}) } });
  const all = (templates ?? []) as any[];
  const filtered = all.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.software ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const refresh = () => qc.invalidateQueries({ queryKey: getListTemplatesQueryKey(orgId, {}) });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {showCreate && (
        <CreateTemplateDialog
          orgId={orgId}
          onClose={() => setShowCreate(false)}
          onSuccess={refresh}
        />
      )}
      {viewTemplate && (
        <ViewTemplateModal
          template={viewTemplate}
          orgId={orgId}
          onClose={() => setViewTemplate(null)}
          onDeleted={refresh}
          onEdited={refresh}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">{all.length} deployment template{all.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} data-testid="btn-create-template">
          <Plus className="w-4 h-4 mr-2" />Create Template
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
          data-testid="input-template-search"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : all.length === 0 ? (
        <div className="text-center py-20 rounded-xl border border-border bg-card text-muted-foreground">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1 mb-4">Paste a script and let AI auto-fill the details</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Create Template
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No templates match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t: any) => {
            const Icon = CATEGORY_ICONS[t.category] ?? FileCode2;
            return (
              <div
                key={t.id}
                onClick={() => setViewTemplate(t)}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-muted/30 transition-all group cursor-pointer"
                data-testid={`card-template-${t.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {t.isBuiltIn && <Badge variant="secondary" className="text-[10px]">Built-in</Badge>}
                    {t.scriptContent && (
                      <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        <Code2 className="w-2.5 h-2.5" />script
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description || "No description"}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs font-mono text-muted-foreground">{t.software || "—"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{t.usageCount ?? 0} uses</span>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
