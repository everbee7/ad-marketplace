import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Variants follow DESIGN.md §6 "Buttons". `default` is the outlined blue primary with glow.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 border font-display whitespace-nowrap uppercase transition-[border-color,box-shadow,background-color,color] duration-150 ease-out outline-none select-none disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-md border-primary/80 bg-transparent text-[13px] font-bold tracking-[0.15em] text-foreground shadow-glow-primary hover:border-primary hover:shadow-glow-primary-strong",
        outline:
          "rounded-sm border-white/30 bg-transparent text-[11px] font-medium tracking-[0.09em] text-foreground hover:border-white aria-expanded:border-white",
        marketing:
          "rounded-none border-white bg-transparent font-sans font-medium tracking-[0.19em] text-foreground hover:bg-white hover:text-black",
        ghost:
          "rounded-md border-transparent bg-transparent text-[13px] font-light tracking-[0.15em] text-foreground-secondary hover:text-foreground aria-expanded:text-foreground",
        destructive:
          "rounded-sm border-destructive/60 bg-transparent text-[11px] font-medium tracking-[0.09em] text-destructive hover:border-destructive",
        secondary:
          "rounded-md border-border bg-surface-raised text-[13px] font-bold tracking-[0.15em] text-foreground hover:border-border-strong",
        link: "h-auto border-transparent p-0 normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-11 px-4 lg:h-8 lg:px-3",
        xs: "h-11 px-3 lg:h-7 lg:px-2.5",
        lg: "h-[50px] px-6 text-base",
        icon: "size-11 lg:size-9",
        "icon-sm": "size-11 lg:size-8",
        "icon-xs": "size-8 lg:size-7",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
