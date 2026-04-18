# FitDesk Design Audit — Phase A (Icon + Typography Lockdown)

Date: 2026-04-17
Branch: `dev-1`
Baseline SHA: `f596cd2`
Checkpoint: `phase-a-start`

This audit is read-only. No code is changed until the user approves the inline-SVG triage table (§3) and the typography-snap mapping table (§6).

---

## 1. Summary

| Item | Count |
|---|---|
| Files importing `lucide-react` | **52** |
| Files importing `react-icons` | **0** |
| Files importing `@heroicons/react` | **0** |
| Files containing inline `<svg>` | **6** (of which 2 are whitelist candidates — brand logo and chart) |
| Emoji-as-icon sites | **2** |
| Arbitrary-value `text-[...]` / `font-[...]` occurrences | **68 across 19 files** |
| Weight-utility usages (`font-bold`, `font-extrabold`, `font-medium`, etc.) | **184 across 53 files** |
| `next/font/google` imports | **1** (`src/app/layout.tsx` — Geist + Geist_Mono only) |
| `@font-face` / external `font-family` rules | **0** |

Tailwind version: **v4 (CSS `@theme inline` model)**. There is no `tailwind.config.ts`.
Package manager: **npm**.

---

## 2. Icon package inventory

### 2.1 Installed packages (from `package.json`)
- `lucide-react@^1.7.0` — the only icon package. **Keep.**
- No `react-icons`, no `@heroicons/react`, no `phosphor-icons`. Nothing to uninstall.

### 2.2 Files importing from `lucide-react` (52)

Grouped by target refactor batch for Phase A.5.

**Batch 1 — `components/ui/*` + `components/shared/*` (8 files)**
- `src/components/ui/sonner.tsx` — CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon
- `src/components/ui/sheet.tsx` — XIcon
- `src/components/ui/select.tsx` — ChevronDownIcon, CheckIcon, ChevronUpIcon
- `src/components/ui/calendar.tsx` — ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon
- `src/components/ui/dialog.tsx` — XIcon
- `src/components/ui/dropdown-menu.tsx` — ChevronRightIcon, CheckIcon
- `src/components/shared/bottom-nav.tsx` — Home, Users, CalendarDays, DollarSign, UserCircle
- `src/components/client/client-bottom-nav.tsx` — Home, CalendarDays, TrendingUp, Salad

**Batch 2 — `components/clients` + `components/bookings` + `components/calendar` + `components/profile` + `components/dashboard` + `components/client` (18 files)**
- `src/components/BookingForm.tsx` — Loader2, Check
- `src/components/dashboard/pending-approvals-card.tsx` — Clock, Check, X, Loader2
- `src/components/calendar/WeekStrip.tsx` — X
- `src/components/calendar/DayTimeline.tsx` — Ban, Plus
- `src/components/client/measurement-sheet.tsx` — Loader2
- `src/components/client/payment-proof-sheet.tsx` — Camera, Loader2, CheckCircle
- `src/components/clients/AddClientSheet.tsx` — Loader2
- `src/components/clients/AddClientWithPackageSheet.tsx` — Loader2
- `src/components/clients/BookingActionSheet.tsx` — Loader2, RotateCcw, Ban, UserX, CalendarClock, ChevronDown, ChevronUp
- `src/components/clients/CreateBookingSheet.tsx` — Loader2
- `src/components/clients/CreatePackageSheet.tsx` — Loader2, MessageCircle, Check
- `src/components/clients/LogPaymentSheet.tsx` — Loader2
- `src/components/clients/PaymentDetailSheet.tsx` — Loader2, Clock, AlertCircle, CheckCircle
- `src/components/clients/nutrition-tab.tsx` — Camera, Flame, Beef, Wheat, Droplets
- `src/components/bookings/slot-picker.tsx` — ChevronDown
- `src/components/bookings/payment-section.tsx` — Loader2, DollarSign
- `src/components/profile/availability-settings.tsx` — Trash2, Plus, Loader2
- `src/components/profile/booking-settings-form.tsx` — Loader2, Copy, Share2
- `src/components/profile/cancellation-policy-form.tsx` — Loader2
- `src/components/profile/payment-details-form.tsx` — Loader2
- `src/components/profile/profile-details-form.tsx` — Loader2
- `src/components/profile/profile-photo-upload.tsx` — Loader2

**Batch 3 — `src/app/(dashboard)/*` pages (7 files)**
- `src/app/(dashboard)/page.tsx` — CalendarDays, DollarSign, AlertTriangle, TrendingUp, Dumbbell, AlertCircle, UserCheck, UserMinus
- `src/app/(dashboard)/analytics/page.tsx` — TrendingUp, AlertCircle, Users, Package, UserX, DollarSign, ChevronLeft, ChevronRight
- `src/app/(dashboard)/bookings/page.tsx` — Plus, ChevronLeft, ChevronRight, Copy, Loader2, Ban
- `src/app/(dashboard)/clients/page.tsx` — Search, Plus
- `src/app/(dashboard)/clients/[id]/page.tsx` — ArrowLeft, MessageCircle, Mail, Loader2, FileText, Salad, ChevronDown, ChevronUp, Trash2, RefreshCw
- `src/app/(dashboard)/nutrition/page.tsx` — Camera, Loader2, Flame, Beef, Wheat, Droplets
- `src/app/(dashboard)/payments/page.tsx` — Plus
- `src/app/(dashboard)/profile/page.tsx` — LogOut, ChevronDown, ChevronUp, Salad, BarChart2

