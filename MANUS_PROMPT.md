# Manus AI Setup Prompt — Hibi Matcha POS

Copy everything inside the fenced block below and paste it as a single message to Manus.

---

```
You are setting up and verifying a production-grade POS + Backoffice system for
"Hibi Matcha" — a Japanese matcha cafe franchise. The codebase is 100%
complete; your job is deployment, smoke-testing, and reporting.

══════════════════════════════════════════════════════════════════════════════
SECTION A — Pre-flight (read first, takes < 1 min)
══════════════════════════════════════════════════════════════════════════════

1. cd into the project root. Verify these key files exist:
   • package.json
   • drizzle.config.ts
   • drizzle/schema.ts        (32 tables)
   • server/routers.ts        (19 routers registered)
   • server/seed/index.ts     (seed entry point)
   • .env                     (already filled with TiDB credentials)
   • HANDOFF.md               (full reference if you get stuck)
   • client/public/menu/      (98 menu photos — should be present)
   • hibi-seed-package/seed-data/menu-full.json  (138 menu items)
   • hibi-seed-package/seed-data/inventory.json   (394 inventory items)

2. Inspect .env (DO NOT print secrets to logs):
   • DATABASE_URL must be a TiDB Cloud mysql:// URL with ssl param
   • JWT_SECRET must be ≥ 32 chars. If it contains "change-this" or
     "CHANGE-ME", replace it with a fresh random 48-char string
     (e.g. openssl rand -hex 24).
   • GOOGLE_SHEET_WEBAPP_URL and DELIVERY_WEBHOOK_SECRET are optional —
     leave blank unless you finish SECTION H.

3. Tech stack: React 19 + Vite 6 (client) · Express 4 + tRPC v11 (server)
   · Drizzle ORM · TiDB Cloud (MySQL). Node version: 20+. Package manager:
   pnpm preferred (npm works as fallback).

══════════════════════════════════════════════════════════════════════════════
SECTION B — Install + database push (5–10 min)
══════════════════════════════════════════════════════════════════════════════

4. Install dependencies:
       pnpm install
   If pnpm not available: npm install --legacy-peer-deps

5. (Optional but recommended) Create a fresh schema in TiDB instead of
   using the default "sys" database:
       Connect to the cluster via any MySQL client and run:
           CREATE DATABASE IF NOT EXISTS hibi_matcha;
       Then update .env, changing the /sys?ssl=... part of DATABASE_URL
       to /hibi_matcha?ssl=...

6. Push the schema (this generates a migration then applies it):
       npm run db:push
   Expected output: drizzle-kit generates SQL, then applies all 32
   CREATE TABLE statements with no errors. If drizzle-kit prompts you
   to confirm a destructive change, it should NOT — answer "no" and
   investigate. (Tables are all new on a fresh DB.)

7. Run TypeScript type check:
       npm run check
   Expected: zero TS errors. If errors appear, capture them — they are
   real bugs to report back, not setup issues.

══════════════════════════════════════════════════════════════════════════════
SECTION C — Seed data (1–2 min)
══════════════════════════════════════════════════════════════════════════════

8. Run the idempotent seed:
       npm run seed

   Expected console output blocks (in order):
       → Branches                             (~6 branches)
       → Super admin (HMC-0001)
       → Demo staff_admin (HMC-ADMIN) + staff (HMC-STAFF)
       → Staff (from staff.json)              (~18 imported)
       → Inventory categories                 (~24 categories)
       → Tea catalog                          (~45 inserted)
       → Inventory items                      (~394 inserted)
       → Pricing updates                      (~264 updated)
       → Initial stock records (Hibi House)   (~394 stock rows, ~9 non-zero)
       → Option groups                        (5 baseline groups)
       → Hibi real menu (from xlsx)
            9 menu categories
            ~138 menu items inserted
            ~38 option groups from xlsx
            ~600 item ↔ option-group links
       → Payment methods                      (17 methods)

   The script ends with a credentials box. Confirm it prints:
       SUPER ADMIN  HMC-0001  super2026  PIN 1234
       STAFF ADMIN  HMC-ADMIN admin2026  PIN 1234
       STAFF        HMC-STAFF staff2026  PIN 1234

══════════════════════════════════════════════════════════════════════════════
SECTION D — Start the app (30 sec)
══════════════════════════════════════════════════════════════════════════════

9. Start dev server in the background:
       npm run dev
   Wait until Vite prints "Local: http://localhost:5173" (or similar).
   Confirm no fatal errors in the terminal. Some "process.env" warnings
   are normal.

══════════════════════════════════════════════════════════════════════════════
SECTION E — Smoke test in browser (3–5 min)
══════════════════════════════════════════════════════════════════════════════

Use any headless browser tool you have (or browser MCP). For each test,
capture a screenshot + the visible URL + zero console errors as proof.

10. **Bootstrap auto-redirect test (skip if you ran seed)**:
    Visit http://localhost:5173/#/login → should land on /#/login (NOT /#/setup)
    because seed created HMC-0001 already.

11. **Super Admin login**:
    Enter: HMC-0001 / super2026 → submit. Expect navigation to /#/backoffice.
    Sidebar should show: Overview · Menu & Sales · Inventory · Suppliers ·
    Knowledge · People · Franchise (super-only).
    Click "Distribute Center" — should show 3 cards (Menu / Stock / SOPs).
    Click "Menu Items" — should list 138 items with photos visible (PNG load OK).

12. **POS terminal as Staff**:
    Log out (click avatar → Log out). Log in as HMC-STAFF / staff2026.
    Expect AUTO-REDIRECT to /#/pos/terminal (because role=staff).
    The menu grid should show 138 items with 9 category tabs.
    Click a Classic Clear Matcha card → OptionSheet drawer opens.
    Sweetness selector (0g/3g/5g/8g/10g/15g) must be visible.
    Pick options → "Add to Cart". Cart total updates with VAT.
    Click "Charge" → navigates to /#/pos/payment.

13. **Cash payment**:
    Select "Cash" tile → numeric keypad appears.
    Enter 500 → change-due shows positive.
    Click "Confirm Payment" → navigates to /#/pos/receipt with order number.
    Browser print dialog may appear (auto-print) — close it.

14. **Verify in Order History**:
    Click "Orders" in POS toolbar → row for the order you just placed
    should appear with status = completed.

15. **Settings → Automation** (any role):
    Navigate /#/settings → click "Automation" tab.
    You should see 10 toggle switches grouped by Payment / Hardware /
    Sync / Knowledge / Kitchen / Stock / Reports. Confirm "Reset to
    defaults" button works.

══════════════════════════════════════════════════════════════════════════════
SECTION F — Distribute Center sanity (1 min)
══════════════════════════════════════════════════════════════════════════════

16. Log in again as HMC-0001 → /#/backoffice/distribute.
    Click the "Menu" card → drawer opens.
    Pick any 2-3 menu items, pick "Sukhumvit 39" branch, confirm.
    Expect success alert. No error in console.

══════════════════════════════════════════════════════════════════════════════
SECTION G — Delivery integration check (optional, 1 min)
══════════════════════════════════════════════════════════════════════════════

17. Navigate /#/backoffice/delivery. You should see the Delivery Orders
    page with 5 platform cards (Grab / LINE MAN / ShopeeFood / FoodPanda
    / Robinhood) showing zero orders. Click "Manual Order" → drawer
    opens (don't submit unless you want a test order).

══════════════════════════════════════════════════════════════════════════════
SECTION H — Google Sheets sync (optional, 5 min) — ONLY if user requests it
══════════════════════════════════════════════════════════════════════════════

18. Open HANDOFF.md → section "6.5 Google Sheets Cash Sync — Setup".
    Follow the Apps Script deploy steps exactly.
    Paste the resulting Web App URL into .env as GOOGLE_SHEET_WEBAPP_URL.
    Restart npm run dev.
    Make one more test cash payment.
    Open the linked sheet → confirm a row appears in the "cash" tab.

══════════════════════════════════════════════════════════════════════════════
SECTION I — Acceptance criteria (the bar you must meet)
══════════════════════════════════════════════════════════════════════════════

PASS criteria (all must be true):
  ☐ pnpm install succeeded with no fatal errors
  ☐ npm run db:push created tables (drizzle reported success)
  ☐ npm run seed completed with the credentials box at the end
  ☐ npm run check ran with zero TS errors
  ☐ Dev server starts and serves /#/login
  ☐ HMC-0001 login lands on /#/backoffice with no console errors
  ☐ HMC-STAFF login lands on /#/pos/terminal automatically
  ☐ POS cart → payment → receipt completes end-to-end
  ☐ Menu images load (no broken-image icons)
  ☐ Order appears in /#/pos/orders after payment

══════════════════════════════════════════════════════════════════════════════
SECTION J — Hard rules
══════════════════════════════════════════════════════════════════════════════

DO NOT:
  • Modify any TypeScript/JSX source file unless a step fails AND the
    fix is one-line and obvious (e.g. missing env var). Anything bigger
    → STOP and report.
  • Run npm run db:push more than once unless seed fails AND HANDOFF.md
    instructs it.
  • Run npm run seed multiple times in parallel.
  • Commit anything to git.
  • Push to any remote.
  • Modify .env beyond the JWT_SECRET / GOOGLE_SHEET_WEBAPP_URL /
    DELIVERY_WEBHOOK_SECRET fields.
  • Delete or rename anything inside hibi-seed-package/seed-data/.
  • Touch client/public/menu/ photos.

DO:
  • Use HANDOFF.md as ground truth for anything ambiguous.
  • Stop and report on the first hard failure.
  • Capture full stderr when a command fails.

══════════════════════════════════════════════════════════════════════════════
SECTION K — Troubleshooting (common failures + fixes)
══════════════════════════════════════════════════════════════════════════════

• "DATABASE_URL is required" — .env not loaded. Confirm .env is in
  project root (not client/ or server/). Restart shell so dotenv picks
  it up.

• "ECONNREFUSED" or TLS handshake errors on db:push — TiDB Cloud cluster
  is offline OR your IP is not in the access list. Add your egress IP
  in TiDB Cloud Console → Network Access → Add IP.

• "Unknown database 'sys'" — switch DATABASE_URL to use /hibi_matcha?
  (see step 5). Create the DB first with CREATE DATABASE.

• "Duplicate entry" during seed — DB not empty from a previous attempt.
  Either DROP DATABASE and start over, or ignore (seed is idempotent and
  skips existing rows).

• "Cannot find module" on dev — pnpm install didn't finish. Re-run.

• Vite port already in use — kill the existing dev server or set
  VITE_PORT=5174 in .env.

• /setup loops back to /login (or vice versa) — DB is empty. Run
  npm run seed again.

• Login fails "Invalid credentials" but seed reported success — JWT_SECRET
  was changed AFTER login. Set it once before any login, then keep it.

══════════════════════════════════════════════════════════════════════════════
SECTION L — Final report (return this verbatim format)
══════════════════════════════════════════════════════════════════════════════

After completing SECTION I, send back exactly this template, filling in
the brackets:

═════════════════════════════════════════════════════
  Hibi Matcha POS — Setup Report
═════════════════════════════════════════════════════
  Install         : [pass|fail — error if fail]
  DB push         : [pass|fail]
  Seed            : [pass|fail — branches/staff/items counts]
  TS check        : [pass|fail — error count]
  Dev server      : [pass|fail — URL serving on]
  Super admin login: [pass|fail]
  Staff login → POS: [pass|fail]
  POS checkout    : [pass|fail — order #]
  Menu images     : [pass|fail — ratio loaded]
  Distribute Center: [pass|fail]

  Optional (only if attempted):
  Apps Script sync : [skipped|pass|fail]
  Delivery webhook : [skipped|pass|fail]

  Issues found    : [none | bulleted list]
  Time elapsed    : [mm:ss]

  Login credentials (already seeded):
    Super  Admin : HMC-0001  / super2026  / PIN 1234
    Staff  Admin : HMC-ADMIN / admin2026  / PIN 1234
    Staff (POS)  : HMC-STAFF / staff2026  / PIN 1234

  Notes / next steps for the human:
    [free text]
═════════════════════════════════════════════════════

End of prompt.
```

---

## Notes (for the human, not Manus)

The prompt above is ~1,200 tokens — sufficient to give Manus full context
without padding. It assumes Manus can:

- Read files via filesystem
- Run shell commands
- Use a browser tool (Playwright/Puppeteer/MCP)
- Read its own command output

If Manus complains about missing tools, simplify:
- Skip Section E (browser tests) and have Manus verify by hitting the
  tRPC endpoints with `curl` instead.
- Or have a human do the browser smoke tests manually after Manus
  finishes B–C.

### Default credentials (already in DB after seed)

| Role | Code | Password | PIN |
|---|---|---|---|
| Super Admin | `HMC-0001` | `super2026` | `1234` |
| Staff Admin | `HMC-ADMIN` | `admin2026` | `1234` |
| Staff (POS) | `HMC-STAFF` | `staff2026` | `1234` |

### Estimated total time

- Install: 3-5 min
- DB push + seed: 2-3 min
- Type check: 30 sec
- Smoke tests: 5 min
- Total: **~10-15 min** end to end on a normal connection
