import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-purple-500/20 border border-purple-500/40 text-purple-300",
        secondary: "bg-white/10 border border-white/20 text-white/70",
        destructive: "bg-red-500/20 border border-red-500/40 text-red-400",
        success: "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400",
        warning: "bg-amber-500/20 border border-amber-500/40 text-amber-400",
        gold: "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400",
        outline: "border border-white/20 text-white/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