**Batch 4 — `src/app/(auth)/*`, `src/app/(client)/*`, `src/app/book`, `src/app/session`, `src/app/onboarding`, `src/app/upgrade`, `src/app/client/login` (~13 files)**
- `src/app/(auth)/login/page.tsx` — Loader2
- `src/app/(auth)/reset-password/page.tsx` — Loader2
- `src/app/(auth)/signup/page.tsx` — Loader2
- `src/app/(client)/client/page.tsx` — (multi-line import, to inspect)
- `src/app/(client)/client/nutrition/page.tsx` — (multi-line import, to inspect)
- `src/app/(client)/client/payments/page.tsx` — DollarSign, CheckCircle, Clock, AlertCircle
- `src/app/(client)/client/progress/page.tsx` — TrendingUp, Flame, CalendarCheck, Target, Plus
- `src/app/(client)/client/sessions/page.tsx` — CalendarDays, Loader2
- `src/app/book/[slug]/page.tsx` — (to inspect)
- `src/app/client/login/page.tsx` — Loader2
- `src/app/onboarding/page.tsx` — Loader2, ArrowLeft, Copy, Check
- `src/app/session/[token]/page.tsx` — (to inspect)
- `src/app/session/[token]/session-actions.tsx` — CheckCircle, XCircle, Clock, CalendarClock, Loader2, CreditCard
- `src/app/session/[token]/whatsapp-link.tsx` — MessageCircle
- `src/app/upgrade/page.tsx` — Loader2, Check
- `src/app/upgrade/success/page.tsx` — Check

---

## 3. Inline `<svg>` triage table — **APPROVED 2026-04-17**

User approved this table with an IG-brand-swirl exception clause. Post-inspection result: **neither Instagram SVG is the ornamental brand swirl** — both are the standard simplified 3-element glyph (rect + center circle + top-right dot), structurally identical to lucide's `Instagram` component. Exception does not trigger.

| # | File | Location | Purpose | Action | Lucide equivalent | Per-file notes |
|---|---|---|---|---|---|---|
| 1 | `src/components/shared/fitdesk-logo.tsx` | lines 35 + 53 | **Brand logo** — dotted-pattern background + lightning-bolt mark with linear gradient. | **WHITELIST — keep inline.** | N/A | Logo is the brand mark. Has custom gradient + dot-pattern that lucide cannot express. **Brand exception: also keeps `text-[22px]` / `text-[17px]` outside the locked typography scale (see §5.2).** |
| 2 | `src/app/(client)/client/progress/page.tsx` | line 163 | **Data visualization** — weight-trend line chart (`<polyline>` inside `<svg viewBox="0 0 300 100">`). | **WHITELIST — keep inline.** | N/A | Not an icon. Data viz using SVG primitives. |
| 3 | `src/app/session/[token]/page.tsx` | line 156 (`16×16`) | Box/package glyph next to package name on session card. | **REPLACE with lucide.** | `Package` | Path shape matches lucide `Package` (box-with-lid + front-panel polyline). Clean 1:1 swap. |
| 4 | `src/components/profile/profile-photo-upload.tsx` | line 101 (`12×12`) | Upload arrow on photo-upload button. | **REPLACE with lucide.** | `Upload` | Path shape matches lucide `Upload` (tray + up-arrow). Clean 1:1 swap. |
| 5 | `src/components/profile/profile-details-form.tsx` | line 128 (`16×16`) | Input adornment for Instagram URL field. | **WHITELISTED — keep inline.** (Revised 2026-04-18.) | — | **lucide v1 dropped brand icons.** Current simplified 3-element glyphs (`rect + circle + corner dot`) are the standard Instagram mark and render cleanly. No swap target exists; no dependency addition justified for two usages. |
| 6a | `src/app/book/[slug]/page.tsx` | line 97 (`14×14`) | Social link icon on trainer public-booking page. | **WHITELISTED — keep inline.** (Revised 2026-04-18.) | — | Same as #5. lucide v1 has no Instagram. Kept inline. |
| 6b | `src/app/book/[slug]/page.tsx` | line 129 (`12×12`) | Map-pin icon next to "Training locations" heading. | **REPLACE with lucide.** | `MapPin` | Path matches lucide `MapPin` (teardrop + inner circle). Clean swap. |

---

## 4. Emoji / Unicode-as-icon sites — **APPROVED 2026-04-17, EXPANDED 2026-04-18**

