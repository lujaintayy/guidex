import { cn } from "@/lib/utils";

interface MetricBarProps {
  value: number | null | undefined;
  label?: string;
  className?: string;
}

function getBarColor(value: number): string {
  if (value >= 90) return "bg-red-500";
  if (value >= 75) return "bg-amber-500";
  return "bg-primary";
}

export function MetricBar({ value, label, className }: MetricBarProps) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[48px]">
        <div
          className={cn("h-full rounded-full transition-all", getBarColor(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      {label !== undefined && <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{Math.round(value)}%</span>}
    </div>
  );
}

interface MetricGroupProps {
  cpu?: number | null;
  mem?: number | null;
  disk?: number | null;
}

export function MetricGroup({ cpu, mem, disk }: MetricGroupProps) {
  return (
    <div className="space-y-1 min-w-[80px]">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-7">CPU</span>
        <MetricBar value={cpu} label="" />
        <span className="text-[10px] tabular-nums text-muted-foreground w-6">{cpu != null ? `${Math.round(cpu)}%` : "—"}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-7">MEM</span>
        <MetricBar value={mem} label="" />
        <span className="text-[10px] tabular-nums text-muted-foreground w-6">{mem != null ? `${Math.round(mem)}%` : "—"}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground w-7">DISK</span>
        <MetricBar value={disk} label="" />
        <span className="text-[10px] tabular-nums text-muted-foreground w-6">{disk != null ? `${Math.round(disk)}%` : "—"}</span>
      </div>
    </div>
  );
}
