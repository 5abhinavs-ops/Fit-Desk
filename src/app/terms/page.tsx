import type { Metadata } from "next"
import Link from "next/link"
import { TopNav } from "@/components/landing/top-nav"
import { Footer } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "Terms of Service — FitDesk",
  description:
    "FitDesk Terms of Service. Read the rules for using FitDesk to run your personal training business.",
}

const LAST_UPDATED = "21 April 2026"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNav />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-12 prose-legal">
          <header className="mb-8 border-b border-border pb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </header>

          <section className="space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-[color:var(--fd-cyan)] [&_a]:underline-offset-4 hover:[&_a]:underline">

            <p>
              Welcome to FitDesk. These Terms of Service (&quot;Terms&quot;) govern your
              access to and use of the FitDesk web application, mobile web experience,
              and related services (collectively, the &quot;Service&quot;). The Service
              is operated as a personal undertaking by the FitDesk team
              (&quot;FitDesk&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;)
              based in Singapore. By creating an account or using the Service, you
              agree to these Terms.
            </p>

            <h2>1. Who can use FitDesk</h2>
            <p>
              FitDesk is designed for independent personal trainers, fitness coaches,
              and movement professionals operating solo or in small studios. You must
              be at least 18 years old and legally capable of entering into a binding
              contract in your jurisdiction. By registering, you represent that the
              information you provide is accurate and that you will keep it up to
              date.
            </p>

            <h2>2. Your account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login
              credentials and for all activity on your account. Notify us immediately
              at{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a>{" "}
              if you suspect unauthorised access. We may suspend or terminate accounts
              that violate these Terms or pose a risk to the Service or other users.
            </p>

            <h2>3. Free and paid plans</h2>
            <p>
              FitDesk offers a free tier with a limit on the number of active clients
              you may manage. Paid plans (&quot;Pro&quot;) unlock higher limits and
              additional features. Paid plans are billed monthly or annually in
              advance via Stripe. You can cancel at any time from your settings; your
              subscription remains active until the end of the current billing period.
              Fees are non-refundable except where required by Singapore law.
            </p>

            <h2>4. Your content and your clients</h2>
            <p>
              You retain ownership of all information you upload to FitDesk,
              including client profiles, session notes, packages, payment records,
              and media. You grant FitDesk a limited licence to store, transmit, and
              display that information solely to provide the Service to you.
            </p>
            <p>
              You are the data controller for information about your clients. You are
              responsible for:
            </p>
            <ul>
              <li>Obtaining any consents required under the Personal Data Protection Act 2012 (Singapore) or equivalent law in your jurisdiction before adding a client to FitDesk.</li>
              <li>Ensuring you have the right to send WhatsApp or SMS reminders to each client whose number you enter.</li>
              <li>Responding to access, correction, or deletion requests from your clients.</li>
              <li>Keeping health, injury, and medical information only for as long as you need it.</li>
            </ul>

            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use FitDesk to harass, spam, or defraud clients or third parties.</li>
              <li>Upload malicious code, attempt to breach security, or interfere with the Service.</li>
              <li>Scrape, resell, or redistribute data from the Service beyond the features we provide.</li>
              <li>Use FitDesk to process payments you are not legally authorised to collect.</li>
              <li>Use FitDesk for activities prohibited under Singapore law.</li>
            </ul>

            <h2>6. WhatsApp, SMS, and automated messages</h2>
            <p>
              FitDesk sends automated messages (session reminders, payment nudges,
              booking confirmations) to numbers you enter. You are solely responsible
              for the accuracy of those numbers and for the content of any custom
              message templates you enable. You confirm you have a legitimate
              business relationship with each recipient and honour opt-out requests
              promptly. FitDesk is not liable for messaging fees charged by mobile
              carriers or for clients who have opted out of your communications.
            </p>

            <h2>7. Payments handled by you</h2>
            <p>
              FitDesk is a record-keeping tool. When a client pays you in cash, via
              PayNow, or by bank transfer, the money moves directly between your
              client and you. FitDesk never holds client funds and is not a payments
              intermediary. We are not responsible for disputes, chargebacks, or tax
              reporting arising from payments you collect.
            </p>

            <h2>8. Third-party services</h2>
            <p>
              FitDesk relies on the following sub-processors to deliver the Service:
              Supabase (database and authentication), Stripe (subscription billing),
              Twilio (SMS login), WhatsApp Cloud API by Meta (WhatsApp reminders),
              Vercel (hosting), and Anthropic (AI-powered nutrition analysis, if
              enabled). Your use of the Service is also subject to the terms of these
              providers where applicable.
            </p>

            <h2>9. Service availability</h2>
            <p>
              We aim for high uptime but do not guarantee that the Service will be
              uninterrupted or error-free. We may release updates, change features,
              or schedule maintenance without prior notice. For scheduled outages
              longer than 30 minutes we will endeavour to notify active users.
            </p>

            <h2>10. Termination</h2>
            <p>
              You may delete your account at any time from settings or by emailing{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a>. Upon
              deletion, your data is removed from live systems within 30 days;
              backup copies are purged within 90 days. We may suspend or terminate
              your access immediately if you materially breach these Terms.
            </p>

            <h2>11. Disclaimer of warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot;
              without warranty of any kind, express or implied, including but not
              limited to merchantability, fitness for a particular purpose, and
              non-infringement. FitDesk does not provide medical, legal, tax, or
              financial advice.
            </p>

            <h2>12. Limitation of liability</h2>
            <p>
              To the maximum extent permitted under Singapore law, FitDesk&apos;s
              aggregate liability for any claim arising out of or relating to the
              Service shall not exceed the greater of (a) the amount you paid us in
              the twelve months preceding the claim or (b) S$100. FitDesk shall not
              be liable for indirect, incidental, consequential, or punitive damages,
              including lost profits, lost revenue, or lost data.
            </p>

            <h2>13. Indemnity</h2>
            <p>
              You agree to indemnify and hold FitDesk harmless from claims brought
              by your clients or third parties arising from your use of the Service,
              your content, messages you send, or your breach of these Terms.
            </p>

            <h2>14. Governing law and disputes</h2>
            <p>
              These Terms are governed by the laws of Singapore. Any dispute shall be
              resolved in the courts of Singapore, subject to any mandatory consumer
              protection rules in your jurisdiction of residence.
            </p>

            <h2>15. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be
              announced via email or in-app notification at least 14 days before they
              take effect. Continued use of the Service after the effective date
              constitutes acceptance of the updated Terms.
            </p>

            <h2>16. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <a href="mailto:support@fitdesk.pro">support@fitdesk.pro</a>.
            </p>

            <p className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground">
              See also the{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  )
}