| # | File | Line | Current | Action | Notes |
|---|---|---|---|---|---|
| 1 | `src/app/(dashboard)/page.tsx` | 64 | `{greeting}, {name} 👋` | **KEEP** — greeting copy, not an icon. | 👋 is semantic/expressive text in the trainer greeting. Decision: keep. |
| 2 | `src/components/profile/availability-settings.tsx` | 195 | `✕` (standalone close glyph inside a button) | **REPLACE with lucide `X`** routed through `<Icon>` wrapper. | ✕ functions as an icon affordance (remove button). Swap to lucide. |
| 3 | `src/components/calendar/DayTimeline.tsx` | 302 | `↻` (recurring-indicator glyph, U+21BB, Arrows block) | **REPLACE with lucide `RotateCcw`** routed through `<Icon>` wrapper. Added 2026-04-18. | Caught during Batch 2 code-review gate. Original grep pattern missed the Arrows block. |

### 4.1 Grep methodology fix (2026-04-18)

The original Phase A.1 emoji scan used pattern `[\u1F300-\u1FAFF\u2600-\u27BF]` — Misc Symbols & Pictographs + part of Dingbats. It missed the **Arrows block** (`\u2190-\u21FF`) where `↻` lives.

**Corrected scan pattern** — run this to detect Unicode-as-icon usages:

```
[\u2190-\u21FF]   # Arrows
[\u2700-\u27BF]   # Dingbats (✈ ✉ ✏ ✂ ✅ etc.)
[\u25A0-\u25FF]   # Geometric Shapes (▲ ▼ ● ○ ■ □ etc.)
[\u2600-\u26FF]   # Miscellaneous Symbols (☀ ☎ ♻ etc.)
[\u1F300-\u1F5FF] # Misc Symbols and Pictographs (☁ 🌀 🎯 etc.)
[\u1F600-\u1F64F] # Emoticons (😀 😂 🙌 etc.)
[\u1F900-\u1F9FF] # Supplemental Symbols and Pictographs (🤝 🧠 🫶 etc.)
```

A re-scan with the expanded pattern across `src/**/*.{ts,tsx,js,jsx,css}` on 2026-04-18 produced **zero hits** after the `↻` swap landed. Currency Symbols (`\u20A0-\u20CF`) were excluded — currency glyphs in running copy are legitimate text and would produce false positives.

If a future audit adds Unicode-as-icon detection to automated checks, use the expanded pattern above, not the original.

---

## 5. Arbitrary-value `text-[...]` map (68 occurrences across 19 files)

Per user rule: snap to nearest locked scale token. No scale expansion. Stop and ask only if a snap visually breaks.

**Locked scale (to be added in Phase A.3):**
- `text-display-lg` = 32px
- `text-display-md` = 24px
- `text-display-sm` = 20px
- `text-body-lg` = 16px
- `text-body-sm` = 14px
- `text-micro` = 12px

### 5.1 Snap map

| Arbitrary value | Snap target | Rationale | Potential risk |
|---|---|---|---|
| `text-[10px]` | `text-micro` (12) | 2px bump up; nearest token | Used in small `<Badge>` content + chart axis labels — bumping 10→12 may wrap in tight badges |
| `text-[11px]` | `text-micro` (12) | 1px bump up; nearest token | Used in slot-picker chips + progress stat tiles — likely fine |
| `text-[0.8rem]` (12.8px) | `text-micro` (12) | 0.8px down; nearest token | calendar + button.sm — likely fine |
| `text-[13px]` | `text-body-sm` (14) | 1px bump up; nearest token | Meta/muted text everywhere — likely fine, may compact slightly |
| `text-[15px]` | `text-body-lg` (16) | 1px bump up; nearest token | Meta/muted secondary text — likely fine |
| `text-[17px]` (fitdesk-logo only) | `text-body-lg` (16) | 1px down; nearest token | Logo wordmark sm variant — **FLAG**, logo is brand-sensitive |
| `text-[22px]` (fitdesk-logo only) | `text-display-sm` (20) | 2px down; nearest token | Logo wordmark lg variant — **FLAG**, logo is brand-sensitive |

### 5.2 Potentially breaking snaps + decisions

- **`fitdesk-logo.tsx` lines 77 (`text-[22px]`) and 90 (`text-[17px]`): BRAND EXCEPTION — WHITELISTED 2026-04-17.** The logo is tuned with `letter-spacing: -0.04em` / `-0.03em` and sits outside the locked body/display scale by design. These two arbitrary values are **NOT** to be snapped. Any future logo-size change happens via a separate brand-mark decision, not via the typography scale. Documented here so future audits don't re-flag it.
- **`components/ui/badge.tsx` and `components/ui/avatar.tsx` — APPROVED to proceed 2026-04-17.** Variants use `text-[10px]` / `text-[12px]` baked into cva classes. Snap 10→12 will bump every badge in the app by ~2px and may cause reflow on dense pages (payments page is the highest-risk site). **Procedure:** spot-check payments page at 390px after snap. **Revert individual cases on regression. If more than two places regress, pause and report back to user.**
- **`components/ui/button.tsx` sm variant:** `text-[0.8rem]` (12.8px) → `text-micro` (12). Tiny shrink, low risk.

### 5.3 Per-file count (for batch planning)

