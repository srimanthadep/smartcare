import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from '@/shared/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 luxury-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "border border-primary/20 bg-gradient-to-r from-[#ff8f3a] via-[#ff7a1a] to-[#e76509] text-white shadow-[0_10px_25px_rgba(255,122,26,0.28)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(255,122,26,0.32)]",
        outline:
          "border border-border/70 bg-white/80 text-foreground shadow-sm hover:border-primary/30 hover:bg-white hover:text-foreground hover:shadow-md",
        secondary:
          "border border-white/50 bg-secondary/80 text-secondary-foreground shadow-sm hover:bg-secondary",
        ghost:
          "text-foreground hover:bg-secondary/80 hover:text-foreground",
        link: "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline",
        destructive:
          "border border-destructive/20 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-6 text-sm",
        icon: "h-11 w-11 rounded-2xl",
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
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
