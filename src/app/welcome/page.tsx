import type { Metadata } from "next"
import { TopNav } from "@/components/landing/top-nav"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { PricingSection } from "@/components/landing/pricing-section"
import { TestimonialPlaceholder } from "@/components/landing/testimonial-placeholder"
import { BeforeAfterStrip } from "@/components/landing/before-after-strip"
import { BottomCta } from "@/components/landing/bottom-cta"
import { Footer } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "FitDesk — Run your training business from your phone",
  description:
    "FitDesk replaces your WhatsApp threads, Excel sheets, and invoicing app. Manage clients, sessions, and payments in one place. Free for your first 3 clients.",
  openGraph: {
    title: "FitDesk — Run your training business from your phone",
    description:
      "Manage clients, sessions, and payments in one place. Free for your first 3 clients, forever.",
  },
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        <Hero />
        <Features />
        <PricingSection />
        <TestimonialPlaceholder />
        <BeforeAfterStrip />
        <BottomCta />
      </main>
      <Footer />
    </div>
  )
}
