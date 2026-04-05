import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-2 py-0.5 text-[10px] font-extrabold tracking-[0.04em] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[rgba(0,198,212,0.15)] text-[#00C6D4] border-[rgba(0,198,212,0.3)]",
        secondary: "bg-[#1A3349] text-[#7A9BB5] border-transparent",
        destructive: "bg-[rgba(255,76,122,0.15)] text-[#FF4C7A] border-[rgba(255,76,122,0.3)]",
        outline: "bg-[rgba(255,179,71,0.15)] text-[#FFB347] border-[rgba(255,179,71,0.3)]",
        ghost: "bg-[rgba(0,224,150,0.15)] text-[#00E096] border-[rgba(0,224,150,0.3)]",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
