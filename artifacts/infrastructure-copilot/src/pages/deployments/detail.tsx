import { useRoute, Link } from "wouter";
import { ChevronRight, ArrowLeft, CheckCircle2, XCircle, Clock, Play, RotateCcw, AlertTriangle, Terminal, ShieldCheck, ShieldX, Loader2 } from "lucide-react";
import { useGetDeployment, useGetDeploymentSteps, useGetDeploymentLogs, useApproveDeployment, useExecuteDeployment, useRollbackDeployment, getGetDeploymentQueryKey, getGetDeploymentStepsQueryKey, getGetDeploymentLogsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MOCK_DEPLOYMENTS } from "@/lib/mock-data";
import { useQueryClient } from "@tanstack/react-query";

const MOCK_STEPS = [
  { id: 1, order: 1, name: "Pre-flight check", description: "Verify server connectivity", command: "systemctl status && df -h", status: "completed", duration: 8, output: "All checks passed. Disk: 45% used, Memory: 62% used." },
  { id: 2, order: 2, name: "Update package list", description: "Refresh OS repositories", command: "apt-get update -y", status: "completed", duration: 24, output: "Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease\nReading package lists... Done" },
  { id: 3, order: 3, name: "Install dependencies", description: "Install required packages", command: "apt-get install -y curl wget", status: "completed", duration: 45, output: "Setting up curl (8.5.0-2ubuntu10.4) ...\nSetting up wget (1.21.4-1ubuntu4.1) ..." },
  { id: 4, order: 4, name: "Install software", description: "Main installation step", command: "apt-get install -y nginx", status: "running", duration: null, output: null },
  { id: 5, order: 5, name: "Configure and start", description: "Apply config and start service", command: "systemctl enable nginx && systemctl start nginx", status: "pending", duration: null, output: null },
  { id: 6, order: 6, name: "Verify installation", description: "Run health checks", command: "nginx -v && systemctl status nginx", status: "pending", duration: null, output: null },
];

const MOCK_LOGS = [
  { id: 1, level: "info", message: "Deployment execution started", stepName: null, timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: 2, level: "success", message: "Pre-flight check passed", stepName: "Pre-flight check", timestamp: new Date(Date.now() - 112000).toISOString() },
  { id: 3, level: "info", message: "Updating package repositories...", stepName: "Update package list", timestamp: new Date(Date.now() - 104000).toISOString() },
  { id: 4, level: "success", message: "Package list updated successfully", stepName: "Update package list", timestamp: new Date(Date.now() - 80000).toISOString() },
  { id: 5, level: "info", message: "Installing curl wget...", stepName: "Install dependencies", timestamp: new Date(Date.now() - 60000).toISOString() },
  { id: 6, level: "success", message: "Dependencies installed", stepName: "Install dependencies", timestamp: new Date(Date.now() - 15000).toISOString() },
  { id: 7, level: "info", message: "Starting main installation...", stepName: "Install software", timestamp: new Date(Date.now() - 5000).toISOString() },
];

function StepIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
  if (status === "failed") return <XCircle className="w-5 h-5 text-red-400 shrink-0" />;
  if (status === "running") return <Loader2 className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />;
  return <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />;
}

function LogLevel({ level }: { level: string }) {
  const colors: Record<string, string> = { info: "text-blue-400", warn: "text-amber-400", error: "text-red-400", success: "text-emerald-400", debug: "text-slate-400" };
  return <span className={`uppercase text-[10px] font-bold w-14 ${colors[level] ?? "text-muted-foreground"}`}>{level}</span>;
}

