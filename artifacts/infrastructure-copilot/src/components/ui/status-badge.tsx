import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  // Server status
  online: { label: "Online", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
  offline: { label: "Offline", dotColor: "bg-red-400", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  unknown: { label: "Unknown", dotColor: "bg-slate-400", bgColor: "bg-slate-400/10", textColor: "text-slate-400" },
  maintenance: { label: "Maintenance", dotColor: "bg-amber-400", bgColor: "bg-amber-400/10", textColor: "text-amber-400" },
  // Deployment status
  pending: { label: "Pending", dotColor: "bg-slate-400", bgColor: "bg-slate-400/10", textColor: "text-slate-400" },
  planning: { label: "Planning", dotColor: "bg-blue-400", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  planned: { label: "Planned", dotColor: "bg-blue-400", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  awaiting_approval: { label: "Awaiting Approval", dotColor: "bg-amber-400", bgColor: "bg-amber-400/10", textColor: "text-amber-400" },
  approved: { label: "Approved", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
  rejected: { label: "Rejected", dotColor: "bg-red-400", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  running: { label: "Running", dotColor: "bg-blue-400 animate-pulse", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  completed: { label: "Completed", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
  failed: { label: "Failed", dotColor: "bg-red-400", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  rolling_back: { label: "Rolling Back", dotColor: "bg-amber-400 animate-pulse", bgColor: "bg-amber-400/10", textColor: "text-amber-400" },
  rolled_back: { label: "Rolled Back", dotColor: "bg-slate-400", bgColor: "bg-slate-400/10", textColor: "text-slate-400" },
  // Alert severity
  info: { label: "Info", dotColor: "bg-blue-400", bgColor: "bg-blue-400/10", textColor: "text-blue-400" },
  warning: { label: "Warning", dotColor: "bg-amber-400", bgColor: "bg-amber-400/10", textColor: "text-amber-400" },
  critical: { label: "Critical", dotColor: "bg-red-400 animate-pulse", bgColor: "bg-red-400/10", textColor: "text-red-400" },
  // Step status
  skipped: { label: "Skipped", dotColor: "bg-slate-400", bgColor: "bg-slate-400/10", textColor: "text-slate-400" },
  success: { label: "Success", dotColor: "bg-emerald-400", bgColor: "bg-emerald-400/10", textColor: "text-emerald-400" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, dotColor: "bg-slate-400", bgColor: "bg-slate-400/10", textColor: "text-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", config.bgColor, config.textColor, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)} />
      {config.label}
    </span>
  );
}
