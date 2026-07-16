import { ShieldCheck, Rocket, Server, Bot, Activity, FileText, Users, ScrollText, GitBranch, Lock, Zap, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Server,
    title: "Server Management",
    description: "Register and manage on-premises and cloud servers via SSH. Monitor CPU, memory, disk usage, and service health in real time.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Rocket,
    title: "Deployment Pipelines",
    description: "Plan, approve, and execute software deployments with AI-generated step plans, full execution logs, and one-click rollback.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: FileText,
    title: "Template Library",
    description: "Reusable installation templates for Nginx, PostgreSQL, Docker, Redis, Node.js, and more — with configurable parameters.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description: "Ask anything about your infrastructure. The AI generates deployment plans, diagnoses failures, and answers technical questions.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: Activity,
    title: "Monitoring & Alerts",
    description: "Cluster-level health overview, per-server resource charts, and real-time alerts for critical events like high memory or SSL expiry.",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
  {
    icon: ScrollText,
    title: "Audit Logs",
    description: "Immutable, searchable audit trail of every action taken across the platform — who did what, when, and from which IP.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Users,
    title: "Multi-Tenant RBAC",
    description: "Organisation-scoped access control with Engineer, Reviewer, and Admin roles. Invite team members and manage permissions centrally.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: FileText,
    title: "Documentation Center",
    description: "AI-generated deployment reports, SOPs, architecture docs, and troubleshooting guides — created automatically from real data.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
  },
];

const ROLES = [
  {
    role: "Engineer",
    badge: "bg-blue-400/15 text-blue-400",
    description: "Can register servers, create deployments from templates, chat with the AI assistant, view monitoring dashboards, and generate documentation.",
    capabilities: [
      "Register & manage servers",
      "Create new deployments",
      "Use AI Assistant",
      "View audit logs",
      "Browse templates",
      "Generate documents",
    ],
  },
  {
    role: "Reviewer",
    badge: "bg-amber-400/15 text-amber-400",
    description: "All Engineer capabilities plus the ability to approve or reject deployments in the approval queue before they are executed.",
    capabilities: [
      "All Engineer capabilities",
      "Approve deployments",
      "Reject deployments",
      "Leave approval comments",
      "View approval history",
    ],
  },
  {
    role: "Admin",
    badge: "bg-violet-400/15 text-violet-400",
    description: "Full platform control. Manages the organisation, invites members, assigns roles, manages server groups, and has all Reviewer rights.",
    capabilities: [
      "All Reviewer capabilities",
      "Invite team members",
      "Assign & change roles",
      "Manage server groups",
      "Manage organisation settings",
      "Delete resources",
    ],
  },
];

const STATS = [
  { value: "2,400+", label: "Deployments executed", icon: Rocket },
  { value: "99.2%", label: "Deployment success rate", icon: Zap },
  { value: "850+", label: "Servers managed", icon: Server },
  { value: "100%", label: "Audit coverage", icon: Lock },
];

const TEAM = [
  { name: "Sarah Chen", role: "Lead Infrastructure Engineer", initials: "SC", color: "bg-blue-500/20 text-blue-400" },
  { name: "Mike Torres", role: "Senior Reviewer & SRE Lead", initials: "MT", color: "bg-violet-500/20 text-violet-400" },
  { name: "Alex Kim", role: "Platform Engineer", initials: "AK", color: "bg-emerald-500/20 text-emerald-400" },
  { name: "Jordan Lee", role: "Infrastructure Admin", initials: "JL", color: "bg-amber-500/20 text-amber-400" },
];