export default function DeploymentDetailPage() {
  const [, params] = useRoute("/deployments/:id");
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const deploymentId = parseInt(params?.id ?? "1");

  const { data: deployment, isLoading } = useGetDeployment(orgId, deploymentId, { query: { queryKey: getGetDeploymentQueryKey(orgId, deploymentId) } });
  const { data: steps } = useGetDeploymentSteps(orgId, deploymentId, { query: { queryKey: getGetDeploymentStepsQueryKey(orgId, deploymentId) } });
  const { data: logs } = useGetDeploymentLogs(orgId, deploymentId, { query: { queryKey: getGetDeploymentLogsQueryKey(orgId, deploymentId) } });

  const approve = useApproveDeployment({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDeploymentQueryKey(orgId, deploymentId) }) } });
  const execute = useExecuteDeployment({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDeploymentQueryKey(orgId, deploymentId) }) } });
  const rollback = useRollbackDeployment({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetDeploymentQueryKey(orgId, deploymentId) }) } });

  const d = deployment ?? MOCK_DEPLOYMENTS.find(d => d.id === deploymentId) ?? MOCK_DEPLOYMENTS[0];
  const stepsList = (steps && steps.length > 0 ? steps : MOCK_STEPS) as any[];
  const logsList = (logs && logs.length > 0 ? logs : MOCK_LOGS) as any[];
  const plan = (d as any)?.plan as any;

  if (isLoading) return <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;

  const canApprove = d?.status === "awaiting_approval";
  const canExecute = d?.status === "approved";
  const canRollback = d?.status === "completed" || d?.status === "failed";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/deployments"><span className="hover:text-foreground cursor-pointer flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Deployments</span></Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{d?.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{d?.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={d?.status ?? "pending"} />
            <span className="text-sm text-muted-foreground">{d?.serverName} · {d?.templateName ?? (d as any)?.templateSoftware}</span>
            <span className="text-sm text-muted-foreground">by {d?.createdByName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button variant="outline" size="sm" className="text-red-400 hover:text-red-400 hover:bg-red-400/10 border-red-400/30"
                onClick={() => approve.mutate({ orgId, deploymentId, data: { decision: "rejected", comment: "" } })}
                data-testid="btn-reject-deployment">
                <ShieldX className="w-3.5 h-3.5 mr-1.5" />Reject
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => approve.mutate({ orgId, deploymentId, data: { decision: "approved", comment: "" } })}
                disabled={approve.isPending} data-testid="btn-approve-deployment">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Approve
              </Button>
            </>
          )}
          {canExecute && (
            <Button size="sm"
              onClick={() => execute.mutate({ orgId, deploymentId })}
              disabled={execute.isPending} data-testid="btn-execute-deployment">
              {execute.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              Execute
            </Button>
          )}
          {canRollback && (
            <Button variant="outline" size="sm" className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
              onClick={() => rollback.mutate({ orgId, deploymentId })}
              data-testid="btn-rollback-deployment">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Rollback
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Plan */}
        {plan && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground">AI Deployment Plan</h2>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Why Required</p>
              <p className="text-sm text-foreground">{plan.whyRequired}</p>
            </div>
            {plan.risks?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Risks</p>
                <div className="space-y-1.5">
                  {plan.risks.map((r: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-foreground">{r.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Mitigation: {r.mitigation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {plan.dependencies?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Dependencies</p>
                <ul className="space-y-1">
                  {plan.dependencies.map((dep: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />{dep}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground">Est. Duration</p>
                <p className="text-sm font-medium text-foreground">{plan.estimatedDuration ? `${Math.floor(plan.estimatedDuration / 60)}m` : "—"}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-[10px] text-muted-foreground">Est. Downtime</p>
                <p className="text-sm font-medium text-foreground">{plan.estimatedDowntime ? `${plan.estimatedDowntime}s` : "None"}</p>
              </div>
            </div>
            {plan.rollbackStrategy && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Rollback Strategy</p>
                <p className="text-xs text-foreground bg-muted p-2 rounded">{plan.rollbackStrategy}</p>
              </div>
            )}
          </div>
        )}

        {/* Steps timeline */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground mb-4">Execution Steps</h2>
          <div className="relative space-y-0">
            {stepsList.map((step: any, i: number) => (
              <div key={step.id ?? i} className="flex gap-3" data-testid={`step-${step.order}`}>
                <div className="flex flex-col items-center">
                  <StepIcon status={step.status} />
                  {i < stepsList.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className="flex-1 pb-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>{step.name}</p>
                    {step.duration && <span className="text-[10px] text-muted-foreground">{step.duration}s</span>}
                  </div>
                  {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
                  {step.command && (
                    <code className="block mt-1 text-[10px] font-mono bg-muted px-2 py-1 rounded text-foreground truncate">{step.command}</code>
                  )}
                  {step.output && (
                    <pre className="mt-1 text-[10px] font-mono bg-muted px-2 py-1 rounded text-emerald-400 whitespace-pre-wrap line-clamp-2">{step.output}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Deployment Logs</h2>
        </div>
        <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
          {logsList.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3">
              <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <LogLevel level={log.level} />
              {log.stepName && <span className="text-slate-500 shrink-0">[{log.stepName}]</span>}
              <span className={log.level === "error" ? "text-red-400" : log.level === "success" ? "text-emerald-400" : log.level === "warn" ? "text-amber-400" : "text-foreground"}>{log.message}</span>
            </div>
          ))}
          {logsList.length === 0 && <p className="text-muted-foreground text-center py-4">No logs yet</p>}
        </div>
      </div>
    </div>
  );
}