| File | Occurrences |
|---|---|
| `src/app/(client)/client/page.tsx` | 9 |
| `src/app/(dashboard)/page.tsx` | 8 |
| `src/app/(dashboard)/analytics/page.tsx` | 7 |
| `src/components/bookings/slot-picker.tsx` | 6 |
| `src/app/(dashboard)/payments/page.tsx` | 5 |
| `src/app/(client)/client/progress/page.tsx` | 4 |
| `src/app/(client)/client/payments/page.tsx` | 3 |
| `src/app/(client)/client/nutrition/page.tsx` | 2 |
| `src/app/(dashboard)/nutrition/page.tsx` | 2 |
| `src/app/(client)/client/sessions/page.tsx` | 2 |
| `src/app/(dashboard)/clients/page.tsx` | 2 |
| `src/app/client/login/page.tsx` | 2 |
| `src/components/clients/nutrition-tab.tsx` | 2 |
| `src/components/shared/fitdesk-logo.tsx` | 2 |
| `src/components/ui/calendar.tsx` | 2 |
| `src/components/ui/avatar.tsx` | 1 |
| `src/components/ui/badge.tsx` | 1 |
| `src/components/ui/button.tsx` | 1 |
| `src/components/clients/ClientCard.tsx` | 1 |
| **Total** | **60** (remaining 8 are within quoted CSS `rounded-[...]` patterns excluded from typography scope) |

### 5.4 `font-[...]` arbitrary values

`rg "font-\[[^\]]+\]"` returned **zero matches**. No arbitrary `font-[weight]` values exist. ✅

### 5.5 Inline-style `fontSize:` leak (methodology patch, 2026-04-19)

**Gap in the original audit.** The Phase A.1 grep for `text-[Xpx]` only captured arbitrary Tailwind classes. It did NOT capture inline React style props like `style={{ fontSize: "13px" }}`. A later re-scan caught 28 inline `fontSize:` values across 4 files that bypass the locked scale just as completely as `text-[13px]` would:

- `src/app/(dashboard)/bookings/page.tsx` (2 values: 12, 13px)
- `src/components/calendar/DayTimeline.tsx` (6 values: 9, 11, 11, 13, 13, 13px)
- `src/components/calendar/WeekStrip.tsx` (4 values: 10, 18, 18, 10px)
- `src/components/clients/PaymentDetailSheet.tsx` (~16 values: 12, 13px in paired status rows)

**Forward-looking rule (2026-04-19).**

Inline-style `fontSize:` in feature source files is an **anti-pattern on par with arbitrary `text-[Xpx]` values.** Both bypass the locked typography scale. Both fragment the design system.

**Rejection policy:**
1. **Code review rejects** any PR introducing `style={{ fontSize: ... }}` in `src/` feature code. The locked scale (`text-micro` / `text-body-sm` / `text-body-lg` / `text-display-sm` / `text-display-md` / `text-display-lg`) covers every legitimate case.
2. **Acceptable exceptions:**
   - Dynamically-computed sizes that Tailwind's class system genuinely cannot express (extremely rare — most "dynamic" cases are really a discrete enum that should map to locked tokens).
   - Third-party integrations that require an inline style by their own API.
   - When an exception is made, document inline: `// eslint-disable-next-line -- <reason>` AND flag in `docs/design-debt.md` or the equivalent.
3. **Brand-exception site** (`src/components/shared/fitdesk-logo.tsx`) remains whitelisted per §5.2 — brand marks sit outside the locked scale by design.

**Corrected scan pattern** for future audits:

```
# arbitrary Tailwind classes
text-\[[0-9.]*(px|rem|em)\]
font-\[[^\]]+\]

# inline React style props (the gap this patch closes)
style=\{\{[^}]*fontSize:
style=\{\{[^}]*fontWeight:
```

Run all four patterns in any future typography audit. The first two were in the original audit; the last two close the leak surfaced on 2026-04-19.

---

## 6. Font weight usage audit (184 occurrences across 53 files)

Per user directive: two weights only — **regular (400)** and **semibold (600)**.

| Current class | Tailwind weight | Proposed collapse | Notes |
|---|---|---|---|
| `font-thin` / `font-light` | 100 / 300 | → `font-normal` (400) | Check for any; rare in this codebase |
| `font-normal` | 400 | **Keep as-is** | |
| `font-medium` | 500 | → `font-semibold` (600) **OR** `font-normal` (400) — **FLAG**, needs design call | 500 is the most common "slight emphasis" weight; collapsing to 600 may look heavy, 400 may look flat |
| `font-semibold` | 600 | **Keep as-is** | |
| `font-bold` | 700 | → `font-semibold` (600) | Existing bold usages become semibold per lock |
| `font-extrabold` | 800 | → `font-semibold` (600) | Existing extrabold (incl. in `.btn-gradient`, `.pill-gradient`, `.badge-pro`, `avatar.tsx`, `badge.tsx`, `fitdesk-logo.tsx`) collapse to 600 |
| `font-black` | 900 | → `font-semibold` (600) | |

**USER DECISION 2026-04-17:** Collapse `font-medium` (500) → `font-semibold` (600). **Post-collapse procedure:** visually spot-check long-form text surfaces (client detail notes, bio fields, booking comments, session notes). If any location reads too heavy at 600, **flag back to user rather than auto-revert.**

**Globals.css rules to audit simultaneously:**
- `.btn-gradient { font-weight: 800 }` (line 164) — collapse to 600
- `.pill-gradient { font-weight: 800 }` (line 234) — collapse to 600
- `.badge-pro { font-weight: 800 }` (line 245) — collapse to 600
- `.label-upper { font-weight: 700 }` (line 224) — collapse to 600

