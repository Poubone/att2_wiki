import { clsx } from "../lib/ui";
import type { ReactNode } from "react";

export function Chip({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "rarity" | "type" | "boss" | "elite";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full border-2 px-3 py-1.5 text-sm font-medium";
  const variants: Record<string, string> = {
    default: "border-border bg-secondary text-foreground",
    rarity: "border-primary/50 bg-primary/20 text-primary",
    type: "border-green-400/50 bg-green-500/20 text-green-200",
    boss: "border-orange-400/50 bg-orange-500/20 text-orange-200",
    elite: "border-amber-400/50 bg-amber-500/20 text-amber-200",
  };

  return <span className={clsx(base, variants[variant], className)}>{children}</span>;
}

