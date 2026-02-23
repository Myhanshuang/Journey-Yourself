import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[24px] text-sm font-black uppercase tracking-widest ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#232f55] text-primary-foreground hover:bg-[#232f55]/90 shadow-2xl shadow-[#232f55]/20",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-[#6ebeea]/10 text-[#6ebeea] border border-[#6ebeea] hover:bg-[#6ebeea]/20",
        ghost: "hover:bg-accent hover:text-accent-foreground text-[#232f55]/60",
        link: "text-primary underline-offset-4 hover:underline",
        active: "bg-[#6ebeea]/10 border-[#6ebeea] text-[#6ebeea] shadow-sm", // Specialized active state from OptionButton
        inactive: "bg-white/50 border-white text-[#232f55]/40 hover:bg-white/80 hover:border-slate-200 border", // Specialized inactive state from OptionButton
      },
      size: {
        default: "h-12 px-6 py-3", // Standard touch target
        sm: "h-9 rounded-[16px] px-4 text-xs",
        lg: "h-14 rounded-[32px] px-10 text-base", // Larger for main actions
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    // If asChild is true, we need to install @radix-ui/react-slot, but I don't have it.
    // So I will default to basic button if Slot is not available, or just ignore asChild for now if I can't install it.
    // Actually, I should probably check if I can install it. But for now, let's assume standard button.
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
