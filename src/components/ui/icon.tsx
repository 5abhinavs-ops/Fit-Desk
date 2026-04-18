import type { ReactElement } from "react"
import type { LucideIcon, LucideProps } from "lucide-react"
import { cn } from "@/lib/utils"

export type IconSize = "sm" | "md" | "lg"

const SIZE_PX: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

// Emitting a Tailwind size-* class lets parent selectors like
// `[&_svg:not([class*='size-'])]:size-4` step aside — otherwise they would
// silently override our width/height attributes via CSS specificity.
const SIZE_CLASS: Record<IconSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
}

type IconProps = Omit<LucideProps, "size" | "name"> & {
  name: LucideIcon
  size?: IconSize
}

export function Icon({
  name: LucideComponent,
  size = "md",
  className,
  "aria-label": ariaLabel,
  ...rest
}: IconProps): ReactElement {
  const px = SIZE_PX[size]
  return (
    <LucideComponent
      {...rest}
      width={px}
      height={px}
      className={cn(SIZE_CLASS[size], className)}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  )
}
