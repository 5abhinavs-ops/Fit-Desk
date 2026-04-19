# Public Booking Page — Redesign Brief (Phase D)

**Scope:** `src/app/book/[slug]/page.tsx` and its dependencies (`src/components/BookingForm.tsx`, `src/components/bookings/slot-picker.tsx`).
**Goal:** Turn the current functional-but-vertical booking page into a deliberate first-impression brand moment for a prospective client. Sales psychology — trust then book — leads the structure. Functional purity remains: one primary action.
**Constraint:** Visual + structural only. No logic changes to the availability or bookings APIs. The `service-role` Supabase client pattern stays untouched.

---

## 1. Current page anatomy (as of Phase D start)

The page renders a single max-w-sm centered column containing, top-to-bottom:

1. Trainer photo or initials avatar (80×80 circle)
2. Trainer name + booking headline + Instagram link
3. Trainer bio paragraph
4. Specialisation badges (`secondary` variant, wrap, centered)
5. Training locations row — `MapPin` icon + outline badges
6. "Why train with me" prose block
7. Pricing line (`Sessions from $X`) + cancellation policy line
8. Up to 3 testimonials in `bg-muted` cards
9. Booking form (`BookingForm`):
   - Name input
   - WhatsApp number input
   - Session type select
   - Preferred date input (HTML `type="date"`)
   - Slot picker accordion (Morning / Afternoon / Evening)
   - Selected-time confirmation chip
   - Notes textarea
   - "Request booking" submit button
10. "Powered by FitDesk" footer link

It works. It is also a long, undifferentiated vertical scroll where the trust content (sections 3–8) and the action (section 9) compete with each other for the user's eye, and nothing on the page tells the viewer **the one thing they're here to do**.

---

## 2. Diagnosis — six weaknesses

### 2.1 Hierarchy is flat
Everything is the same column width, the same body-text weight, the same vertical rhythm. There is no visual anchor. The trainer's identity (the reason a client clicked the link) and the booking action (the reason the page exists) both compete with bio prose, locations, why-train, pricing, and testimonials in equal measure.

### 2.2 CTA prominence is undermined
The "Request booking" button is the last element in a 9-section scroll, disabled by default until 4 form fields are filled. There is no above-the-fold signal that booking is the intent. A first-time visitor reading on mobile sees the trainer's face and bio — fine — but has to scroll past everything else to reach the action. There is no "Book now" anchor at the top, no sticky CTA, no fold-line discipline.

### 2.3 Trust signals are present but unsorted
The page already has the right *ingredients* — bio, specialisations, locations, why-train, pricing, testimonials — but they're stacked in author order, not buyer order. A buyer evaluating a PT roughly scans in this priority: who → credibility → price → proof → action. The current order is who → credibility → location → why → price → proof → form. Location and "why train with me" sit between credibility and price, breaking the scan.

### 2.4 Slot picker is good in isolation, bad in context
The accordion (Morning / Afternoon / Evening with free-count badges) is genuinely well-designed for a date-driven flow. But it sits after a `<input type="date">` which on mobile triggers a native picker — the visual handoff between native picker and custom accordion is jarring. And on a fresh page load (no date chosen), the picker shows a single muted line: "Select a date above to see available times" — empty state hidden in plain sight.

### 2.5 Loading states are partial
The slot picker uses three `Skeleton` bars while availability loads — fine. But there is no skeleton anywhere else: the trainer header renders synchronously (server-side), and the rest of the form has no pending state at all. When the date changes, only the slot region transitions, which is correct. The opportunity is to make the slot skeleton **match the final accordion shape** (3 collapsed period rows with a placeholder badge), not three generic bars — Phase B established this principle for empty states; Phase D should extend it to loading states.

### 2.6 Empty availability state is silent
If the trainer has no open slots for the chosen date, the picker renders three accordion rows all marked "0 free" and disabled. There is no `<EmptyState>` invocation, no recovery copy ("No slots on this date — try the next day"), no guided next action. This is the strongest single Phase B/D combination opportunity on the page.

---

## 3. Redesign principles

