import type { Metadata } from "next"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  Clock,
  FileText,
} from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { PainPoints } from "./_components/pain-points"
import {
  MiniRow,
  MockCard,
  PhoneMockup,
  StatusPill,
} from "./_components/phone-mockup"
import { StickyNav } from "./_components/sticky-nav"

export const metadata: Metadata = {
  metadataBase: new URL("https://fitdesk.pro"),
  title: "FitDesk — One simple dashboard for trainers",
  description:
    "Know who paid, who owes, and how many sessions are left. FitDesk gives personal trainers one simple mobile dashboard to track client packages, completed sessions, pending payments, and monthly income — without spreadsheets or WhatsApp chaos.",
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card text-foreground">
      <StickyNav />

      <main className="pt-14">
        {/* ------------------------------------------------------------------ */}
        {/* SECTION 1 — Above the Fold                                          */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/10 via-primary/0 to-transparent" />

          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center md:py-20">
            <div className="fd-hero-enter">
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Know who paid, who owes, and how many sessions are left.
              </h1>

              <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
                FitDesk gives personal trainers one simple mobile dashboard to track
                client packages, completed sessions, pending payments, and monthly
                income — without spreadsheets or WhatsApp chaos.
              </p>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="btn-gradient fd-cta-pulse-once inline-flex h-12 items-center justify-center gap-2 rounded-lg px-7 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                >
                  Start Free <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free to start · No credit card required · Set up your first client
                  in under 5 minutes
                </p>
              </div>
            </div>

            <div className="md:justify-self-end">
              <PhoneMockup title="FitDesk" subtitle="Dashboard">
                <div className="grid grid-cols-2 gap-3">
                  <MockCard label="Active Clients" value="12" />
                  <MockCard label="Pending Payments" value="$840" tone="warning" />
                  <MockCard label="Sessions This Week" value="18" tone="success" />
                  <MockCard label="Monthly Income" value="$3,200" tone="primary" />
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">
                      Next up today
                    </div>
                    <span className="text-xs text-muted-foreground">6:45 PM</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        Kai — 1-on-1
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        3 sessions remaining · PayNow pending
                      </div>
                    </div>
                    <StatusPill tone="warning" text="Partial" />
                  </div>
                </div>
              </PhoneMockup>
            </div>
          </div>

          <div className="border-t border-border/40">
            <div className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
              Built for freelance personal trainers · No long-term contract · Your
              clients don&apos;t need to install anything
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 2 — Pain Section                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-card/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Still running your trainer business from WhatsApp, Excel, and memory?
            </h2>

            <div className="mt-8">
              <PainPoints
                items={[
                  {
                    id: "pp1",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "You finish a session but forget to update the count",
                  },
                  {
                    id: "pp2",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "A client says they have 3 sessions left — you think it's 2",
                  },
                  {
                    id: "pp3",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "Payments arrive partial, in installments, across different apps",
                  },
                  {
                    id: "pp4",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "You have no clear picture of what you actually earned this month",
                  },
                  {
                    id: "pp5",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "Renewals sneak up on you or slip past entirely",
                  },
                  {
                    id: "pp6",
                    icon: <AlertTriangle className="size-5" aria-hidden="true" />,
                    text: "Chasing payment feels awkward when you're supposed to be their trainer",
                  },
                ]}
              />
            </div>

            <p className="mt-10 text-center text-lg font-semibold text-foreground">
              You&apos;re not disorganized. You just don&apos;t have the right tool yet.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 3 — Value Propositions                                      */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="space-y-14">
              {[
                {
                  headline: "See unpaid dues before they become awkward.",
                  copy: "Know who paid in full, who paid partially, and who still owes — at a glance, before your next session with them. No more guessing, no more uncomfortable surprises.",
                  mock: (
                    <PhoneMockup title="Payments" subtitle="Status list">
                      <MiniRow
                        left={
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[color:var(--fd-green)]/80" />
                            <span className="truncate">Ayesha</span>
                          </div>
                        }
                        right={<StatusPill tone="success" text="Paid" />}
                      />
                      <MiniRow
                        left={
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[color:var(--fd-amber)]/80" />
                            <span className="truncate">Ben</span>
                          </div>
                        }
                        right={<StatusPill tone="warning" text="Partial" />}
                      />
                      <MiniRow
                        left={
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-[color:var(--fd-pink)]/80" />
                            <span className="truncate">Cheryl</span>
                          </div>
                        }
                        right={<StatusPill tone="danger" text="Owing" />}
                      />
                    </PhoneMockup>
                  ),
                },
                {
                  headline: "Never forget a client's remaining sessions again.",
                  copy: "Track package size, sessions completed, and sessions remaining for every client. No more mental math after training. No more disputes.",
                  mock: (
                    <PhoneMockup title="Client" subtitle="Package balance">
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Jia Wei</div>
                          <StatusPill tone="success" text="Active" />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <MockCard label="Package" value="10" />
                          <MockCard label="Done" value="7" tone="success" />
                          <MockCard label="Left" value="3" tone="warning" />
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/40">
                          <div className="h-full w-[70%] rounded-full bg-primary" />
                        </div>
                      </div>
                    </PhoneMockup>
                  ),
                },
                {
                  headline: "Know your actual monthly income, not a rough guess.",
                  copy: "See collected income, pending dues, and expected renewals in one income summary. Know exactly where your business stands at any point in the month.",
                  mock: (
                    <PhoneMockup title="Income" subtitle="This month">
                      <MockCard label="Collected" value="$2,400" tone="success" />
                      <MockCard label="Pending" value="$840" tone="warning" />
                      <MockCard label="Expected Renewals" value="$1,200" tone="primary" />
                    </PhoneMockup>
                  ),
                },
                {
                  headline: "Every client's history, organized without the admin.",
                  copy: "Session logs, payment records, package history, and notes — all linked to the client automatically. Nothing to manually file or remember.",
                  mock: (
                    <PhoneMockup title="History" subtitle="Client timeline">
                      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Recent sessions</div>
                          <span className="text-xs text-muted-foreground">May</span>
                        </div>
                        <div className="mt-3 space-y-3">
                          {[
                            { date: "May 6", label: "Session completed", tone: "success" as const },
                            { date: "May 3", label: "Payment received", tone: "success" as const },
                            { date: "Apr 29", label: "Payment pending", tone: "warning" as const },
                          ].map((row) => (
                            <div key={row.date} className="flex items-center gap-3">
                              <div className="w-14 text-xs text-muted-foreground tabular">
                                {row.date}
                              </div>
                              <div className="flex-1 text-sm text-foreground/90">
                                {row.label}
                              </div>
                              <StatusPill
                                tone={row.tone}
                                text={row.tone === "success" ? "OK" : "Due"}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </PhoneMockup>
                  ),
                },
                {
                  headline: "Built for trainers who work from their phone.",
                  copy: "Update sessions right after training. Check payment status before a client arrives. FitDesk works where you work — on the go, from your pocket.",
                  mock: (
                    <PhoneMockup title="Session" subtitle="Update">
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                        <div className="text-sm font-semibold">Client: Nur</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Session 7 of 10
                        </div>
                        <div className="mt-4">
                          <button
                            type="button"
                            className="btn-gradient inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                          >
                            Mark Session Complete
                          </button>
                        </div>
                      </div>
                    </PhoneMockup>
                  ),
                },
              ].map((vp, idx) => (
                <div
                  key={vp.headline}
                  className={[
                    "grid items-center gap-8 md:grid-cols-2",
                    idx % 2 === 1 ? "md:[&>div:first-child]:order-2" : "",
                  ].join(" ")}
                >
                  <div>
                    <h3 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
                      {vp.headline}
                    </h3>
                    <p className="mt-3 text-pretty text-sm text-muted-foreground sm:text-base">
                      {vp.copy}
                    </p>
                  </div>
                  <div>{vp.mock}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 4 — Visual Proof                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-card/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              See your trainer business clearly in one dashboard.
            </h2>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {[
                {
                  label: "Active Clients Overview",
                  mock: (
                    <PhoneMockup className="max-w-none" compact>
                      <div className="grid grid-cols-2 gap-2">
                        <MockCard label="Active" value="12" />
                        <MockCard label="Paused" value="2" tone="warning" />
                      </div>
                    </PhoneMockup>
                  ),
                },
                {
                  label: "Session Balance Per Client",
                  mock: (
                    <PhoneMockup className="max-w-none" compact>
                      <MiniRow left="Ayesha" right={<span className="text-sm font-bold tabular">3 left</span>} />
                      <MiniRow left="Ben" right={<span className="text-sm font-bold tabular">1 left</span>} />
                      <MiniRow left="Nur" right={<span className="text-sm font-bold tabular">6 left</span>} />
                    </PhoneMockup>
                  ),
                },
                {
                  label: "Pending Payment List",
                  mock: (
                    <PhoneMockup className="max-w-none" compact>
                      <MiniRow left="Cheryl" right={<StatusPill tone="danger" text="Owing" />} />
                      <MiniRow left="Kai" right={<StatusPill tone="warning" text="Partial" />} />
                      <MiniRow left="Jia Wei" right={<StatusPill tone="success" text="Paid" />} />
                    </PhoneMockup>
                  ),
                },
                {
                  label: "Monthly Income Summary",
                  mock: (
                    <PhoneMockup className="max-w-none" compact>
                      <MockCard label="Collected" value="$2,400" tone="success" />
                      <MockCard label="Pending" value="$840" tone="warning" />
                    </PhoneMockup>
                  ),
                },
                {
                  label: "Package Renewal Alerts",
                  mock: (
                    <PhoneMockup className="max-w-none" compact>
                      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Renewals</div>
                          <StatusPill tone="warning" text="Soon" />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          2 clients under 2 sessions remaining
                        </div>
                      </div>
                      <MiniRow left="Ben" right={<span className="text-sm font-bold tabular text-[color:var(--fd-amber)]">1 left</span>} />
                      <MiniRow left="Ayesha" right={<span className="text-sm font-bold tabular text-[color:var(--fd-amber)]">2 left</span>} />
                    </PhoneMockup>
                  ),
                },
              ].map((card, idx, arr) => (
                <div
                  key={card.label}
                  className={cn(
                    "space-y-2",
                    idx === arr.length - 1 && arr.length % 2 !== 0
                      ? "col-span-2 md:col-span-1 md:col-start-2"
                      : ""
                  )}
                >
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3 overflow-hidden">
                    {card.mock}
                  </div>
                  <div className="text-center text-xs font-semibold text-muted-foreground">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              Everything your trainer business needs to stay organized — on one screen.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 5 — How It Works                                            */}
        {/* ------------------------------------------------------------------ */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Set up your trainer dashboard in 3 simple steps.
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
              {[
                {
                  step: "1",
                  title: "Add your client and their package",
                  icon: <FileText className="size-5" aria-hidden="true" />,
                },
                {
                  step: "2",
                  title: "Mark sessions as completed after each training",
                  icon: <Clock className="size-5" aria-hidden="true" />,
                },
                {
                  step: "3",
                  title: "Track payments, balances, and income automatically",
                  icon: <CircleDollarSign className="size-5" aria-hidden="true" />,
                },
              ].map((s, idx) => (
                <div key={s.step} className="relative">
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        <span className="text-sm font-bold tabular">{s.step}</span>
                      </div>
                      <div className="text-primary">{s.icon}</div>
                    </div>
                    <div className="mt-4 text-sm font-semibold text-foreground">
                      Step {s.step}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {s.title}
                    </div>
                  </div>

                  {idx < 2 ? (
                    <div className="pointer-events-none absolute right-[-18px] top-1/2 hidden -translate-y-1/2 md:block">
                      <ArrowRight
                        className="size-5 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/login"
                className="btn-gradient inline-flex h-12 items-center justify-center gap-2 rounded-lg px-7 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
              >
                Start Free <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Free to start · No credit card · First client set up in under 5 minutes
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 6 — FAQ                                                     */}
        {/* ------------------------------------------------------------------ */}
        <section className="bg-card/20">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Questions trainers usually ask
            </h2>

            <div className="mt-8 rounded-2xl border border-border/60 bg-background/40 px-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="q1">
                  <AccordionTrigger>
                    Do my clients need to download the app?
                  </AccordionTrigger>
                  <AccordionContent>
                    No. FitDesk is your private business dashboard. Your clients
                    don&apos;t need to install or sign up for anything.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2">
                  <AccordionTrigger>Can I track partial payments?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Record full payments, partial payments, and outstanding
                    balances for every client separately.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3">
                  <AccordionTrigger>Can I import my existing clients?</AccordionTrigger>
                  <AccordionContent>
                    You can add your existing clients manually in minutes. If you&apos;re
                    currently using a spreadsheet, the switch takes less than one session.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4">
                  <AccordionTrigger>Can this replace my Excel spreadsheet?</AccordionTrigger>
                  <AccordionContent>
                    Yes. FitDesk is built specifically to replace the manual tracking
                    most trainers do in spreadsheets, notes apps, and WhatsApp.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5">
                  <AccordionTrigger>Is it really free to start?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Start free with no credit card required. Set up your first client
                    in under 5 minutes.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q6">
                  <AccordionTrigger>Is my data private and secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Your client data is private to your account and stored securely.
                    Clients cannot see your dashboard.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* SECTION 7 — Closer / Final CTA                                      */}
        {/* ------------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-primary/10 via-primary/0 to-transparent" />

          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Stop guessing. Start running your trainer business clearly.
              </h2>
              <p className="mt-3 text-pretty text-sm text-muted-foreground sm:text-base">
                Track clients, sessions, payments, and monthly income from one simple
                dashboard — built for trainers, not accountants.
              </p>
            </div>

            <div className="mt-10">
              <div className="mx-auto max-w-[360px]">
                <PhoneMockup title="FitDesk" subtitle="Dashboard">
                  <div className="grid grid-cols-2 gap-3">
                    <MockCard label="Active Clients" value="12" />
                    <MockCard label="Pending Payments" value="$840" tone="warning" />
                    <MockCard label="Sessions This Week" value="18" tone="success" />
                    <MockCard label="Monthly Income" value="$3,200" tone="primary" />
                  </div>
                </PhoneMockup>
              </div>

              <div className="mt-8">
                <Link
                  href="/login"
                  className="btn-gradient inline-flex h-12 items-center justify-center gap-2 rounded-lg px-7 text-base font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
                >
                  Start Free <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free to start · No credit card required · Set up your first client
                  in under 5 minutes
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* FOOTER                                                             */}
        {/* ------------------------------------------------------------------ */}
        <footer className="border-t border-border/50 bg-background/40">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>© {new Date().getFullYear()} FitDesk</div>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/privacy"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="rounded-md outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
