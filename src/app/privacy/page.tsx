import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — FitDesk",
  description:
    "How FitDesk collects, stores, and protects personal data for trainers and their clients. Singapore PDPA compliant.",
}

const LAST_UPDATED = "21 April 2026"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/welcome" className="text-sm font-semibold tracking-tight">
            FitDesk
          </Link>
          <Link
            href="/login"
            className="btn-gradient inline-flex h-7 items-center justify-center rounded-[min(var(--radius-md),12px)] px-2.5 text-micro font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
          >
            Start Free
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-12">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </header>

          <section className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-[color:var(--fd-cyan)] [&_a]:underline-offset-4 hover:[&_a]:underline">

            <p>
              This Privacy Policy explains how FitDesk (&quot;we&quot;, &quot;us&quot;)
              collects, uses, and protects personal data. FitDesk is operated as a
              personal undertaking based in Singapore and complies with the Personal
              Data Protection Act 2012 (&quot;PDPA&quot;).
            </p>

            <h2>1. Who this applies to</h2>
            <p>
              FitDesk is used by two groups of people:
            </p>
            <ul>
              <li>
                <strong className="text-foreground">Trainers</strong> — personal trainers
                and fitness coaches who register FitDesk accounts.
              </li>
              <li>
                <strong className="text-foreground">Clients</strong> — end-users whose
                data is entered or uploaded by a trainer.
              </li>
            </ul>
            <p>
              For trainer data, FitDesk is the data controller. For client data,
              FitDesk is a data intermediary acting on the trainer&apos;s instructions;
              the trainer is the data controller responsible for obtaining consent
              and handling access or deletion requests.
            </p>

            <h2>2. What we collect</h2>

            <h3>From trainers</h3>
            <ul>
              <li>Name, email, WhatsApp number, profile details, and business preferences you enter at signup or in settings.</li>
              <li>Authentication data (hashed password, session cookies, SMS login tokens).</li>
              <li>Stripe customer ID and subscription status (we never see full card numbers — Stripe handles that).</li>
              <li>Usage events: pages visited, features used, timestamps. Collected via Vercel Analytics on an aggregated, cookie-less basis.</li>
              <li>Device and network metadata: IP address, user-agent, approximate region.</li>
            </ul>

            <h3>From clients (entered by their trainer)</h3>
            <ul>
              <li>Name, WhatsApp number, optional email.</li>
              <li>Training goals, injuries, medical notes, emergency contacts — only if the trainer enters them.</li>
              <li>Session records, package balances, payment logs.</li>
              <li>Photos or documents the trainer uploads (e.g. payment proof, progress photos).</li>
              <li>Nutrition log entries submitted through a trainer-shared client portal.</li>
            </ul>

            <h2>3. How we use data</h2>
            <ul>
              <li>To provide the core features trainers sign up for: client records, session booking, package tracking, payment logging.</li>
              <li>To send automated reminders via WhatsApp or SMS, on the trainer&apos;s behalf.</li>
              <li>To operate Stripe subscription billing for Pro plans.</li>
              <li>To authenticate users and keep their accounts secure.</li>
              <li>To monitor performance and diagnose errors (Sentry, server logs).</li>
              <li>To improve the Service based on aggregated usage patterns.</li>
              <li>To comply with legal obligations and respond to lawful requests.</li>
            </ul>
            <p>
              We do not sell personal data. We do not use client medical or
              health-related information for advertising. We do not build
              cross-site advertising profiles.
            </p>

            <h2>4. Legal basis (PDPA)</h2>
            <p>
              Under the PDPA we rely on the following bases to process personal
              data:
            </p>
            <ul>
              <li><strong className="text-foreground">Consent</strong> — trainers consent at signup; clients consent through their trainer.</li>
              <li><strong className="text-foreground">Performance of contract</strong> — data processing required to deliver the Service.</li>
              <li><strong className="text-foreground">Legitimate interests</strong> — security monitoring, fraud prevention, and product improvement, balanced against your privacy.</li>
              <li><strong className="text-foreground">Legal obligation</strong> — where we are required to retain records by law.</li>
            </ul>

            <h2>5. Sub-processors</h2>
            <p>We share data only with the following sub-processors, each under contractual data protection terms:</p>
            <ul>
              <li><strong className="text-foreground">Supabase</strong> (database, authentication, file storage) — hosted in the EU; data may be mirrored to backup regions.</li>
              <li><strong className="text-foreground">Vercel</strong> (application hosting, analytics) — edge compute in global PoPs.</li>
              <li><strong className="text-foreground">Stripe</strong> (subscription billing) — PCI-DSS Level 1.</li>
              <li><strong className="text-foreground">Twilio</strong> (SMS login codes).</li>
              <li><strong className="text-foreground">Meta / WhatsApp Cloud API</strong> (WhatsApp reminder delivery).</li>
              <li><strong className="text-foreground">Anthropic</strong> (AI nutrition analysis, only when triggered).</li>
              <li><strong className="text-foreground">Sentry</strong> (error monitoring, scrubbed of PII where possible).</li>
            </ul>

            <h2>6. Data retention</h2>
            <ul>
              <li>Active trainer and client records are retained while the trainer&apos;s account is active.</li>
              <li>When a trainer deletes their account, live data is removed within 30 days and purged from backups within 90 days.</li>
              <li>Stripe billing records may be retained for up to 7 years to meet Singapore tax and accounting requirements.</li>
              <li>Sentry error logs are retained for 90 days.</li>
              <li>Vercel request logs are retained for up to 30 days.</li>
            </ul>

            <h2>7. Security</h2>
            <p>We use the following measures to protect personal data:</p>
            <ul>
              <li>Encryption in transit (TLS 1.2+) and at rest (Supabase, Stripe, Vercel).</li>
              <li>Row-level security policies in the database so one trainer cannot read another trainer&apos;s data.</li>
              <li>Hashed passwords (bcrypt) and short-lived session tokens.</li>
              <li>Least-privilege service role keys stored as environment secrets.</li>
              <li>Regular dependency audits and security-focused code review.</li>
            </ul>
            <p>
              No system is perfectly secure. If you suspect a breach, contact{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a> immediately.
            </p>

            <h2>8. Your rights</h2>
            <p>Under the PDPA and similar laws you may:</p>
            <ul>
              <li>Request access to the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Withdraw consent (this may mean we can no longer provide the Service).</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Lodge a complaint with the Personal Data Protection Commission of Singapore.</li>
            </ul>
            <p>
              Clients should first contact the trainer who added them to FitDesk,
              as the trainer controls that data. If the trainer cannot be reached or
              you need to escalate, email us at{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a> and we will
              assist within 30 days.
            </p>

            <h2>9. International transfers</h2>
            <p>
              Some sub-processors operate outside Singapore. Where personal data is
              transferred internationally we rely on recognised safeguards, including
              standard contractual clauses and sub-processor certifications, as
              permitted under the PDPA Transfer Limitation Obligation.
            </p>

            <h2>10. Cookies and similar technologies</h2>
            <p>
              We use strictly necessary cookies for authentication and session state.
              Vercel Analytics is configured in cookie-less mode. We do not run
              third-party advertising trackers.
            </p>

            <h2>11. Children</h2>
            <p>
              FitDesk is not intended for children under 13. If a trainer adds a
              minor as a client, the trainer confirms they have obtained parental or
              guardian consent as required by local law.
            </p>

            <h2>12. Changes</h2>
            <p>
              We may update this Privacy Policy. Material changes will be announced
              via email or in-app notification at least 14 days before they take
              effect. The &quot;Last updated&quot; date above will reflect changes.
            </p>

            <h2>13. Contact</h2>
            <p>
              For privacy questions, access requests, or complaints, contact our data
              protection point of contact at{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a>. We will
              respond within 30 days in line with the PDPA.
            </p>

            <p className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
              See also the{" "}
              <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>
        </article>
      </main>
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-muted-foreground sm:px-6">
          <div>© 2025 FitDesk</div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/welcome" className="hover:text-foreground">
              Welcome
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