1. **One primary action per screen.** The page exists to convert a visitor into a booking. Every layout decision is judged against whether it accelerates or dilutes that action.
2. **Trust before action, but trust earns the click — not the scroll.** Compress credibility into a tight above-the-fold block (photo + name + 1-line headline + 1-line credentials + price-from). Push longer prose (bio, why-train, full testimonials) below the fold, where buyers self-qualify deeper into the page.
3. **Conditional density.** If the PT has only filled out the minimum (name + slug), the page should still feel intentional, not skeletal. If the PT has filled everything (testimonials, why-train, locations, pricing, cancellation policy), the page should feel comprehensive, not bloated. Render only what exists; lay it out so the empty case is still composed.
4. **Mobile-first vertical rhythm.** The current `max-w-sm` (384px) is correct for a phone-shaped one-column layout. Keep it. Desktop visitors are not the primary persona for a booking link shared via WhatsApp.
5. **Skeleton-shaped placeholders, not spinner-shaped.** Loading states should foreshadow the shape of the final UI so the perceived load time is shorter (skeleton matches final layout = no jump on resolve).
6. **Honour Phase A, B, C.** Lucide icons via the `<Icon>` wrapper. Typography tokens (`text-body-sm`, `text-micro` etc.) instead of raw size classes where the tokens exist. `<EmptyState>` for page-zone emptiness. `prefers-reduced-motion`-guarded micro-motion only.

---

## 4. Proposed layout (top-to-bottom, mobile)

```
┌─────────────────────────────────────────┐
│  [Photo 96×96]                          │  ← TRAINER ANCHOR
│  Avi Lim                                │     (above-the-fold block)
│  Strength + mobility coach              │
│  ⓘ Instagram                            │
│  ──────────────────────────────         │
│  From $80 · 24h cancellation            │  ← PRICE STRIP
│  [1-on-1] [Strength] [Mobility]         │  ← QUICK BADGES
│  📍 Bukit Timah · East Coast            │  ← LOCATIONS (1 line, comma-joined)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Book a session                         │  ← SECTION HEADING (anchors action)
│                                         │
│  Your name           [_____________]    │
│  WhatsApp            [_____________]    │
│  Session type        [▼ 1-on-1     ]    │
│  Preferred date      [📅 Pick date  ]   │
│                                         │
│  ┌─ Morning · 6 free       ▼ ─────┐    │  ← ACCORDION
│  └────────────────────────────────┘    │     (skeleton matches this)
│  ┌─ Afternoon · 4 free     ▼ ─────┐    │
│  └────────────────────────────────┘    │
│  ┌─ Evening · 3 free       ▼ ─────┐    │
│  └────────────────────────────────┘    │
│                                         │
│  ✓ Wednesday 24 Apr · 7:30 PM selected  │  ← SELECTED CHIP
│                                         │
│  Message / notes     [____________      │
│                       ____________ ]    │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │   Request booking                │   │  ← PRIMARY CTA
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Why train with Avi                     │  ← BELOW-THE-FOLD (deeper trust)
│  [bio prose, full why-train, full       │
│   testimonials]                         │
└─────────────────────────────────────────┘

[Powered by FitDesk →]
```

### Key structural changes vs current

| Current order | New order | Rationale |
|---|---|---|
| photo · name · headline | photo (96×96, was 80) · name · headline | Photo gets a small bump for above-the-fold weight |
| Instagram (small inline) | Instagram (small inline, same) | No change |
| bio (full paragraph) | **moved below the fold** | Bio is deeper-funnel; don't gate the CTA behind it |
| specialisation badges | merged into a single "quick badges" strip with session-type chips | Compress; reduce vertical noise |
| training locations (own block, MapPin + outline badges) | one-line "📍 Bukit Timah · East Coast" inline | Compress; keep the icon, drop the badge wrapper |
| why-train | **moved below the fold** | Same reason as bio |
| pricing + cancellation policy (separate block) | **price strip** — single line above the form: `From $80 · 24h cancellation` | Buyer-priority signal, not a footnote |
| testimonials (3 cards above form) | **moved below the fold** | Testimonials reinforce post-decision; they don't drive the click |
| form (anchored, no heading) | **form gets a "Book a session" heading** | Visual anchor for the primary action |
| time-slot accordion (existing, well-designed) | unchanged structurally; gets skeleton + empty-state upgrades + Phase C micro-motion | Don't break what works |
| selected-time chip | unchanged | Already good |
| notes textarea | unchanged | Already good |
| submit button | gets disabled→enabled state more visually distinct | Already disabled correctly; needs a clearer enabled-state pop |

