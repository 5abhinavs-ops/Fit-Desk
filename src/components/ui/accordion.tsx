"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Minimal accordion — no external dependency.
// Supports type="single" collapsible (same API surface Cursor used).

interface AccordionContextValue {
  openItem: string | null
  setOpenItem: (val: string | null) => void
  collapsible: boolean
}

const AccordionContext = React.createContext<AccordionContextValue>({
  openItem: null,
  setOpenItem: () => {},
  collapsible: true,
})

interface AccordionProps {
  type?: "single"
  collapsible?: boolean
  children: React.ReactNode
  className?: string
}

function Accordion({ collapsible = true, children, className }: AccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(null)
  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem, collapsible }}>
      <div className={cn("divide-y divide-border/60", className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <div data-accordion-item={value} className={cn("py-1", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(
          child as React.ReactElement<{ value?: string }>,
          { value }
        )
      })}
    </div>
  )
}

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
  value?: string
}

function AccordionTrigger({ children, className, value }: AccordionTriggerProps) {
  const { openItem, setOpenItem, collapsible } =
    React.useContext(AccordionContext)
  const isOpen = openItem === value

  function handleClick() {
    if (isOpen && collapsible) {
      setOpenItem(null)
    } else if (value) {
      setOpenItem(value)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
        aria-hidden="true"
      />
    </button>
  )
}

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
  value?: string
}

function AccordionContent({ children, className, value }: AccordionContentProps) {
  const { openItem } = React.useContext(AccordionContext)
  const isOpen = openItem === value

  if (!isOpen) return null

  return (
    <div className={cn("pb-4 text-sm leading-relaxed text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
