import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Reuses the .btn family from nocturne.css instead of reinventing button
// styling in Tailwind utilities -- primary stays an accent outline, never a
// fill, per the design system's own "outline primary actions" rule.
const buttonVariants = cva(
  "btn disabled:opacity-45 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        default: "btn-primary",
        secondary: "btn-secondary",
        outline: "btn-secondary",
        ghost: "btn-ghost",
        destructive:
          "text-danger border-danger hover:bg-danger/10 active:bg-danger/20",
        link: "btn-ghost underline underline-offset-4",
      },
      size: {
        default: "",
        xs: "text-[11px] py-1 px-2",
        sm: "text-xs",
        lg: "text-[15px] py-2.5 px-4",
        icon: "btn-icon",
        "icon-xs": "btn-icon !w-6 !h-6",
        "icon-sm": "btn-icon !w-7 !h-7",
        "icon-lg": "btn-icon !w-9 !h-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