These CSS-defined weights need to move in lockstep with the Tailwind class cleanup.

---

## 7. Font setup

- **Current:** `src/app/layout.tsx` imports `Geist` + `Geist_Mono` from `next/font/google`. `--font-geist-sans` and `--font-geist-mono` are CSS variables wired onto `<html>`.
- **globals.css mapping — REAL BUG, FIX CONFIRMED 2026-04-17:** line 10 reads `--font-sans: var(--font-sans)` — a self-reference. This means any Tailwind class that resolves to `var(--font-sans)` (e.g., `font-sans`, the body via `@apply font-sans` on `html`) falls back to the browser default, **not Geist.** The fix in Phase A.3 is to change line 10 to `--font-sans: var(--font-geist-sans)`.
- **⚠️ Visible-change warning:** on surfaces currently rendering with the browser system font (Times / Arial / SF / Segoe UI depending on OS), the post-fix render will **switch to Geist Sans for the first time.** This is a real and expected visual change across every page, not a regression. Screens that already looked "fine" may shift noticeably. Document this in the PR description so reviewers don't mistake the shift for a regression.
- `--font-mono: var(--font-geist-mono)` (line 11) is correct.
- `--font-heading: var(--font-sans)` (line 12) inherits the broken pointer from line 10 today; will resolve correctly once line 10 is fixed.
- **Competing fonts:** none. No other `next/font` imports, no `@font-face` rules, no external font CDN links. Verified with `rg "from ['\"]next/font"` (only `layout.tsx` matches) and `rg "font-family|@font-face"` (zero matches in `src/`).

Per user Q1: **Keep Geist. Do not switch to Inter.** Fix the self-referential `--font-sans` pointer in Phase A.3.

**Additional bug fix caught during A.3 code-review gate (2026-04-18):** line 12 `--font-heading: var(--font-sans)` is the same class of bug as line 10 — under Tailwind v4's `@theme inline` model, `--font-sans` is NOT emitted to `:root`, so `var(--font-sans)` in the inlined `.font-heading` utility is unresolvable at runtime. `font-heading` is used in 5 UI primitives (`alert-dialog.tsx`, `card.tsx`, `dialog.tsx`, `popover.tsx`, `sheet.tsx`) — every dialog/sheet/card title was silently falling back. **Fixed in A.3b.2** by pointing directly to `--font-geist-sans`. Visible change: all dialog/sheet/card titles now render in Geist Sans (new), rather than browser default (old). Flag in commit body.

---

## 8. Tabular numerics — target inventory (for Phase A.7)

Sites where `.tabular` should be applied (non-exhaustive starter list — refined during Phase A.7 pass):

- **Dashboard (`src/app/(dashboard)/page.tsx`):** today's session count, outstanding $, revenue $, sessions-this-week count, overdue count, attendance %, lapsed count, renew-soon count.
- **Payments (`src/app/(dashboard)/payments/page.tsx`):** outstanding total, per-payment amounts, due dates.
- **Analytics (`src/app/(dashboard)/analytics/page.tsx`):** revenue-this-month, sessions completed, no-show rate, outstanding, renewal rate.
- **Client portal (`src/app/(client)/client/page.tsx`, `client/progress/page.tsx`, `client/sessions/page.tsx`, `client/payments/page.tsx`, `client/nutrition/page.tsx`):** sessions remaining, streak counts, macros (kcal/P/C/F), measurements, payment amounts, dates.
- **Packages (`src/components/clients/*`):** "X of Y sessions", price displays.
- **Bookings (`src/app/(dashboard)/bookings/page.tsx`, `src/components/bookings/slot-picker.tsx`):** session counts, time slots.
- **Nutrition (`src/app/(dashboard)/nutrition/page.tsx`, `src/app/(client)/client/nutrition/page.tsx`, `src/components/clients/nutrition-tab.tsx`):** macros.

---

## 9. Agent gate checklist for Phase A

| Step | Files | Gate |
|---|---|---|
| A.1 audit doc (this file) | 1 new | code-reviewer |
| A.2 Icon wrapper + test | 2 new | tdd-guide (RED), typescript-reviewer, code-reviewer |
| A.3 globals.css (tokens + `.tabular` + `--font-sans` fix + conflicting override removal) | 1 | typescript-reviewer, code-reviewer |
| A.4 bottom-nav.tsx + client-bottom-nav.tsx | 2 | typescript-reviewer, code-reviewer |
| A.5 4 icon-refactor batches | ~52 across 4 batches | typescript-reviewer + code-reviewer after **each** batch |
| A.6 typography snap (2 batches) | ~19 | typescript-reviewer + code-reviewer per batch |
| A.7 `.tabular` application | ~20 | typescript-reviewer, code-reviewer |
| A.8 refactor-cleaner | residual | typescript-reviewer |
| A.9 `/quality-gate` + `/verify` | all | BLOCKING |
| A.10 commit (no push) | — | final code-reviewer on diff |

---

## 10. Decisions — CLOSED 2026-04-17

