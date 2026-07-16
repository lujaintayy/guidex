import { useState } from "react";
import {
  Server, Plus, Shield, Users, Rocket, Bot, Activity,
  CheckCircle2, ArrowRight, Terminal, Key, Play, Monitor,
  BookOpen, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

// ── Video Player Component (inline, using CSS animations) ─────────────────────
function VideoPreview() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-[#0f1117] aspect-video shadow-2xl">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(#3b82f620 1px, transparent 1px), linear-gradient(90deg, #3b82f620 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {!playing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-white font-mono">GuideX</span>
            </div>
            <p className="text-4xl font-bold text-white leading-tight">Deploy with<br /><span className="text-primary">confidence.</span></p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
              AI-powered infrastructure management · Engineer, Reviewer & Admin portals · Full audit trail
            </p>
          </div>

          {/* Animated terminal lines */}
          <div className="w-full max-w-md bg-black/60 rounded-lg p-4 font-mono text-xs space-y-1 border border-white/10">
            <div className="text-emerald-400">$ guidex deploy --template nginx --server prod-web-01</div>
            <div className="text-muted-foreground">→ Generating deployment plan…</div>
            <div className="text-muted-foreground">→ Awaiting reviewer approval…</div>
            <div className="text-emerald-400">✓ Approved by reviewer</div>
            <div className="text-primary">→ Executing 12 steps on prod-web-01</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary">Step 4/12: Installing dependencies…</span>
            </div>
          </div>

          <button
            onClick={() => setPlaying(true)}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-medium transition-all shadow-lg hover:shadow-primary/30 hover:scale-105"
          >
            <Play className="w-5 h-5 fill-white" />
            Watch Platform Demo
          </button>
          <p className="text-xs text-muted-foreground">Select <strong className="text-foreground">Infrastructure Copilot Video</strong> from the preview dropdown above</p>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-center p-8">
          <Monitor className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-white font-semibold">Switch to the video preview</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            Select <strong className="text-foreground">Infrastructure Copilot Video</strong> from the dropdown at the top of the preview pane to watch the full animated demo.
          </p>
          <button onClick={() => setPlaying(false)} className="text-xs text-muted-foreground hover:text-foreground underline">Go back</button>
        </div>
      )}
    </div>
  );
}

