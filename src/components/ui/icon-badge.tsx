import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconBadgeVariant = "teal" | "indigo" | "amber" | "green";

const variantStyles: Record<IconBadgeVariant, { bg: string; icon: string; shadow: string }> = {
  teal: {
    bg: "bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/40 dark:to-teal-800/40",
    icon: "text-teal-600 dark:text-teal-300",
    shadow: "shadow-[0_2px_6px_rgba(13,148,136,0.15)]",
  },
  indigo: {
    bg: "bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/40 dark:to-indigo-800/40",
    icon: "text-indigo-500 dark:text-indigo-400",
    shadow: "shadow-[0_2px_6px_rgba(99,102,241,0.15)]",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40",
    icon: "text-amber-600 dark:text-amber-400",
    shadow: "shadow-[0_2px_6px_rgba(245,158,11,0.15)]",
  },
  green: {
    bg: "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40",
    icon: "text-green-600 dark:text-green-400",
    shadow: "shadow-[0_2px_6px_rgba(34,197,94,0.15)]",
  },
};

interface IconBadgeProps {
  icon: LucideIcon;
  variant?: IconBadgeVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: { container: "w-8 h-8", icon: "w-4 h-4" },
  md: { container: "w-10 h-10", icon: "w-5 h-5" },
  lg: { container: "w-12 h-12", icon: "w-6 h-6" },
};

export function IconBadge({
  icon: Icon,
  variant = "teal",
  size = "md",
  className,
  label,
}: IconBadgeProps) {
  const styles = variantStyles[variant];
  const dimensions = sizeMap[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl",
        styles.bg,
        styles.shadow,
        dimensions.container,
        className
      )}
      {...(label ? { "aria-label": label, role: "img" } : { "aria-hidden": true })}
    >
      <Icon className={cn(dimensions.icon, styles.icon)} strokeWidth={2.5} />
    </div>
  );
}