1. **§3 inline-SVG triage table** — **APPROVED.** IG brand-swirl exception inspected per-file; neither IG SVG is the ornamental swirl, so all replacements per table proceed.
2. **§4 emoji 👋 (dashboard greeting)** — **KEEP.**
3. **§4 emoji ✕ (availability close)** — **REPLACE with lucide `X`.**
4. **§5.2 `fitdesk-logo.tsx` `text-[22px]` / `text-[17px]`** — **WHITELISTED as brand exception.** Logo sits outside the locked scale by design.
5. **§6 `font-medium` (500) collapse** — **→ `font-semibold` (600).** Spot-check long-form text; flag heavy cases back to user, do not auto-revert.
6. **§7 `globals.css` line 10 `--font-sans` self-reference** — **FIX to `var(--font-geist-sans)` in Phase A.3.** Treat as a real bug. Document visible-change warning in commit/PR.

### Additional decisions

- **Badge/avatar `text-[10px]` snap to `text-micro` (12)** — proceed as planned. Spot-check payments page at 390px. Revert individual cases on regression. **If more than two places regress, pause and report back to user.**

---

## 11. Phase A.5 icon-refactor batches — laid out before migration begins

Batches are sized for agent-gate tractability (~8–20 files each). After **every** batch, typescript-reviewer + code-reviewer run as blocking gates. A failing gate halts the sequence.

### Batch 1 — UI primitives + shared (8 files)

Low-risk. Each file has 1–5 icon imports, shallow refactor.

1. `src/components/ui/sonner.tsx`
2. `src/components/ui/sheet.tsx`
3. `src/components/ui/select.tsx`
4. `src/components/ui/calendar.tsx`
5. `src/components/ui/dialog.tsx`
6. `src/components/ui/dropdown-menu.tsx`
7. `src/components/shared/bottom-nav.tsx` _(also receives filled-circle active-state treatment in Phase A.4 — sequencing note: do Phase A.4 first, Batch 1 refactor second, to avoid double-edit conflicts)_
8. `src/components/client/client-bottom-nav.tsx` _(same note)_

### Batch 2 — non-UI components, domain sheets and forms (22 files)

Highest-volume batch. Many sheets with `Loader2` spinners, and a few with richer icon sets.

