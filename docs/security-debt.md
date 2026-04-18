# Security Debt

Real security concerns surfaced during non-security work. Captured here so they're not lost. Each item should be addressed in a dedicated `security-reviewer` pass, not folded into feature phases.

---

## 2026-04-19 — Password policy mismatch: reset allows 6 chars while signup requires 8

**Files:**
- `src/app/(auth)/signup/page.tsx:28` — enforces `password.length < 8`
- `src/app/(auth)/reset-password/page.tsx:26` — enforces `password.length < 6`

**Current state:**
- Signup minimum: **8 characters**
- Password reset minimum: **6 characters**

**Expected state:** both paths enforce the same minimum. Actual policy should be decided — most likely 8 (what signup already requires) or whatever the updated product policy is. Consider Supabase Auth's own `password_min_length` setting as the source of truth; enforce both client and server.

**Severity:** MEDIUM. A user who signs up with an 8-char password can weaken their credential to 6 chars via the reset flow, inverting the policy the signup surface promised. Not a remote-compromise vector on its own, but a policy inversion that invalidates the security posture promised at signup.

**Fix sketch:**
1. Decide the canonical minimum (probably 8).
2. Factor into a shared constant (e.g. `PASSWORD_MIN_LENGTH` in `src/lib/auth-constants.ts`).
3. Use it in both signup and reset-password validators.
4. Also enforce server-side if the API surface allows direct password updates.
5. If Supabase Auth has a server-side minimum configured, align it to match.

**Owner:** defer to `security-reviewer` agent pass — not a design-polish item.

Caught during Phase A.5 Batch 4 code-review gate.

---

## Post-Phase-A todo

- [ ] Run `security-reviewer` agent across `src/app/(auth)/*`, `src/app/api/auth/*`, and any password-handling surfaces. Address password policy mismatch as item 1.

---