export default function AboutPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Infrastructure Copilot</h1>
              <p className="text-sm text-muted-foreground">Enterprise DevOps Platform</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-4 max-w-2xl leading-tight">
            Deploy with <span className="text-primary">confidence.</span>
            <br />Manage with <span className="text-primary">clarity.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Infrastructure Copilot is an AI-powered DevOps platform that gives system engineers and operations teams a single place to plan, validate, deploy, monitor, troubleshoot, and document software installations — across on-premises and cloud infrastructure.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5"><Globe className="w-3 h-3" />On-premises & Cloud</Badge>
            <Badge variant="secondary" className="gap-1.5"><Lock className="w-3 h-3" />Enterprise RBAC</Badge>
            <Badge variant="secondary" className="gap-1.5"><Bot className="w-3 h-3" />AI-Powered</Badge>
            <Badge variant="secondary" className="gap-1.5"><GitBranch className="w-3 h-3" />Full Audit Trail</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 text-center">
              <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-card border border-border rounded-xl p-8">
          <h3 className="text-xl font-semibold mb-4">Our Mission</h3>
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            Infrastructure operations are complex, error-prone, and often poorly documented. Engineers spend hours SSH-ing into servers, running ad-hoc commands, and hoping nothing breaks — with little visibility, no approval workflow, and no audit record.
          </p>
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            Infrastructure Copilot changes that. Every deployment goes through a structured workflow: the AI generates a step-by-step plan, a reviewer approves it, the platform executes it with real-time logs, and the full event is recorded in an immutable audit log. If something goes wrong, one click rolls it back.
          </p>
          <p className="text-muted-foreground leading-relaxed text-base">
            The result is a team that deploys faster, with fewer incidents, and can prove exactly what was done to any auditor or stakeholder.
          </p>
        </div>

        {/* Features */}
        <div>
          <h3 className="text-xl font-semibold mb-2">Platform Capabilities</h3>
          <p className="text-muted-foreground text-sm mb-6">Everything your team needs to operate infrastructure at scale.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div key={title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors group">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
                <h4 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">{title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roles & Access */}
        <div>
          <h3 className="text-xl font-semibold mb-2">Roles & Access Levels</h3>
          <p className="text-muted-foreground text-sm mb-6">Infrastructure Copilot uses role-based access control scoped to your organisation.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLES.map(({ role, badge, description, capabilities }) => (
              <div key={role} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                <div className={`inline-flex items-center self-start px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${badge}`}>
                  {role}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
                <ul className="mt-auto space-y-1.5">
                  {capabilities.map(cap => (
                    <li key={cap} className="flex items-center gap-2 text-xs text-foreground/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-card border border-border rounded-xl p-8">
          <h3 className="text-xl font-semibold mb-6">How a Deployment Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
            {[
              { step: "01", title: "Pick a Template", desc: "Choose from built-in templates (Nginx, PostgreSQL, Docker…) or create your own." },
              { step: "02", title: "AI Plans It", desc: "The AI generates a step-by-step deployment plan with risk assessment and rollback strategy." },
              { step: "03", title: "Reviewer Approves", desc: "A Reviewer checks the plan, leaves comments, and approves or rejects the deployment." },
              { step: "04", title: "Platform Executes", desc: "The platform SSHs into the target server and runs each step, streaming real-time logs." },
              { step: "05", title: "Full Record", desc: "Every event is logged in the audit trail and an AI-generated report is created automatically." },
            ].map(({ step, title, desc }, i, arr) => (
              <div key={step} className="flex md:flex-col items-start md:items-center gap-3 md:gap-0 relative">
                <div className="flex md:flex-col items-center gap-2 w-full">
                  <div className="w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{step}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-[calc(50%+20px)] right-0 h-0.5 bg-border" style={{ width: "calc(100% - 40px)", left: "calc(50% + 20px)" }} />
                  )}
                </div>
                <div className="md:text-center md:px-2 md:mt-3">
                  <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h3 className="text-xl font-semibold mb-2">Meet the Team</h3>
          <p className="text-muted-foreground text-sm mb-6">The Acme Corp infrastructure team keeping systems running at scale.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEAM.map(({ name, role, initials, color }) => (
              <div key={name} className="bg-card border border-border rounded-xl p-5 text-center hover:border-primary/30 transition-colors">
                <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center mx-auto mb-3`}>
                  <span className="text-lg font-bold">{initials}</span>
                </div>
                <p className="font-semibold text-sm text-foreground">{name}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 border border-border rounded-xl p-8">
          <h3 className="text-xl font-semibold mb-2">Built for Enterprise</h3>
          <p className="text-muted-foreground text-sm mb-6">Production-ready architecture, built to operate safely at scale.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "End-to-end audit trail", desc: "Every action logged with user, IP, timestamp, and resource" },
              { title: "JWT authentication", desc: "Secure token-based auth with session management and logout" },
              { title: "Approval workflows", desc: "No deployment executes without a Reviewer sign-off" },
              { title: "AI-generated plans", desc: "Every deployment comes with an AI risk assessment and rollback strategy" },
              { title: "Multi-tenant isolation", desc: "Organisations are fully isolated — data never bleeds across tenants" },
              { title: "SSH-based execution", desc: "Deployments run over SSH — no agent to install on target servers" },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 text-sm text-muted-foreground border-t border-border">
          <p>Infrastructure Copilot — Enterprise DevOps Platform</p>
          <p className="text-xs mt-1 opacity-60">Built for engineering teams who deploy with confidence</p>
        </div>
      </div>
    </div>
  );
}