1. `src/components/BookingForm.tsx`
2. `src/components/error-boundary.tsx` _(zero lucide imports — EXCLUDE; no-op)_
3. `src/components/dashboard/pending-approvals-card.tsx`
4. `src/components/calendar/WeekStrip.tsx`
5. `src/components/calendar/DayTimeline.tsx`
6. `src/components/client/measurement-sheet.tsx`
7. `src/components/client/payment-proof-sheet.tsx`
8. `src/components/clients/AddClientSheet.tsx`
9. `src/components/clients/AddClientWithPackageSheet.tsx`
10. `src/components/clients/BookingActionSheet.tsx`
11. `src/components/clients/CreateBookingSheet.tsx`
12. `src/components/clients/CreatePackageSheet.tsx`
13. `src/components/clients/LogPaymentSheet.tsx`
14. `src/components/clients/PaymentDetailSheet.tsx`
15. `src/components/clients/nutrition-tab.tsx`
16. `src/components/bookings/slot-picker.tsx`
17. `src/components/bookings/payment-section.tsx`
18. `src/components/profile/availability-settings.tsx` _(also includes ✕ emoji → lucide `X` swap per §4)_
19. `src/components/profile/booking-settings-form.tsx`
20. `src/components/profile/cancellation-policy-form.tsx`
21. `src/components/profile/payment-details-form.tsx`
22. `src/components/profile/profile-details-form.tsx` _(also includes inline-SVG → lucide `Instagram` swap per §3 #5)_
23. `src/components/profile/profile-photo-upload.tsx` _(also includes inline-SVG → lucide `Upload` swap per §3 #4)_

Effective count after excluding error-boundary (no lucide): **22 files.**

### Batch 3 — trainer (dashboard) pages (8 files)

User-facing surfaces; visual risk concentrates here. Post-batch spot-check at 390px recommended.

1. `src/app/(dashboard)/page.tsx`
2. `src/app/(dashboard)/analytics/page.tsx`
3. `src/app/(dashboard)/bookings/page.tsx`
4. `src/app/(dashboard)/clients/page.tsx`
5. `src/app/(dashboard)/clients/[id]/page.tsx`
6. `src/app/(dashboard)/nutrition/page.tsx`
7. `src/app/(dashboard)/payments/page.tsx`
8. `src/app/(dashboard)/profile/page.tsx`

### Batch 4 — auth, client portal, public book, session, onboarding, upgrade (16 files)

1. `src/app/(auth)/login/page.tsx`
2. `src/app/(auth)/reset-password/page.tsx`
3. `src/app/(auth)/signup/page.tsx`
4. `src/app/(client)/client/page.tsx`
5. `src/app/(client)/client/nutrition/page.tsx`
6. `src/app/(client)/client/payments/page.tsx`
7. `src/app/(client)/client/progress/page.tsx`
8. `src/app/(client)/client/sessions/page.tsx`
9. `src/app/book/[slug]/page.tsx` _(also includes 2 inline-SVG swaps per §3 #6a + #6b)_
10. `src/app/session/[token]/page.tsx` _(also includes inline-SVG → lucide `Package` swap per §3 #3)_
11. `src/app/session/[token]/session-actions.tsx`
12. `src/app/session/[token]/whatsapp-link.tsx`
13. `src/app/client/login/page.tsx`
14. `src/app/onboarding/page.tsx`
15. `src/app/upgrade/page.tsx`
16. `src/app/upgrade/success/page.tsx`

### Batch totals

| Batch | Files | Inline-SVG swaps embedded | Emoji swap |
|---|---|---|---|
| 1 | 8 | — | — |
| 2 | 22 | #4 Upload, #5 Instagram | ✕ → X |
| 3 | 8 | — | — |
| 4 | 16 | #3 Package, #6a Instagram, #6b MapPin | — |
| **Sum** | **54** | 5 SVG swaps | 1 emoji swap |

Note: 54 ≠ 52 because Batch 2 item 23 (profile-photo-upload) and Batch 2 item 22 (profile-details-form) are the two files that already import `lucide-react` AND contain a to-replace inline SVG — counted once in the icon-refactor total. `error-boundary.tsx` is excluded as no-op. Net unique lucide-importing files: **52**, all covered.

### Sequencing rule

Phase A.4 (nav active-state refactor) **must** run **before** Batch 1, because `bottom-nav.tsx` and `client-bottom-nav.tsx` appear in both and editing them twice risks merge conflicts during the mass-refactor sweep.

---

## 12. Adjustments approved 2026-04-17 (session protocol)

### 12.1 Geist bug-fix screenshots
Before the `--font-sans` self-reference fix lands, capture screenshots at 390px of 5–6 representative routes to `docs/pre-geist-fix/`. After the fix, capture the same routes to `docs/post-geist-fix/`. This gives a diff reference so that, during Batch 3 + Batch 4 review in Phase A.5, we can distinguish "Geist bug fix exposed this" vs "batch introduced this regression."

Representative route set:
- `/` (trainer dashboard)
- `/client` (client portal home)
- `/book/[slug]` (public booking — any seeded trainer)
- `/login` (auth)
- `/clients/[id]` with "Add package" or "Add client" sheet open (sheet/form surface)
- `/payments` (dense list — catches badge 10→12 snap regressions too, bonus coverage)

### 12.2 Split A.3 into A.3a + A.3b (session-level split only, single commit at end)
- **A.3a** — Fix `globals.css` line 10 only: `--font-sans: var(--font-sans)` → `--font-sans: var(--font-geist-sans)`. Start dev server. Visually verify Geist is now rendering on previously-fallback surfaces. Capture `docs/post-geist-fix/` screenshots.
- **A.3b** — Add locked typography tokens (`--text-display-lg/md/sm`, `--text-body-lg/sm`, `--text-micro`) + weight tokens + `.tabular` utility. Remove conflicting `.text-xs { !important }` / `.text-sm { !important }` overrides. Also collapse CSS-defined weights in `.btn-gradient`, `.pill-gradient`, `.badge-pro`, `.label-upper` to 600 per §6.

This is a working-session split for diagnosis isolation. **Phase A still ends in a single commit** per the original plan.

### 12.3 Per-file IG swap visual sanity check — MOOT (2026-04-18)

**Superseded.** Discovered during Batch 2 that `lucide-react@1.7.0` dropped brand icons in its v1 major release. There is no `Instagram` export to swap to and no side-by-side comparison to produce. Both Instagram inline SVGs (profile-details-form #5 and book/[slug] #6a) are now whitelisted per revised §3. This action item is retired.

### 12.4 Batch 4 pre-batch cleanup — 4 `Date.now()`-in-render lint errors (2026-04-18)

`npm run lint` surfaced 4 pre-existing `react-hooks/purity` errors where `Date.now()` is called inside a render path. All 4 sites are inside files Batch 4 already intends to touch, so the fix is deferred to the start of Batch 4 to avoid opening the same files twice. Batch 4's plan should run this cleanup **before** the icon refactor begins.

Sites:
- `src/app/(client)/client/page.tsx:153`
- `src/app/(client)/client/sessions/page.tsx:120`
- `src/app/(client)/client/sessions/page.tsx:235`
- `src/app/session/[token]/page.tsx:151`

Fix pattern: replace the in-render `Date.now()` with `useMemo(() => Date.now(), [])` for one-time capture, or lift the timestamp to a prop/parent-computed value. For time-dependent logic that must re-evaluate, a `useEffect` + `setState` with an interval is the right React-idiomatic path.

### 12.5 Hydration / init-from-async-data guards — lint disables applied (2026-04-18)

`react-hooks/set-state-in-effect` fired on 4 sites. Fix: explicit `eslint-disable-next-line` with a *specific* justification comment on each site (never blanket). Never add `--no-verify` or similar suppressions.

- `src/components/shared/bottom-nav.tsx:22` — `-- SSR hydration guard, intentional`
- `src/components/client/client-bottom-nav.tsx:21` — `-- SSR hydration guard, intentional`
- `src/app/(dashboard)/clients/[id]/page.tsx:82` — `-- syncing form state with async query result, intentional`
- `src/app/(dashboard)/page.tsx:38` — `-- client-only auth user + locale-dependent greeting/date derivation, intentional`

The first two are canonical SSR hydration guards (`setMounted(true)` deferred past hydration). The other two are form-state init from async data and client-only user/locale derivation — different patterns, but both defensible. Justifications are differentiated per site so a future dev can judge whether the disable still applies.

---

## 13. Icon sizing below the wrapper scale (2026-04-18)

The `<Icon>` wrapper's public API is **locked to 3 size tokens**: `sm` (16px), `md` (20px), `lg` (24px). This is deliberate and will not expand.

Some real-world call sites need icons below 16px — inline next to `text-xs` or `text-sm`, inside `Badge` chips, inside tight button `xs` / `sm` variants, or as spinner glyphs matching the text line-height. Bumping these up to 16px would visibly break inline rhythm.

### The rule

1. **Every icon usage goes through `<Icon>`.** No raw lucide JSX in feature code. Period.
2. **For sub-16px needs, use the className escape hatch:**
   ```tsx
   // 12px to match text-xs inline
   <Icon name={Loader2} size="sm" className="size-3 animate-spin" />
   ```
   `tailwind-merge` via `cn()` drops the wrapper's `size-4` in favor of the caller's `size-3`. The `size="sm"` prop still sets the 16px `width`/`height` SVG attributes as a structural fallback, but CSS `size-3` wins visually.
3. **Always add a one-line inline comment** when overriding below sm, naming the reason (inline with `text-xs`, inside `Badge`, inside button `xs`, etc.). The comment is there to prevent future edits from silently regressing to raw `<LucideIcon className="h-3 w-3" />` and bypassing the wrapper.

### What this prevents

Without this rule, Phase A's wrapper discipline would decay the moment someone needs a 12px icon — they'd go around the wrapper, import raw lucide, add `h-3 w-3`, and over weeks the codebase would split into wrapped-and-unwrapped icon call sites again. The escape hatch keeps every icon inside the wrapper's ergonomic contract while preserving exact visual parity for tight-rhythm cases.

### Systemic flags noted during Batch 3 gates (2026-04-18)

**1. aria-hidden risk for icon-only buttons.** The wrapper sets `aria-hidden={true}` whenever no `aria-label` is passed. This is correct for decorative icons (icon adjacent to visible text). It is **wrong** when `<Icon>` is the sole accessible name of an icon-only button AND neither the icon nor the button carries an `aria-label`. Current mitigation: every icon-only button must have `aria-label` on the button itself. Caught in Batch 3: Trash2 delete button in `clients/[id]/page.tsx:374` needed `aria-label="Delete recurring schedule"` added. Pattern to enforce: any `<Button size="icon">` containing only an `<Icon>` must carry `aria-label` on the Button. Add to pre-commit checklist.

**2. width/height DOM attrs inconsistent with rendered class for sub-scale overrides.** When a caller uses the escape hatch (e.g. `size="sm" className="size-3"`), the wrapper emits `<svg width="16" height="16" class="size-3">`. CSS `size-3` wins at paint → renders 12px. DOM attributes carry 16, rendered visual is 12px. Inconsistent but not a browser bug. Keeping width/height attrs as the structural fallback for environments without CSS (email, feed readers, screenshotters) is worth more than the DOM/CSS consistency. Flagged, no action.

### Do not add `size="xs"` — standing decision (2026-04-18)

The 3-token API (sm/md/lg) is locked. **Do not propose adding `xs`.** The className override pattern is the documented escape hatch and is self-documenting at the usage site. A code review flagging these overrides as duplication should be overruled — the 3-token scale is a deliberate forcing function.

Rationale:
1. **The 3-token scale is a forcing function for consistency.** Adding `xs` makes it 4, and the same logic then applies to any future edge case ("we have 5 uses at 14px, add `size='xs2'`"). The locked scale has to stay locked to mean anything.
2. **The overrides are self-documenting** with inline comments like `// 12px to match text-xs inline`. A reader sees exactly what's happening and why.
3. **The overrides are concentrated in inline-with-small-text contexts.** They're not scattered randomness; they're a principled exception pattern.

If this comes up again in a code review (human or AI), reject and link to this section.

### Applied during Batch 2

The following sub-16px call sites use the `size="sm" className="size-3"` (or `size-3.5`) override pattern:
- `dashboard/pending-approvals-card.tsx` — small status glyphs inside action buttons
- `clients/BookingActionSheet.tsx` — chevrons in "more actions" toggle + spinner in note-save footer
- `clients/nutrition-tab.tsx` — 4 mini-stat glyphs (Flame, Beef, Wheat, Droplets) inline with small nutrition labels
- `bookings/payment-section.tsx` — loader inside a small button
- `profile/availability-settings.tsx` — delete glyph + loader + plus glyph inside xs-variant buttons
- `profile/booking-settings-form.tsx` — Copy + Share2 inside xs-variant buttons
- `profile/profile-photo-upload.tsx` — loader inside a 24px avatar badge
- `BookingForm.tsx` — status check glyph inline with caption text (14px variant)

---

*End of audit. Approved — proceeding to Phase A.2.*
