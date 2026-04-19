# Future Animations — Parking Lot

Animation ideas surfaced during Phase C (the three-targeted-animations sprint) that were deliberately deferred. Phase C scope was **exactly three** client-side animations; anything else goes here with zero code change until a later phase picks it up.

This doc exists so that "would look nice with motion" ideas don't leak into Phase C's scope or get lost.

---

## Deferred — surfaced during Phase C

### PT-side package counter animation

**Site:** `src/components/clients/PaymentDetailSheet.tsx` (package section, around lines 317–354 depending on drift) and anywhere else on the PT side that shows session-count pill or progress ring.

**Idea:** Mirror the client-side package-counter tick-down (Phase C animation 2) on the PT-side view when a session is logged. Same `<AnimatedNumber>` helper + progress-bar CSS transition.

**Why deferred:** Phase C user-scoped all three animations to the **client-facing** app (`src/app/(client)/*`). Extending to the PT side is a clean re-use but out of scope. Candidate for a PT-side polish phase or folded into Phase D if it touches adjacent surfaces.

---

### Daily macro summary count-up (MacroCard)

**Site:** `src/app/(client)/client/nutrition/page.tsx` — the top `<MacroCard>` row around lines 217–242 showing daily totals (Cal / Protein / Carbs / Fat).

**Idea:** Tween the daily totals from their prior value to the new value when a meal is saved, deleted, or edited.

**Why deferred:** Phase C's macro count-up is specifically the **scan reveal** moment (0 → final in the editing card after Claude vision resolves). Animating the daily summary on every log-save would feel busy and the UX intent is different — the daily summary is a **reference view**, not a reveal moment. If revisited, require the tween to only fire on transitions beyond a visible threshold (e.g. >10 cal delta) and skip on minor edits.

---

### Booking status chip transitions

**Site:** `src/app/(client)/client/sessions/page.tsx` and PT-side bookings pages — the status badges (`confirmed`, `pending`, `cancelled`, `completed`, `no-show`, `forfeited`, `pending_approval`, `reschedule_requested`).

**Idea:** Animate status transitions (e.g. `pending → confirmed`) similarly to the payment status card's spring checkmark.

**Why deferred:** Phase C was three animations, not four. Booking status is a richer state machine than payment and would need its own extraction step (like `PaymentStatusCard` in C2) before any animation can hook in. Also, several transitions happen server-side without user-visible immediacy, weakening the UX payoff.

---

### Onboarding / signup polish

**Site:** `src/app/(auth)/signup/page.tsx`, `src/app/onboarding/page.tsx` and any first-time UX surfaces.

**Idea:** Staggered element reveals, progress indicators, micro-confetti on plan selection. Phase 1 conversion push territory.

**Why deferred:** Entire different problem space (marketing/conversion vs. operating app polish). Better paired with Phase 2's $19/mo conversion work, where the signup → first-value time is the bottleneck metric.

---

### Client booking page (public `/book/[slug]`) entry animations

**Site:** `src/app/book/[slug]/page.tsx`

**Idea:** Fade-in timeline, trainer-intro card slide-up, available-slot highlight on hover.

**Why deferred:** Phase D scope (public-booking redesign) will touch this surface. Animation is a follow-on polish pass once the redesign lands.

---

## Design principles (if/when these get picked up)

1. **Page-zone animations** (hero reveals, empty states) — use CSS keyframes + `prefers-reduced-motion` media query. No JS animation lib.
2. **Numeric tween with integer values** — reuse `<AnimatedNumber>` from `src/components/ui/animated-number.tsx` (rAF-driven, reduced-motion-aware).
3. **One-shot state-transition feedback** (e.g. status chip flipping, payment received) — CSS classes toggled via React state. JS-mount the animated overlay element rather than relying solely on CSS media queries (stronger accessibility contract: the element literally does not exist under reduced-motion, see `PaymentStatusCard` ring).
4. **Stagger** — CSS keyframe fade-in + inline `animationDelay` per child. Do not wrap each child in a JS animation component.
5. **Do not reintroduce framer-motion** without a concrete spring-physics requirement that CSS cubic-bezier cannot approximate. Phase C evaluated framer-motion and removed it — +72KB gzipped was not worth the one genuine use-case (spring overshoot on the payment checkmark).

---

## Phase C inventory (for reference)

The three animations that **did** ship in Phase C are deliberately small and targeted:

1. **Payment confirmation** — checkmark spring scale-in + expanding ring pulse on `pending → client_confirmed`. PT-side `PaymentDetailSheet` only.
2. **Package session counter tick-down** — `<AnimatedNumber>` in the client home's active-package card + CSS `transition: width` on the progress bar.
3. **AI nutrition scan reveal** — moving gradient shimmer during `analysing` state + staggered macro fade-in (0 → final values) on resolve in the client nutrition page.

All three implemented in pure CSS + rAF (no animation libs). All three honour `prefers-reduced-motion: reduce` via media query; the shimmer and the expanding ring additionally use JS-based conditional mounting so the element does not appear in the DOM at all under reduced-motion.