// ── Collapsible step section ──────────────────────────────────────────────────
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{n}</span>
        </div>
        <h3 className="flex-1 font-semibold text-foreground">{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 p-3 rounded-lg bg-black/40 border border-border text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

// ── Main GuideX page ──────────────────────────────────────────────────────────
export default function GuideXPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10 pb-16">

      {/* Hero */}
      <div className="text-center space-y-3 pt-4">
        <Badge className="bg-primary/10 text-primary border-primary/20">Setup Guide</Badge>
        <h1 className="text-3xl font-bold text-foreground">Welcome to GuideX</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Your AI-powered DevOps platform. Follow the steps below to connect your servers,
          create your team, and run your first deployment.
        </p>
      </div>

      {/* Video section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Platform Demo Video
        </h2>
        <VideoPreview />
      </div>

      {/* Role overview */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> User Roles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              role: "Engineer",
              color: "bg-blue-400/10 text-blue-400 border-blue-400/20",
              icon: Terminal,
              perms: ["Register servers", "Create deployments from templates", "Chat with AI assistant", "View monitoring & reports", "Generate documentation"],
            },
            {
              role: "Reviewer",
              color: "bg-amber-400/10 text-amber-400 border-amber-400/20",
              icon: CheckCircle2,
              perms: ["Everything Engineers can do", "Approve or reject deployments", "View deployment diffs", "Access full audit log"],
            },
            {
              role: "Admin",
              color: "bg-red-400/10 text-red-400 border-red-400/20",
              icon: Shield,
              perms: ["Everything Reviewers can do", "Manage organisation members", "Assign & change roles", "Invite / remove users", "Full platform control"],
            },
          ].map(({ role, color, icon: Icon, perms }) => (
            <div key={role} className={`rounded-xl border p-4 space-y-3 ${color}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-semibold">{role}</span>
              </div>
              <ul className="space-y-1">
                {perms.map(p => (
                  <li key={p} className="flex items-start gap-1.5 text-xs opacity-90">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-step setup */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Setup Guide
        </h2>
        <div className="space-y-3">

          <Step n={1} title="Create your account (Admin)">
            <p className="text-sm text-muted-foreground mt-3 mb-3">
              The first account is created by registering through the API. Use the endpoint below to create your Admin user, then log in with those credentials.
            </p>
            <CodeBlock>{`POST /api/auth/register
{
  "name": "Your Name",
  "email": "you@company.com",
  "password": "your-secure-password"
}`}</CodeBlock>
            <p className="text-sm text-muted-foreground mt-3">
              Then log in at the GuideX login page with that email and password. After logging in, go to <strong className="text-foreground">Organisation</strong> and set your role to <strong className="text-foreground">Admin</strong> via the API or directly in the database.
            </p>
          </Step>

          <Step n={2} title="Invite your team">
            <p className="text-sm text-muted-foreground mt-3 mb-3">
              Go to <Link href="/organization"><span className="text-primary underline cursor-pointer">Organisation →</span></Link> to invite colleagues.
              Enter their email, choose their role (Engineer / Reviewer / Admin), and click <strong className="text-foreground">Invite</strong>.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {["Engineer — creates & runs deployments", "Reviewer — approves deployments", "Admin — manages the whole org"].map(r => (
                <div key={r} className="p-3 rounded-lg bg-muted border border-border text-xs text-muted-foreground">{r}</div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Invited users register at <strong className="text-foreground">/api/auth/register</strong> with the same email you invited. Their role will be applied automatically.
            </p>
          </Step>

          <Step n={3} title="Add your first server">
            <p className="text-sm text-muted-foreground mt-3 mb-3">
              Go to <Link href="/servers"><span className="text-primary underline cursor-pointer">Servers →</span></Link> and click <strong className="text-foreground">Add Server</strong>. You will need:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-3">
              {[
                ["Hostname / IP", "The server's IP address or domain (e.g. 192.168.1.10 or myserver.company.com)"],
                ["SSH Port", "Usually 22 (default)"],
                ["SSH Username", "The user GuideX will SSH as (e.g. ubuntu, root, deploy)"],
                ["SSH Key or Password", "GuideX connects via SSH to execute deployments"],
                ["Operating System", "Ubuntu, Debian, CentOS, RHEL, etc."],
              ].map(([label, desc]) => (
                <li key={label} className="flex gap-2">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">{label}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <strong>Tip:</strong> Ensure GuideX can reach your server over SSH. If your server is behind a firewall, open port 22 (or your custom SSH port) to the GuideX host.
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              After adding, click <strong className="text-foreground">Test Connection</strong> to verify SSH access before creating any deployments.
            </p>
          </Step>

          <Step n={4} title="Create or import a template">
            <p className="text-sm text-muted-foreground mt-3 mb-3">
              Templates define <em>what</em> gets installed. Go to <Link href="/templates"><span className="text-primary underline cursor-pointer">Templates →</span></Link> and click <strong className="text-foreground">New Template</strong>.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                ["Software", "The package name (e.g. nginx, postgresql, docker-ce)"],
                ["Version", "The exact version to install (e.g. 1.28.0)"],
                ["Category", "web-server, database, container, monitoring, etc."],
                ["OS Requirements", "Which operating systems this template supports"],
                ["Steps", "The AI generates step-by-step installation steps automatically"],
              ].map(([label, desc]) => (
                <li key={label} className="flex gap-2">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">{label}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </Step>

          <Step n={5} title="Run your first deployment">
            <p className="text-sm text-muted-foreground mt-3 mb-3">
              Go to <Link href="/deployments"><span className="text-primary underline cursor-pointer">Deployments →</span></Link> and click <strong className="text-foreground">New Deployment</strong>. Select the server and template, give it a name, and submit.
            </p>
            <div className="flex items-start gap-2 mt-2">
              <div className="flex flex-col items-center gap-1">
                {["Engineer creates", "AI plans steps", "Reviewer approves", "Platform executes", "Audit log recorded"].map((s, i) => (
                  <div key={s} className="flex flex-col items-center">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground font-medium">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                      {s}
                    </div>
                    {i < 4 && <div className="w-px h-3 bg-border" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary mt-3">
              <strong>Note:</strong> Deployments require at least one <strong>Reviewer</strong> to approve before execution begins. Make sure you have a Reviewer in your organisation.
            </div>
          </Step>

          <Step n={6} title="Monitor your infrastructure">
            <p className="text-sm text-muted-foreground mt-3 mb-2">
              Once servers are connected, go to <Link href="/monitoring"><span className="text-primary underline cursor-pointer">Monitoring →</span></Link> to see real-time health metrics, CPU, memory, and disk usage.
            </p>
            <p className="text-sm text-muted-foreground">
              Alerts are triggered automatically when thresholds are breached. You will see them in the notification bell (top bar) and on the Monitoring page.
            </p>
          </Step>

          <Step n={7} title="Use the AI Assistant">
            <p className="text-sm text-muted-foreground mt-3 mb-2">
              Go to <Link href="/ai"><span className="text-primary underline cursor-pointer">AI Assistant →</span></Link> to ask questions about your infrastructure, get troubleshooting help, generate deployment plans, or ask for best practices.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                "How do I install Nginx with SSL?",
                "Troubleshoot high CPU on my server",
                "What are best practices for PostgreSQL backups?",
                "Generate a deployment plan for Docker CE",
              ].map(q => (
                <div key={q} className="p-2 rounded-lg bg-muted border border-border text-xs text-muted-foreground italic">"{q}"</div>
              ))}
            </div>
          </Step>

        </div>
      </div>

      {/* Quick links */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" /> Quick Navigation
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { href: "/servers", icon: Server, label: "Servers", desc: "Add & manage servers" },
            { href: "/deployments", icon: Rocket, label: "Deployments", desc: "Create & track deployments" },
            { href: "/templates", icon: Key, label: "Templates", desc: "Installation templates" },
            { href: "/monitoring", icon: Activity, label: "Monitoring", desc: "Health & alerts" },
            { href: "/ai", icon: Bot, label: "AI Assistant", desc: "Ask anything" },
            { href: "/organization", icon: Users, label: "Organisation", desc: "Team & roles" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="p-5 rounded-xl border border-border bg-card text-center space-y-2">
        <p className="text-sm text-foreground font-medium">GuideX — Enterprise DevOps Platform</p>
        <p className="text-xs text-muted-foreground">
          Powered by AI · Full audit trail · Role-based access control · SSH-native execution
        </p>
      </div>
    </div>
  );
}