### What stays exactly the same

- The data flow: `getTrainer` cached server fetch via `service-role` client, props down to `<BookingForm>`, `<BookingForm>` calls `/api/availability` and `/api/bookings`.
- The slot picker accordion logic (period bucketing, free-count, busy/selected/available state).
- The selected-time confirmation chip.
- The "Trainer not found" 404 fallback.
- The "Powered by FitDesk" footer.
- The `ErrorBoundary` wrapping the form.

---

## 5. Component-level decisions

### 5.1 Trainer header (above-the-fold anchor)
- Photo size: **96×96** (was 80). Increase visual weight without overwhelming.
- Name: `text-2xl font-semibold` (was `text-xl`). The single most-scanned word on the page.
- Booking headline: `text-body-sm text-muted-foreground` (Phase A token).
- Instagram link: unchanged.
- **Remove** the bio block from the header — moves below the fold.

### 5.2 Price strip
- New element, immediately under the header.
- Single line: `From $80 · 24h cancellation` (em-dash separator with cancellation policy if `cancellation_policy_hours > 0`).
- If `pricing_from` is null, show only `24h cancellation` (or nothing if both are null — graceful collapse).
- Style: `text-body-sm font-semibold` for the price; `text-muted-foreground` for the cancellation suffix.

### 5.3 Quick badges strip
- Combines specialisations (currently their own block) into a horizontal wrap.
- One row, `flex flex-wrap gap-1.5 justify-center`.
- Use `Badge variant="secondary"` (current behaviour).
- Cap at 4 visible badges; if more exist, render `+N` overflow chip. (Edge case — most PTs have 1–3, so this is defensive.)

### 5.4 Locations line
- Replace the current MapPin + outline badge block with a single inline line:
  - `📍 Bukit Timah · East Coast · Tanjong Pagar`
  - `Icon name={MapPin} size="sm"` followed by `text-body-sm text-muted-foreground` text.
- Comma-or-middot joined.
- If empty, hide entirely.

### 5.5 Form section heading
- New: `Book a session` as `text-lg font-semibold` directly above the form fields.
- Anchors the primary action visually so the form feels intentional, not appended.

### 5.6 Slot picker — three improvements

**(a) Skeleton matches final shape.** Replace the three generic `<Skeleton className="h-12">` bars with three skeleton accordion-row shapes (border, padded, with a faux label-stack on the left and a faux badge on the right). Maintains layout stability when availability resolves (no perceived jump).

**(b) Empty state via `<EmptyState>`.** When `availabilityData` resolves with **zero** total free slots across all periods, render `<EmptyState>` instead of three "0 free" disabled accordions:
- Icon: `CalendarX` (lucide)
- Title: `No slots on this date`
- Body: `Try another day — most trainers add slots a few days ahead.`
- Action: a `Pick another date` button that focuses the date input (`document.getElementById('prefDate')?.focus()`), or omitted if focus-shifting feels too magical.

**(c) Phase C micro-motion on slot tap.** When a user taps an available slot, apply a brief scale-down-then-up (`whileTap={{ scale: 0.95 }}` if framer-motion is in use, or a Tailwind `active:scale-95 transition-transform` if we want to stay CSS-only). Honour `prefers-reduced-motion`. Already-selected slots and busy slots: no motion.

### 5.7 Submit button enabled state
Currently disabled-by-default. When all required fields are filled and a slot is selected, the button becomes enabled but uses the same color treatment. Phase D upgrade: make the enabled state visually distinct (already covered by shadcn `Button` default, but verify the contrast in dark mode — flagged for visual QA).

