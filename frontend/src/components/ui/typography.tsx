import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const typographyVariants = cva(
  "text-[#232f55]",
  {
    variants: {
      variant: {
        h1: "scroll-m-20 text-4xl font-black tracking-tight lg:text-5xl",
        h2: "scroll-m-20 pb-2 text-3xl font-black tracking-tight first:mt-0",
        h3: "scroll-m-20 text-2xl font-black tracking-tight",
        h4: "scroll-m-20 text-xl font-black tracking-tight",
        p: "leading-7 [&:not(:first-child)]:mt-6",
        lead: "text-xl text-muted-foreground",
        large: "text-lg font-semibold",
        small: "text-sm font-medium leading-none",
        muted: "text-sm text-muted-foreground",
        label: "text-[10px] font-black uppercase tracking-widest text-slate-300", // The specific style used often in this project
        subtle: "text-[11px] font-black uppercase tracking-widest opacity-60",
      },
    },
    defaultVariants: {
      variant: "p",
    },
  }
)

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label"
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    const Comp = as || "p"
    // Cast to any to avoid complex TS issues with dynamic tags ref
    return React.createElement(Comp, {
      className: cn(typographyVariants({ variant, className })),
      ref: ref as any,
      ...props,
    })
  }
)
Typography.displayName = "Typography"

export { Typography, typographyVariants }
