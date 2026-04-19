import type { ReactElement } from "react"
import { Quote } from "lucide-react"
import { Icon } from "@/components/ui/icon"

export function TestimonialPlaceholder(): ReactElement {
  // TODO: replace with real testimonial
  return (
    <section
      aria-labelledby="testimonial-heading"
      className="mx-auto max-w-3xl px-6 py-8 md:py-12"
    >
      <h2 id="testimonial-heading" className="sr-only">
        Trainer testimonial
      </h2>
      <figure className="rounded-2xl border border-border bg-card p-8 md:p-10 relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle at center, rgba(0,198,212,0.35), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="text-fd-cyan mb-4">
          <Icon name={Quote} size="lg" aria-hidden />
        </div>
        <blockquote className="text-body-lg text-foreground font-medium leading-relaxed">
          &ldquo;I got paid 3 days faster in my first week — and stopped chasing
          clients on WhatsApp.&rdquo;
        </blockquote>
        <figcaption className="mt-6 text-body-sm text-muted-foreground">
          — Beta PT, Singapore
        </figcaption>
      </figure>
    </section>
  )
}
