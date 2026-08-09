import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5",
        destructive:
          "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30",
        outline:
          "border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400",
        secondary:
          "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10",
        ghost:
          "text-white/70 hover:bg-white/5 hover:text-white",
        link:
          "text-purple-400 underline-offset-4 hover:underline p-0 h-auto",
        gold:
          "bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-semibold shadow-lg shadow-amber-500/30 hover:-translate-y-0.5",
        glass:
          "bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/10",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
