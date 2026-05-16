import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white shadow-sm font-black uppercase tracking-widest text-[9px]",
        secondary: "border-transparent bg-slate-100 text-slate-600 font-bold uppercase tracking-widest text-[9px]",
        destructive: "border-transparent bg-red-500 text-white shadow-sm font-black uppercase tracking-widest text-[9px]",
        outline: "text-slate-500 border-slate-200 font-bold uppercase tracking-widest text-[9px]",
        success: "border-transparent bg-[#22c55e] text-white shadow-sm font-black uppercase tracking-widest text-[9px]",
        info: "border-transparent bg-[#00a3e0] text-white shadow-sm font-black uppercase tracking-widest text-[9px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
