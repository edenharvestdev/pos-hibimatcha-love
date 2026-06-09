# Hibi Matcha POS — Handoff Document

> This document is for the AI/operator (e.g. Manus AI) who will deploy and verify
> this project. Everything in the codebase is wired and ready — only setup commands
> remain.

---

## 1. What's Already Done ✅

### Stack
- **Frontend:** React 19 + Vite 6 + tRPC v11 client + React Query v5
- **Backend:** Express 4 + tRPC v11 (superjson transformer)
- **ORM:** Drizzle v0.44 (MySQL dialect, targeting TiDB Cloud)
- **Auth:** Custom JWT (jose) with employee code + password + PIN — 7-day expiry
- **Routing:** Hash routing (custom `useHashRoute` hook)
- **State:** React Context (`AppCtx`) + tRPC cache

### Database
- 32 tables defined in `drizzle/schema.ts` (branches, staff, menu, options,
  orders, payments, inventory, SOP, audit log, etc.)
- `.env` contains TiDB Cloud credentials (gitignored)
- Seed script imports real catalogue/branches/staff from `hibi-seed-package/seed-data/*.json`

### Features wired end-to-end (no mock data)
| Page | Status |
| --- | --- |
| **Auth** | Login (employee code + password), PIN quick login, branch switch, **first-run Bootstrap** at `/setup`, role-based redirect |
| **POS terminal** | Real menu from `trpc.menu.list`, dynamic option groups (single/multi/quantity), cart → payment → receipt |
| **Kitchen** | Live ticket polling (`trpc.kitchen.listTickets`), state transitions |
| **Orders** | Pagination, search, status filter, drawer detail |
| **Backoffice / Admin** | Dashboard (`reports.getDashboardStats`), Menu, Categories, Options CRUD, Discounts, Payments, Staff, Reports (revenue trend + top items), Audit Log |
| **Inventory** | Overview, Items, Receiving, Stock Count, Movements, Transfers (history-only) |
| **Suppliers / PO** | Directory, PO list + drawer, approve/submit flow |
| **Franchise** | Branch list, 7-step new-branch wizard, branch detail |
| **SOP** | Library, Detail with acknowledgment, **Editor** (create + edit + publish), Approval Queue, Compliance dashboard, My Variants, My Tasks |
| **Settings** | Profile (real data + self-edit), Security (change password, change PIN) |

### Role-based access (enforced server + client)

| Role | Backend procedure | Client landing | Allowed routes |
| --- | --- | --- | --- |
| `super_admin` | `superAdminProcedure` (every endpoint OK) | `/backoffice` | Everything |
| `staff_admin` | `staffAdminProcedure` (most) | `/backoffice` | Backoffice **except** `/franchise/*`, `/sop/approval-queue`, `/audit-log` |
| `staff` | `staffProcedure` (basic) | `/pos/terminal` directly | `/pos/*`, `/kitchen`, `/orders`, `/sop/*` (read + my-tasks), `/settings` |

The `App.jsx` route guard auto-redirects unauthorized navigation. Sidebar items
also filter by role.

---

## 2. Setup Commands (run these in order)

