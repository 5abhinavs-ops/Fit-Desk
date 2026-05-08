import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = "https://fitdesk-pro.vercel.app";
const SHOTS = ".gstack/qa-reports/screenshots";
mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const issues = [];
let issueId = 0;

function logIssue(severity, category, title, details, route) {
  issueId++;
  issues.push({ id: `ISSUE-${String(issueId).padStart(3, "0")}`, severity, category, title, details, route });
}

async function captureRoute(page, path, name, viewport) {
  const vp = viewport || { width: 390, height: 844 };
  await page.setViewportSize(vp);
  const url = `${BASE}${path}`;
  const pageErrors = [];

  const errorHandler = (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      pageErrors.push(text);
      consoleErrors.push({ route: path, error: text });
    }
  };
  page.on("console", errorHandler);

  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    const status = resp?.status() || 0;

    if (status >= 400 && status !== 401) {
      logIssue("high", "functional", `HTTP ${status} on ${path}`, `Route returned ${status}`, path);
    }

    await page.waitForTimeout(1500);
    const filename = `${name}-${vp.width}px.png`;
    await page.screenshot({ path: join(SHOTS, filename), fullPage: true });

    // Check for visible error text on page
    const bodyText = await page.textContent("body").catch(() => "");
    if (/application error|500|internal server error/i.test(bodyText) && !/\$500|\$5,?00/i.test(bodyText)) {
      logIssue("blocker", "functional", `Application error visible on ${path}`, bodyText.slice(0, 200), path);
    }

    // Check for hydration errors in console
    for (const err of pageErrors) {
      if (/hydration|text content did not match/i.test(err)) {
        logIssue("high", "console", `Hydration error on ${path}`, err.slice(0, 300), path);
      }
    }

    return { status, errors: pageErrors, filename };
  } catch (e) {
    logIssue("high", "functional", `Navigation timeout on ${path}`, e.message, path);
    return { status: 0, errors: pageErrors, filename: "" };
  } finally {
    page.off("console", errorHandler);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // ═══════════════════════════════════════════════
  // PART A: Public routes (no auth needed)
  // ═══════════════════════════════════════════════
  console.log("\n=== PART A: PUBLIC ROUTES ===\n");

  const publicRoutes = [
    { path: "/login", name: "login" },
    { path: "/signup", name: "signup" },
    { path: "/reset-password", name: "reset-password" },
    { path: "/onboarding", name: "onboarding" },
    { path: "/book/demo", name: "book-public" },
    { path: "/upgrade", name: "upgrade" },
    { path: "/upgrade/success", name: "upgrade-success" },
  ];

  for (const r of publicRoutes) {
    console.log(`  Visiting ${r.path}...`);
    const result = await captureRoute(page, r.path, r.name);
    console.log(`    Status: ${result.status} | Errors: ${result.errors.length}`);
  }

  // ═══════════════════════════════════════════════
  // PART B: Auth flow — signup
  // ═══════════════════════════════════════════════
  console.log("\n=== PART B: SIGNUP FLOW ===\n");

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SHOTS, "flow1-signup-form.png"), fullPage: true });

  // Check signup form fields exist
  const signupInputs = await page.$$("input");
  console.log(`  Signup form inputs found: ${signupInputs.length}`);
  if (signupInputs.length < 2) {
    logIssue("blocker", "functional", "Signup form missing inputs", `Only ${signupInputs.length} inputs found`, "/signup");
  }

  // Check for submit button
  const signupButtons = await page.$$("button[type='submit'], button:has-text('Sign'), button:has-text('Create')");
  console.log(`  Signup buttons found: ${signupButtons.length}`);
  if (signupButtons.length === 0) {
    logIssue("high", "functional", "Signup form missing submit button", "No submit/signup button found", "/signup");
  }

  // ═══════════════════════════════════════════════
  // PART C: Login flow
  // ═══════════════════════════════════════════════
  console.log("\n=== PART C: LOGIN FLOW ===\n");

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(SHOTS, "flow1-login-form.png"), fullPage: true });

  const loginInputs = await page.$$("input");
  console.log(`  Login form inputs found: ${loginInputs.length}`);

  // Check password visibility toggle
  const pwToggle = await page.$("button[aria-label*='password'], button[aria-label*='Password'], [data-testid='password-toggle']");
  console.log(`  Password toggle: ${pwToggle ? "found" : "not found"}`);

  // Check forgot password link
  const forgotLink = await page.$("a[href*='reset'], a:has-text('Forgot'), a:has-text('forgot')");
  console.log(`  Forgot password link: ${forgotLink ? "found" : "not found"}`);
  if (!forgotLink) {
    logIssue("medium", "ux", "No forgot password link on login page", "Users who forget password have no recovery path from login", "/login");
  }

  // ═══════════════════════════════════════════════
  // PART D: Auth-gated routes (will redirect to login)
  // ═══════════════════════════════════════════════
  console.log("\n=== PART D: AUTH-GATED ROUTES (checking redirect behavior) ===\n");

  const authRoutes = [
    { path: "/", name: "dashboard" },
    { path: "/clients", name: "clients" },
    { path: "/bookings", name: "bookings" },
    { path: "/payments", name: "payments" },
    { path: "/profile", name: "profile" },
    { path: "/analytics", name: "analytics" },
    { path: "/nutrition", name: "nutrition" },
  ];

  for (const r of authRoutes) {
    console.log(`  Visiting ${r.path} (expect redirect to login)...`);
    await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1500);
    const currentUrl = page.url();
    const wasRedirected = currentUrl.includes("/login") || currentUrl.includes("/signup");
    console.log(`    Redirected: ${wasRedirected} | Current URL: ${currentUrl}`);
    await page.screenshot({ path: join(SHOTS, `authgate-${r.name}.png`), fullPage: true });

    if (!wasRedirected) {
      // Check if page shows auth error or empty state instead of redirect
      const body = await page.textContent("body").catch(() => "");
      if (/unauthorized|sign in|log in/i.test(body)) {
        logIssue("medium", "ux", `${r.path} shows auth message instead of redirecting`, "Should auto-redirect to login", r.path);
      } else if (body.trim().length < 50) {
        logIssue("high", "functional", `${r.path} shows blank page for unauthenticated user`, "No redirect, no error message, no content", r.path);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // PART E: Public booking page deep test
  // ═══════════════════════════════════════════════
  console.log("\n=== PART E: PUBLIC BOOKING PAGE ===\n");

  await page.goto(`${BASE}/book/demo`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOTS, "flow7-book-public.png"), fullPage: true });

  const bookingBody = await page.textContent("body").catch(() => "");
  if (/not found|404|no trainer/i.test(bookingBody)) {
    console.log("  /book/demo returns not found (expected if no demo slug exists)");
  } else {
    // Check for booking form elements
    const bookingInputs = await page.$$("input");
    const bookingButtons = await page.$$("button");
    console.log(`  Booking page inputs: ${bookingInputs.length}, buttons: ${bookingButtons.length}`);
  }

  // ═══════════════════════════════════════════════
  // PART F: Upgrade flow
  // ═══════════════════════════════════════════════
  console.log("\n=== PART F: UPGRADE FLOW ===\n");

  await page.goto(`${BASE}/upgrade`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SHOTS, "flow9-upgrade.png"), fullPage: true });

  const upgradeBody = await page.textContent("body").catch(() => "");
  const hasPricing = /\$19|\$190|pro|upgrade/i.test(upgradeBody);
  console.log(`  Shows pricing/upgrade info: ${hasPricing}`);
  if (!hasPricing) {
    logIssue("high", "functional", "Upgrade page missing pricing information", "No $19 or Pro tier info visible", "/upgrade");
  }

  // Check for Stripe checkout button
  const stripeBtn = await page.$("button:has-text('Upgrade'), button:has-text('Subscribe'), button:has-text('Checkout'), a:has-text('Upgrade')");
  console.log(`  Stripe checkout trigger: ${stripeBtn ? "found" : "not found"}`);

  // ═══════════════════════════════════════════════
  // PART G: RESPONSIVE TEST — 3 viewports
  // ═══════════════════════════════════════════════
  console.log("\n=== PART G: RESPONSIVE TEST ===\n");

  const viewports = [
    { width: 390, height: 844, label: "390px" },
    { width: 768, height: 1024, label: "768px" },
    { width: 1280, height: 800, label: "1280px" },
  ];

  const responsiveRoutes = ["/login", "/signup", "/upgrade", "/book/demo", "/onboarding"];

  for (const r of responsiveRoutes) {
    for (const vp of viewports) {
      const name = r.replace(/\//g, "-").replace(/^-/, "") || "home";
      console.log(`  ${r} @ ${vp.label}...`);
      await captureRoute(page, r, `responsive-${name}`, vp);
    }
  }

  // ═══════════════════════════════════════════════
  // PART H: DARK MODE AUDIT (already in dark scheme)
  // ═══════════════════════════════════════════════
  console.log("\n=== PART H: DARK MODE AUDIT ===\n");

  // We're already in dark color scheme. Capture key screens.
  const darkRoutes = ["/login", "/signup", "/reset-password", "/onboarding", "/upgrade", "/book/demo"];

  for (const path of darkRoutes) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
    const name = path.replace(/\//g, "-").replace(/^-/, "");
    await page.screenshot({ path: join(SHOTS, `dark-${name}.png`), fullPage: true });

    // Check for white backgrounds that indicate unthemed elements
    const whiteBoxes = await page.$$eval("*", (els) => {
      let count = 0;
      for (const el of els) {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        if (bg === "rgb(255, 255, 255)" && el.offsetWidth > 50 && el.offsetHeight > 20) {
          count++;
        }
      }
      return count;
    }).catch(() => 0);

    console.log(`  ${path}: white-bg elements = ${whiteBoxes}`);
    if (whiteBoxes > 2) {
      logIssue("medium", "visual", `Unthemed white elements in dark mode on ${path}`, `${whiteBoxes} elements with white background detected`, path);
    }
  }

  // Now check light mode too for comparison
  console.log("\n  Switching to light mode for comparison...");
  await context.close();

  const lightContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    colorScheme: "light",
  });
  const lightPage = await lightContext.newPage();

  for (const path of darkRoutes) {
    await lightPage.setViewportSize({ width: 390, height: 844 });
    await lightPage.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await lightPage.waitForTimeout(1000);
    const name = path.replace(/\//g, "-").replace(/^-/, "");
    await lightPage.screenshot({ path: join(SHOTS, `light-${name}.png`), fullPage: true });
    console.log(`  Light mode: ${path} captured`);
  }

  // ═══════════════════════════════════════════════
  // PART I: DESIGN REVIEW CHECKS
  // ═══════════════════════════════════════════════
  console.log("\n=== PART I: DESIGN REVIEW ===\n");

  // Check touch target sizes on login page
  await lightPage.setViewportSize({ width: 390, height: 844 });
  await lightPage.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await lightPage.waitForTimeout(1000);

  const smallButtons = await lightPage.$$eval("button, a, input[type='submit']", (els) => {
    return els.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.height < 44 && rect.width > 0 && rect.height > 0;
    }).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim().slice(0, 30),
      height: Math.round(el.getBoundingClientRect().height),
      width: Math.round(el.getBoundingClientRect().width),
    }));
  }).catch(() => []);

  console.log(`  Small touch targets (<44px) on /login: ${smallButtons.length}`);
  for (const btn of smallButtons.slice(0, 5)) {
    console.log(`    ${btn.tag}: "${btn.text}" — ${btn.width}x${btn.height}`);
  }
  if (smallButtons.length > 0) {
    logIssue("medium", "accessibility", "Touch targets below 44px minimum",
      `${smallButtons.length} interactive elements under 44px height on /login: ${smallButtons.slice(0,3).map(b => `"${b.text}" ${b.width}x${b.height}`).join(", ")}`,
      "/login");
  }

  // Check font sizes
  const smallText = await lightPage.$$eval("*", (els) => {
    let count = 0;
    for (const el of els) {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12 && el.textContent?.trim().length > 0 && el.offsetHeight > 0) {
        count++;
      }
    }
    return count;
  }).catch(() => 0);
  console.log(`  Elements with font-size < 12px on /login: ${smallText}`);

  await lightPage.close();
  await lightContext.close();
  await browser.close();

  // ═══════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════
  console.log("\n\n" + "=".repeat(60));
  console.log("QA RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log(`\nTotal issues found: ${issues.length}`);
  console.log(`Console errors logged: ${consoleErrors.length}`);
  console.log(`\nBy severity:`);

  const severities = ["blocker", "high", "medium", "low"];
  for (const s of severities) {
    const count = issues.filter(i => i.severity === s).length;
    if (count > 0) console.log(`  ${s.toUpperCase()}: ${count}`);
  }

  console.log(`\nBy category:`);
  const categories = [...new Set(issues.map(i => i.category))];
  for (const c of categories) {
    const count = issues.filter(i => i.category === c).length;
    console.log(`  ${c}: ${count}`);
  }

  console.log("\n--- ISSUES ---\n");
  for (const issue of issues) {
    console.log(`[${issue.id}] ${issue.severity.toUpperCase()} | ${issue.category} | ${issue.route}`);
    console.log(`  ${issue.title}`);
    console.log(`  ${issue.details.slice(0, 200)}`);
    console.log();
  }

  console.log("\n--- CONSOLE ERRORS ---\n");
  for (const err of consoleErrors.slice(0, 20)) {
    console.log(`  ${err.route}: ${err.error.slice(0, 150)}`);
  }

  // Write JSON for further analysis
  writeFileSync(".gstack/qa-reports/qa-results.json", JSON.stringify({ issues, consoleErrors, timestamp: new Date().toISOString() }, null, 2));
  console.log("\n✓ Results saved to .gstack/qa-reports/qa-results.json");
  console.log("✓ Screenshots saved to .gstack/qa-reports/screenshots/");
})();
