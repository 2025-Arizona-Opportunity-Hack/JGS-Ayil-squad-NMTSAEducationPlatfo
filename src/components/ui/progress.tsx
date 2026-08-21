import { cn } from "@/lib/utils";

type ProgressProps = {
  /** Percent complete, 0–100. */
  value: number;
  /** Accessible name for the progress bar (also announced by screen readers). */
  label: string;
  className?: string;
};

// Determinate progress bar (WCAG: value is exposed via aria attributes and
// duplicated as visible text, never conveyed by color alone).
export function Progress({ value, label, className }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
        className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span
        className="w-10 text-right text-sm tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        {clamped}%
      </span>
    </div>
  );
}