```bash
cd /Users/paul/Downloads/pos-hibimatcha-love

# 1) Install dependencies
pnpm install

# 2) IMPORTANT — Choose your TiDB database
#    The current .env points DATABASE_URL to /sys (MySQL system schema, NOT recommended).
#    Either:
#      a) Create a new database in TiDB Cloud Console:  CREATE DATABASE hibi_matcha;
#         then edit .env and change `/sys?` → `/hibi_matcha?`
#      b) Or keep /sys if that's the intended target.

# 3) Push schema to TiDB (creates 32 tables)
npm run db:push

# 4) Load seed data (branches, staff, tea catalogue, inventory, payment methods)
npm run seed

# 5) Start the dev server (frontend + backend on the same port)
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

If the database is empty, the login page auto-redirects to **`/setup`** for
creating the first super admin. If you ran `npm run seed`, you can skip the
bootstrap page — log in directly with the credentials below.

---

## 3. Default Credentials (after `npm run seed`)

```
┌──────────────────────────────────────────────────────────────┐
│ UNIVERSAL PIN for ALL accounts:  1234                        │
├──────────────────────────────────────────────────────────────┤
│ SUPER ADMIN (full access — Backoffice + POS + Franchise)     │
│   Employee code: HMC-0001                                    │
│   Password:      super2026                                   │
│   PIN:           1234                                        │
├──────────────────────────────────────────────────────────────┤
│ STAFF ADMIN (mid-level — Backoffice without Franchise/Audit) │
│   Employee code: HMC-ADMIN                                   │
│   Password:      admin2026                                   │
│   PIN:           1234                                        │
├──────────────────────────────────────────────────────────────┤
│ STAFF (front-of-house — POS only, auto-redirect)             │
│   Employee code: HMC-STAFF                                   │
│   Password:      staff2026                                   │
│   PIN:           1234                                        │
└──────────────────────────────────────────────────────────────┘
```

Imported staff from `staff.json` (20 people) follow the same per-role
defaults — use their `employeeCode` (HBHQ-XX, HB01-XX, HBCN-XX, etc.) +
the password/PIN matching their role.

> ⚠ Change all of these in production. Settings → Security can update password
> and PIN for the logged-in user.

---

## 4. Environment Variables

`.env` (gitignored — see `.env.example` for the template):

```
DATABASE_URL="mysql://...tidbcloud.com:4000/sys?ssl={...}"
JWT_SECRET="hibi-matcha-jwt-secret-..."   # change in production
NODE_ENV="development"
```

The TiDB credentials are already filled in. SSL is enabled via the URL query
string (TiDB Cloud requires TLS).

---

## 5. Project Layout

```
hibi-seed-package/seed-data/   ← Source-of-truth JSON: branches, staff, catalogue
drizzle/schema.ts              ← 32 tables, all enums and relations
drizzle/                       ← Generated migrations land here on `db:push`
server/
  _core/                       ← Framework plumbing (trpc init, env, context)
  lib/auth.ts                  ← Password/PIN hashing (scryptSync), JWT signing
  routers.ts                   ← appRouter — combines all feature routers
  routers/                     ← One file per domain (auth, menu, orders, …)
  seed/index.ts                ← Idempotent seed (`npm run seed`)
client/src/
  App.jsx                      ← Router + route guard + AppCtx provider
  lib/trpc.ts                  ← tRPC client setup (Bearer auth header)
  lib/authStore.ts             ← Session in memory + localStorage
  components/Shell.jsx         ← Sidebar / Topbar / Logout
  pages/
    Auth.jsx                   ← PageLogin, PageBootstrap, PageBranchSelect
    POS.jsx                    ← Terminal, OptionSheet, Payment, Receipt, Kitchen, Orders
    Admin.jsx                  ← Backoffice CRUD pages
    Inventory.jsx, Suppliers…  ← Same pattern
    SOP.jsx, Settings.jsx
```

---

## 6. Smoke Test Script (do these once the server starts)

1. **Bootstrap path (DB empty):** browser → `/login` should auto-redirect to
   `/setup`. Create a super admin. Login should work.
2. **Seed path (DB seeded):** browser → `/login` → enter `HMC-0001 / super2026`
   → lands on `/backoffice` (Backoffice Landing).
3. **Role gating:** log out, log in as `HMC-STAFF / staff2026` → must auto-land
   on `/pos/terminal`, sidebar/backoffice routes should be blocked.
4. **POS flow:** add menu item → option sheet opens with real options →
   add to cart → checkout → payment → receipt. The order should appear in
   `/orders` and `/pos/kitchen`.
5. **Admin CRUD:** Backoffice → Menu → create item, Categories → create,
   Options → create group + options.
6. **Security:** Settings → Security → change password → log out → log in
   with new password.

---

## 6.5 Google Sheets Cash Sync — Setup

Every confirmed payment automatically appends a row to the **"cash"** tab of
this sheet:

`https://docs.google.com/spreadsheets/d/1D5uavkMFPDfZeoQ4thUMvSVM46QdydORvmIGFmF3uEQ/edit`

### One-time setup (5 minutes)

