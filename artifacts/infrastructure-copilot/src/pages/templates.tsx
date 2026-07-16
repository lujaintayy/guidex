import { useState } from "react";
import { Plus, Search, FileCode2, Database, Globe, Container, Server, Cpu } from "lucide-react";
import { useListTemplates, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_ICONS: Record<string, any> = {
  webserver: Globe, database: Database, container: Container,
  language: Cpu, messaging: Server, security: Server, monitoring: Server, other: FileCode2,
};

const MOCK_TEMPLATES = [
  { id: 1, name: "Nginx 1.28", software: "nginx", version: "1.28.0", category: "webserver", description: "Latest stable Nginx web server with SSL and reverse proxy support", usageCount: 42, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 2, name: "PostgreSQL 16", software: "postgresql", version: "16.3", category: "database", description: "Enterprise-grade PostgreSQL with replication and backup configuration", usageCount: 38, isBuiltIn: true, osRequirements: ["ubuntu", "debian", "rhel"], createdAt: new Date().toISOString() },
  { id: 3, name: "Docker CE", software: "docker", version: "27.1.1", category: "container", description: "Docker Container Engine with Compose and BuildKit", usageCount: 55, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 4, name: "Redis 7.4", software: "redis", version: "7.4.0", category: "database", description: "In-memory data structure store for caching and messaging", usageCount: 29, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 5, name: "Node.js 22 LTS", software: "nodejs", version: "22.0.0", category: "language", description: "Node.js JavaScript runtime with npm and nvm support", usageCount: 31, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 6, name: "MySQL 8.4", software: "mysql", version: "8.4.0", category: "database", description: "MySQL Community Server with secure installation and remote access", usageCount: 22, isBuiltIn: true, osRequirements: ["ubuntu", "debian", "rhel"], createdAt: new Date().toISOString() },
  { id: 7, name: "Java 21 LTS", software: "java", version: "21.0.4", category: "language", description: "OpenJDK 21 with Maven and Gradle build tools", usageCount: 18, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 8, name: "Kubernetes Helm", software: "helm", version: "3.16.1", category: "container", description: "Helm package manager for Kubernetes deployments", usageCount: 14, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
  { id: 9, name: "Apache HTTPD", software: "apache2", version: "2.4.62", category: "webserver", description: "Apache HTTP Server with SSL/TLS and VirtualHost support", usageCount: 11, isBuiltIn: true, osRequirements: ["ubuntu", "debian"], createdAt: new Date().toISOString() },
];

const CATEGORIES = ["all", "webserver", "database", "container", "language", "messaging", "security", "monitoring", "other"];

export default function TemplatesPage() {
  const { orgId } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: templates, isLoading } = useListTemplates(orgId, {}, { query: { queryKey: getListTemplatesQueryKey(orgId, {}) } });
  const all = (templates && templates.length > 0 ? templates : MOCK_TEMPLATES) as any[];
  const filtered = all.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.software.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">{all.length} installation templates available</p>
        </div>
        <Button size="sm" data-testid="btn-create-template">
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No templates found</p>
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
                    {t.osRequirements?.map((os: string) => (
                      <span key={os} className="text-[10px] text-muted-foreground capitalize">{os}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.usageCount} uses</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
