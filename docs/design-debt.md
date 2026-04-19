# Design Debt

Items surfaced during design-polish work that are legitimate concerns but out of the current phase's scope. Captured here so they're not lost and can be addressed in their own focused phase.

---

## 2026-04-19 — Hardcoded `#1A3349` card background in session/[token]/page.tsx

**File:** `src/app/session/[token]/page.tsx:193` (line may drift; look for the inline `bg-[#1A3349]` on the payment/package info card)

**Issue:** A raw hex color is baked into the Tailwind arbitrary-value class. The card renders correctly in dark mode (current only mode) but would be invisible / illegible if a light mode were ever introduced — the dark background with no foreground override would collide with light-mode inherited text.

**Why deferred:** FitDesk is dark-mode-only today. The regression risk is theoretical, not actual. Fixing this properly means tokenizing the card surface color via Tailwind CSS variables (`bg-card`, `bg-muted`, or a new semantic token), which is a cross-cutting architectural change — its own phase, not a bolt-on to Phase A.6 (typography snap).

**Scope for the future phase:**
- Audit all `bg-[#...]` and `text-[#...]` arbitrary color classes across `src/`.
- Introduce semantic tokens in `globals.css` `@theme` for surfaces, accents, and text states.
- Swap raw hex usages for the tokens.
- Add a light-mode pass if/when product decides to ship one.

Caught during Phase A.5 Batch 4 code-review gate.

---

## 2026-04-19 — `text-xs`/`text-sm` bare Tailwind classes alongside locked tokens

**File(s):** `src/components/clients/PaymentDetailSheet.tsx` lines 252, 285, 389, 421, 440, 453 (and likely others elsewhere — not exhaustively grepped).

**Issue:** After A.3b.2 removed the `.text-xs { !important }` / `.text-sm { !important }` overrides, these two classes now resolve to Tailwind's defaults — 12px and 14px respectively, which is **visually identical** to the locked `text-micro` and `text-body-sm` tokens. But they're semantically inconsistent: a developer reading the code sees two parallel systems (bare Tailwind default classes + our locked tokens) and can't tell if the distinction is intentional or accidental.

**Severity:** LOW. Not a visual bug. Scale-hygiene concern only.

**Fix options:**
- **A.** Post-A.6 sweep: grep for `text-xs\b` and `text-sm\b` across `src/` and replace with `text-micro` and `text-body-sm` uniformly. Might be ~100+ occurrences (the default Tailwind classes are more common than arbitrary values were).
- **B.** Add an ESLint rule / pattern enforcer that rejects `text-xs`/`text-sm` in feature code, pointing to the locked tokens.
- **C.** Document the equivalence in `docs/design-audit.md` §5 and allow both forms (locked tokens preferred for new code; existing bare Tailwind classes can remain).

Caught during Phase A.6 Op 5 code-review gate.

---

## 2026-04-19 — `DayTimeline.tsx` stale `eslint-disable` + scroll effect dep array

**File:** `src/components/calendar/DayTimeline.tsx:125–131`

**Issue:** A `// eslint-disable-next-line react-hooks/exhaustive-deps` comment guards a `useEffect` that auto-scrolls the timeline when the selected date changes. The comment is now stale — lint reports "unused directive" on it. Separately, the effect reads `isToday` and `nowMinutes` but deliberately omits them from the dep array to prevent re-scrolling on every clock tick.

**Severity:** LOW. Pre-existing (not introduced by A.6). Lint reports the stale directive as a warning, not an error, so it doesn't block `/verify`.

**Fix sketch:**
- Remove the stale `eslint-disable` directive on line 125.
- Add `isToday` to the dep array (the scroll genuinely should re-run when a date flips to today so it targets the now-time instead of 7 AM).
- Keep `nowMinutes` out of the dep array (explicitly documented with a comment) — re-scrolling on every minute tick is intentionally suppressed.

**Owner:** defer to a pre-A.9 cleanup pass or the refactor-cleaner agent in A.8.

Caught during Phase A.6 Op 5 typescript-reviewer gate.

---

## 2026-04-19 — Client payments view hides `client_confirmed` state

**File:** `src/app/(client)/client/payments/page.tsx`

**Issue:** Client-side payment filter excludes `client_confirmed`, so payments awaiting PT review disappear from the client's list entirely. Client experience: "I uploaded proof, where did my payment go?"

**Correct behavior:** add an "Awaiting review" bucket that shows `client_confirmed` payments with appropriate copy. Possibly merge into Pending tab with a sub-state indicator.

**Scope:** small UX fix, out of Phase C scope (Phase C is animation-only). Candidate for Phase D (public booking redesign may touch adjacent client surfaces) or a dedicated client-UX cleanup.

Caught during Phase C C2 scoping — surfaced when planner-proposed chip extraction revealed the client-side filter asymmetry.

---
