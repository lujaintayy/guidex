import { cn } from '@/lib/utils';

interface MetricsBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label: string;
  showLabel?: boolean;
}

export function MetricsBar({ value, max = 100, label, showLabel = true, className, ...props }: MetricsBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  let colorClass = 'bg-primary';
  if (percentage > 90) colorClass = 'bg-destructive';
  else if (percentage > 75) colorClass = 'bg-yellow-500';

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground">{value}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div 
          className={cn("h-full transition-all duration-500", colorClass)} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
