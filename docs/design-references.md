# FitDesk — Design References

A living log of external design references we've studied, what we're taking from them, and what we're explicitly leaving behind. Add new entries at the top. Reference entries should be concrete enough that a future Phase can act on them without re-opening the original source.

---

## Entry 1 — Medical records calendar reference (week-strip + expand-to-month)

**Date added:** 2026-04-18
**Source:** External reference image (dreamstime-style stock mockup of a medical records mobile calendar, week view + month view side-by-side)
**Context:** Reviewed while on `/bookings` redesign thinking, during Phase A pre-fix screenshot review.

### What the reference shows
Two phone mockups side by side. Left = collapsed week view: navy header with month name, seven-day strip with today highlighted as a filled blue pill, vertical timeline below with event cards (colored left-edge accent, bold title, secondary time, overflow menu). Right = expanded month view: same strip unfolds into a full month grid, tap-to-collapse back.

### Strengths worth adopting

1. **Week-strip typography pairing.** Small day-of-week label (MON, TUE…) sits tight above a bold date number. The two elements read as a single unit, not two stacked elements. FitDesk's current week strip renders the day label and date at visually similar weights, which reads as two rows competing for attention.
   - **Where to apply in FitDesk:** `/bookings` week strip. Small caps day label (`micro` scale, semibold, reduced opacity) above a `display` scale bold date number.
   - **When:** Phase A.6 (typography snap pass) — this is purely a weight/size/spacing change, no new logic.

2. **Colored left-edge strip on event cards.** A 4–6px vertical colored bar on the leading edge of each event card, used as a category tag. Cheap visual categorization, scannable at a glance, doesn't consume horizontal space the way badges or pills do.
   - **Where to apply in FitDesk:** Session cards on `/bookings`, upcoming-session cards on the trainer dashboard, and client-side session cards.
   - **Proposed color mapping for FitDesk (PT-specific):**
     - Teal (accent) — confirmed + paid
     - Amber — confirmed but payment pending
     - Red — cancelled or overdue payment
     - Neutral/gray — completed / past session
   - **When:** After Phase A, as part of the "session cards" polish work. Likely Phase C-adjacent or a dedicated mini-phase once seed data with real sessions exists.

3. **Expand-to-month gesture on the week strip.** Tapping the month name header unfolds the week strip into a full month grid; tapping again collapses it back. Solves the "I want to book three weeks out" scenario without leaving the calendar view.
   - **Where to apply in FitDesk:** `/bookings` header, the area currently showing `13 Apr – 19 Apr ›`.
   - **When:** Post-beta enhancement. Not Phase A. Worth building after the beta cohort gives feedback on calendar UX.

### What we explicitly do NOT take from this reference

1. **Navy header / white body split.** Dated 2019/2020 iOS aesthetic. FitDesk's dark theme is more modern and aligns with the fitness-app category (Strava, Whoop, Caliber, Future are all dark-first). Do not introduce a light body surface.

2. **Event-time-only left column.** The reference shows only times at which events occur (8:10, 10:10, 13:40). This looks clean in a mockup but breaks for PT use where open slots matter as much as booked ones. FitDesk's fixed hour grid (7 AM → 9 PM with consistent spacing) is more functionally honest for scheduling and should be kept.

3. **The header/footer generic iOS affordances (Home / Schedule / Diagnosis / Archive / Chat).** Not relevant — FitDesk has its own domain-appropriate tab structure.

### What FitDesk already does better than this reference

Flagging these so we don't accidentally regress them during future redesign work:

- **"Copy week →"** button. The reference has no equivalent. This is a PT superpower — trainers repeat schedules weekly and this saves enormous time. Must be preserved.
- **"+ Add session" and "Block day"** actions above the timeline. PT-specific affordances the reference lacks.
- **Full hour grid** with explicit empty slots. More honest for a scheduling app than the reference's event-only timeline.
- **"No sessions — tap any slot to add one"** empty state. Tells the user what to do. Reference has no empty state.

### Action items extracted

| Action | Phase | Priority |
|---|---|---|
| Week-strip typography pairing (small day-of-week above bold date number) | A.6 (typography snap) | Medium |
| Colored left-edge strip on session cards with PT-specific color mapping (teal/amber/red/gray) | Post-Phase-A session-cards polish | High |
| Expand week-strip to full month grid on tap | Post-beta | Low |

---