1. Open the sheet above.
2. Create a tab named exactly **`cash`** (if it doesn't exist).
3. Top menu → **Extensions → Apps Script**.
4. Replace the default `Code.gs` with:

   ```javascript
   function doPost(e) {
     try {
       const payload = JSON.parse(e.postData.contents);
       const sheetName = payload.sheet || "cash";
       const ss = SpreadsheetApp.getActive();
       let sheet = ss.getSheetByName(sheetName);
       if (!sheet) sheet = ss.insertSheet(sheetName);

       const row = payload.row || {};
       const headers = [
         "timestamp", "date", "time", "orderNumber",
         "branchName", "branchCode",
         "paymentMethod", "paymentType",
         "amount", "subtotal", "tax", "discount", "total",
         "cashier", "customer", "tableNumber",
         "itemsSummary", "reference"
       ];

       // Add header row if sheet is empty
       if (sheet.getLastRow() === 0) {
         sheet.appendRow(headers);
         sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight("bold")
           .setBackground("#15803d")
           .setFontColor("#ffffff");
         sheet.setFrozenRows(1);
       }

       sheet.appendRow(headers.map((h) => row[h] ?? ""));
       return ContentService.createTextOutput(JSON.stringify({ ok: true }))
         .setMimeType(ContentService.MimeType.JSON);
     } catch (err) {
       return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
         .setMimeType(ContentService.MimeType.JSON);
     }
   }

   function doGet() {
     return ContentService.createTextOutput("Hibi Matcha cash sync endpoint is live.");
   }
   ```

5. Save (Ctrl/Cmd+S), give the project a name like "Hibi Matcha Sync".
6. Click **Deploy → New deployment**.
   - **Type:** Web app
   - **Execute as:** Me (the sheet owner)
   - **Who has access:** Anyone
7. Click Deploy → Authorize → Allow.
8. Copy the resulting **Web app URL** — looks like
   `https://script.google.com/macros/s/AKfy.../exec`.
9. Paste that URL into `.env`:

   ```
   GOOGLE_SHEET_WEBAPP_URL="https://script.google.com/macros/s/AKfy.../exec"
   ```

10. Restart `npm run dev`. Take a test order, pay it — a new row appears in the
    sheet within 1-2 seconds.

### What gets logged

Every payment writes one row with: timestamp, date, time, order number,
branch name/code, payment method (Cash / PromptPay / EDC Credit / etc.),
payment type, amount, subtotal, tax, discount, total, cashier name, customer
name, table number, items summary, and reference (EDC approval, QR ref, slip).

The sync is **fire-and-forget** — if the sheet is unreachable, the order
still completes and the payment is still recorded in the local database.

---

## 7. Known Limitations / TODO After Handoff

1. **Stock transfer create flow** — backend `inventory.transferStock` procedure
   doesn't exist yet. The Transfers page shows movement history only. UI for
   creating a new transfer request is disabled (button greyed out).
2. **Notifications / 2FA / hardware setup** in Settings are decorative.
3. **MultiAreaChart** on dashboard still uses a placeholder dataset (the
   numeric stat cards above are live).
4. **Bootstrap flow auto-redirect** uses the `posAuth.needsBootstrap` query,
   which runs against the real DB — if the DB is unreachable, the setup
   page shows a "Database not ready" panel with instructions.

---

## 8. Useful Commands

```bash
pnpm install              # install deps
npm run dev               # dev server (Vite + Express on same port)
npm run db:push           # drizzle-kit generate + migrate
npm run seed              # idempotent — safe to re-run
npm run check             # tsc --noEmit type check
npm run build             # production build
npm run start             # serve built bundle
npm run test              # vitest
npm run format            # prettier
```

---

## 9. Architecture Notes (for the next maintainer)

- **tRPC mounting:** `server/_core/index.ts` mounts the tRPC handler at
  `/api/trpc` and serves the Vite bundle from the same Express app. Bearer
  token is read from `Authorization` header (set by tRPC client from
  `localStorage` via `authStore.ts`).
- **Hash routing:** routes look like `#/backoffice/menu?id=12`. Query string
  must be stripped before route matching — see `Router` in `App.jsx`.
- **Idempotent seed:** every `INSERT` checks for existence first, so
  `npm run seed` can be re-run after a partial failure.
- **Empty-database UX:** every list page has a proper empty state, every
  detail page handles `undefined` data while loading, no hardcoded counts.
- **Audit log:** every mutation in admin routers calls `logAudit({ staff,
  action, entity, entityId })` — visible at `/backoffice/audit-log`
  (super_admin only).

That's the whole system. Run the 5 commands in section 2 and the app should
boot. If anything fails, the most common causes are:

1. TiDB connection — make sure SSL is on and the database name in the URL exists.
2. `JWT_SECRET` empty — login mutations will silently fail without it.
3. Missing seed data — the JSON files in `hibi-seed-package/seed-data/`
   must be present, the script reads them at boot.
