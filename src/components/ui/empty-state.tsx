import type { ReactElement } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EmptyStateActionInternalLink = {
  label: string
  href: string
  external?: false
  onClick?: never
}

type EmptyStateActionExternalLink = {
  label: string
  href: string
  external: true
  onClick?: never
}

type EmptyStateActionHandler = {
  label: string
  onClick: () => void
  href?: never
  external?: never
}

export type EmptyStateAction =
  | EmptyStateActionInternalLink
  | EmptyStateActionExternalLink
  | EmptyStateActionHandler

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: EmptyStateAction
  className?: string
}

// External hrefs come from app data (e.g. trainer.whatsapp_number → wa.me URL).
// Reject any non-https scheme at the render boundary — TypeScript can't stop a
// caller who bypasses the type via `any`, and FitDesk has a prior
// `javascript:` XSS incident on the Instagram field (see CLAUDE.md).
function safeExternalHref(href: string): string {
  return href.startsWith("https://") ? href : "#"
}

function renderAction(action: EmptyStateAction): ReactElement {
  // Branch order is deliberate: onClick is the most specific discriminant
  // (its presence excludes both link variants via the union's `?: never`).
  // Re-ordering could let a malformed runtime object slip into a link branch
  // and bypass the https-only guard.
  if ("onClick" in action) {
    return <Button onClick={action.onClick}>{action.label}</Button>
  }
  if (action.external) {
    // target="_blank" + rel="noopener noreferrer" together prevent
    // window.opener hijack and referrer leak on cross-origin navigation.
    return (
      <a
        href={safeExternalHref(action.href)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button>{action.label}</Button>
      </a>
    )
  }
  return (
    <Link href={action.href}>
      <Button>{action.label}</Button>
    </Link>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: EmptyStateProps): ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-2 py-8",
        className,
      )}
    >
      <Icon name={icon} size="lg" className="text-muted-foreground" />
      {/* h2: empty states are page-zone headings; screen readers rely on
          heading semantics for landmark navigation. */}
      <h2 className="text-display-sm font-semibold">{title}</h2>
      {body !== undefined && (
        <p className="text-body-sm text-muted-foreground max-w-xs">{body}</p>
      )}
      {action !== undefined && renderAction(action)}
    </div>
  )
}