### 5.8 Below-the-fold trust block
- Section heading: `Why train with {trainer.name.split(' ')[0]}` (`text-lg font-semibold`).
- Renders `bio` (if present) as a paragraph.
- Then `why_train_with_me` (if present) as a paragraph.
- Then testimonials (if present), preserving the current `bg-muted` card style — they're already good.
- Each child is conditionally rendered. If all three are empty, the entire block collapses (graceful for sparse profiles).

---

## 6. State coverage matrix

| State | Current | New |
|---|---|---|
| Trainer not found | Centered text block, no styling | **Unchanged** (works) |
| No date selected | Single muted line below form | Replace with `<EmptyState>` (icon: `Calendar`, title: `Pick a date`, body: `Choose a day above to see available times.`) **OR** keep current line — decision deferred to implementation, but lean toward `<EmptyState>` for consistency with Phase B |
| Date selected, availability loading | Three generic skeleton bars | Three skeleton accordion-row shapes |
| Date selected, no slots free | Three disabled accordions ("0 free") | `<EmptyState>` — icon `CalendarX`, title `No slots on this date`, body + action |
| Date selected, slots available | Accordion with free counts (good) | **Unchanged** structurally; add Phase C micro-motion on slot tap |
| Slot selected | Confirmation chip in green tint | **Unchanged** |
| Booking submitted, success | Centered checkmark + name confirmation | **Unchanged** |
| Booking submission error | `toast.error(...)` | **Unchanged** |
| Trainer with sparse profile (only name + slug) | Header + form, very thin page | Header + price strip (collapses if empty) + form. Below-the-fold block hides entirely. Page still feels deliberate. |
| Trainer with rich profile | All sections rendered top-to-bottom (long scroll) | Above-the-fold compressed; rich content sits below the form. Both buyers (scanners and deep-readers) served. |

---

## 7. Security + database scope (read-only confirmation in Phase D Part 2)

The page uses `createServiceClient()` because it has no authenticated user. This is intentional and correct — `database-reviewer` should confirm:

- The `getTrainer` query selects only fields safe for public exposure (no PT email, phone, or auth-related columns).
- The availability API at `/api/availability` does the same (separate concern, not directly modified in Phase D).
- No new `select(*)` patterns introduced.

`security-reviewer` should confirm on the redesigned page:

- No new error paths leak PT PII (e.g., a thrown error message containing trainer email or DB row).
- The booking submission API rate-limit (already in place) is unchanged.
- The availability endpoint timing doesn't leak whether a trainer exists vs. has-no-slots — both should respond similarly.
- No new third-party scripts or fonts loaded inline.

These are read-only reviews; the redesign does not touch API logic.

---

## 8. Out of scope for Phase D

- Real-time slot updates (polling or websockets when another client books).
- Timezone selector for cross-region bookings.
- Multi-step wizard (the single-form pattern is correct for this audience).
- Calendar integration (Google Cal sync) — separate roadmap item.
- New trainer profile fields — work with what `profiles` already has.
- Desktop-specific layout — mobile-first holds.

---

## 9. Acceptance criteria

Phase D is complete when:

- [ ] Above-the-fold block (photo + name + headline + price strip + quick badges + locations line) fits in roughly the first 360–400 vertical px on a 390×844 viewport.
- [ ] "Book a session" heading anchors the form section visually.
- [ ] Slot picker loading state uses skeleton accordion-row shapes that match the final layout.
- [ ] When zero slots free for a chosen date, `<EmptyState>` renders with `CalendarX` icon and recovery copy.
- [ ] Slot tap has a Phase-C-style micro-motion (scale-on-tap), guarded by `prefers-reduced-motion`.
- [ ] Bio, why-train, and full testimonials are below the fold (after the form).
- [ ] All conditional sections collapse cleanly when their data is missing.
- [ ] `database-reviewer` confirms `getTrainer` query and `/api/availability` query patterns unchanged.
- [ ] `security-reviewer` returns zero CRITICAL or HIGH findings.
- [ ] `typescript-reviewer`, `code-reviewer`, `/quality-gate`, `/verify` all green.
- [ ] Visual QA on mobile (390px) and desktop (1280px). Slot picker behaviour unchanged in regression.

---

*Brief produced for Phase D Part 1. Approved brief feeds Phase D Part 2 execution in Claude Code.*
