# Project TODO — pos-Hibimatcha.love

- [x] Migrate Drizzle schema (32 tables) into drizzle/schema.ts
- [x] Apply database migrations via drizzle-kit
- [x] Migrate tRPC POS router procedures into server/routers/ (19 routers)
- [x] Migrate POS frontend pages (POSLogin, POSTerminal, KitchenDisplay)
- [x] Migrate Admin pages (Backoffice with full sidebar navigation)
- [x] Migrate POSBranchContext and AuthContext
- [x] Create UI components matching POS design (custom component library)
- [x] Apply green matcha theme
- [x] Seed data (6 branches, 21 staff, 136 menu items, 38 option groups, 16 payment methods, 395 stock records)
- [x] TypeScript 0 errors
- [x] All tRPC endpoints respond correctly (tested: posAuth, categories, menu, branches, payments)
- [x] POS Login page renders correctly (both System Login and PIN tabs)
- [x] POS Terminal renders with cart, menu grid, and order flow
- [x] Fix components/index.jsx missing icon imports
- [x] Fix Shell.jsx TDZ error (const I = I[...] → const Ic = I[...])
- [x] Fix components/index.jsx missing IconX import
- [x] Upload 98 menu photos to S3 via manus-upload-file --webdev
- [x] Replace photo paths in DB/seed from local to S3 URLs
- [x] Fix IconShare not defined error in Admin.jsx (add to import)
- [x] Backend: Add POST /api/upload endpoint with multer, auth, S3 storage
- [x] Frontend: Create ImageUploader.jsx component (drag-drop, file picker, URL paste)
- [x] Integrate ImageUploader into Admin.jsx menu edit form (replace imageUrl text field)
- [x] Test upload flow end-to-end
- [x] Sunmi V3: Add global CSS breakpoint for small portrait screens (max-width: 480px)
- [x] Sunmi V3: Optimize Login page for 360px width (hide hero, compact PIN pad)
- [x] Sunmi V3: Optimize POS Terminal for portrait mode (stack layout, compact cards)
- [x] Sunmi V3: Optimize POS Shell header for narrow screen
- [x] Sunmi V3: Optimize Backoffice sidebar and pages for small screen
- [x] Fix ImageUploader auth: parse JSON from localStorage to extract .token (was sending raw JSON string as Bearer token)
- [x] Linked Menus Manager: Backend tRPC procedures (options.listLinkedMenus, options.setLinkedMenus)
- [x] Linked Menus Manager: Frontend LinkedMenusSection in Option Group detail
- [x] Linked Menus Manager: Frontend LinkedMenusModal with search, category grouping, select all/none
- [x] Linked Menus Manager: Test end-to-end (link/unlink menus, persist on reload)
- [x] Print P0: DB schema - add print tracking fields to pos_orders + create pos_printer_configs + pos_branch_payment_settings tables
- [x] Print P0: Install promptpay-qr + qrcode, create server/lib/printPayloads.ts (order slip, labels, kitchen ticket, receipt generators)
- [x] Print P0: tRPC orders.confirmOrder (status draft→pending, generate QR, return print payloads)
- [x] Print P0: tRPC orders.generatePaymentQr (PromptPay QR with amount)
- [x] Print P0: tRPC orders.markPaid (update status, trigger receipt)
- [x] Print P0: tRPC orders.getPrintPayload + orders.listPending
- [x] Print P0: tRPC branchSettings router (getPaymentSettings, upsertPaymentSettings, listPrinters, upsertPrinter, deletePrinter)
- [x] Print P0: Frontend PrintPreview component (thermal receipt HTML + window.print)
- [x] Print P0: Frontend confirm order flow in POS terminal (auto-print 3 docs)
- [x] Print P1: Frontend Pending Payment queue page + Mark Paid
- [x] Print P1: Frontend Backoffice Settings - Printers + PromptPay + Receipt tabs
- [x] Print P1: Sticker labels generation (in printPayloads.ts)
- [x] Print P1: Kitchen ticket generation (in printPayloads.ts)
- [x] Fix: Replace inventory category tabs with searchable dropdown (overflow fix)
- [x] Fix: Category dropdown z-index issue - popup was behind table, now z-index:9999 + wrapper z-index:200
- [x] Fix branch selector in Sidebar: replace hardcoded BRANCHES mock with API query (trpc.branches.listPublic)
- [x] Fix App.jsx initial branch state: remove BRANCHES[0] dependency, auto-sync with API data
- [x] Fix mock branch references in Admin.jsx (filter uses API), Shell.jsx notifications (Ladprao 107)
- [x] Update province to กรุงเทพมหานคร for all branches in DB
- [x] Delete test branch (Hibi Matcha Test, id=30001) from DB - no dependencies
- [x] Staff Detail Drawer: click card → open drawer with profile info, role, branches, PIN, lastLogin
- [x] Staff Edit Form: edit firstName, lastName, role, email, phone → trpc.staff.update
- [x] Staff Branch Assignment: manage branches section with multi-checkbox → trpc.staff.assignToBranches
- [x] Create Staff Form: add branch multi-select → call assignToBranches after create
- [x] Phase A: Data audit - all 138 menu items, 9 categories, 43 option groups, 395 inventory items are real Hibi data (NOT mock) - keep all
- [x] Phase B: Verify & fix Menu Create from UI (tested: Add Item form → fill fields → save → record created)
- [x] Phase C: Verify & fix Distribute to branches (select items → DistributeDrawer → 5 branches → confirm → saved to pos_branch_menu_items)
- [x] Phase D: Verify Staff CRUD (edit, branches, create) — all working, branch assignment saves to DB
- [x] Phase E: Build Bulk Invite feature — BulkInviteModal with paste-from-spreadsheet, branch picker per row, end-to-end tested (creates staff in DB with correct employeeCode)
- [x] Vitest: staff.list, staff.create, staff.assignToBranches — 6 tests passing (auth, RBAC, CRUD)

## Master Plan — Final Sprint

- [x] Phase 0: Schema Check (inventory = hybrid Global items + Per-branch stock)
- [x] Phase 1: Verify & Fix Distribute UI end-to-end — working (branch selection + submit confirmed)
- [x] Phase 2: Verify & Fix Menu Create UI end-to-end — working (create item saves to DB)
- [x] Phase 3: Verify & Fix Staff CRUD Save — working (edit lastName saves, branch assignment persists)
- [x] Phase 4: Image Upload — code review confirms NO bug (error is legitimate JWT expiry after 7d, auth flow correct)
- [x] Phase 5: Linked Menus Manager — verified: backend (listLinkedMenus, setLinkedMenus) + frontend (LinkedMenusSection, LinkedMenusModal) all correct
- [x] Phase 6A: Dev Role Switcher now hidden for non-super_admin (added guard in Shell.jsx)
- [x] Phase 6B: Sidebar Menu filter by role — already working (NAV sections + items have role tags)
- [x] Phase 6C: Route Guards — already working (App.jsx isPathAllowedForRole + redirect)
- [x] Phase 7: Bulk Invite — verified: BulkInviteModal + staff.create mutation + branch assignment all correct
- [x] Final: All 10 tests pass, role-based access enforced, system ready for Manager

## Verification Gaps (address before checkpoint)

- [x] SQL verify: distribute submit writes to pos_branch_menu_items (306 rows confirmed)
- [x] SQL verify: setLinkedMenus persists (562 links in pos_menu_item_option_groups confirmed)
- [x] Restrict Dev Role Switcher to employeeCode HMC-0001 specifically (Shell.jsx updated)

## Phase 9: Dynamic Inventory Attributes

- [x] Schema: Create pos_inventory_attributes table
- [x] Schema: Create pos_inventory_attribute_options table
- [x] Schema: Add attributes JSON column to pos_inventory_items
- [x] Seed: Default attributes for Matcha/Hojicha/Genmaicha/Tea/Milk/Packaging/Equipment (23 categories seeded)
- [x] Backend: inventoryAttributes tRPC router (listByCategory, addOption, updateOption)
- [x] Frontend: DynamicAttributeField component (dropdown/text/number)
- [x] Frontend: AddOptionModal component
- [x] Frontend: Integrate dynamic fields into Inventory item edit drawer (Attributes tab)
- [x] Vitest: inventoryAttributes router tests (3 tests passing)
- [x] All 15 tests passing (6 files)

## Phase 9 Gaps (fix before checkpoint)

- [x] Auto-select newly added option after addOption succeeds
- [x] Reset/prune attributes when category changes in item drawer (handleCategoryChange)
- [x] DB script verify: 17 categories seeded, 42 attributes total, 132 options (confirmed via Drizzle query)

## Phase 10: Network Printer Integration

- [x] Backend: server/lib/printer.ts (TCP socket print via net module)
- [x] Backend: printing tRPC router (testPrint, openCashDrawer, printOrder, printKitchen, printLabels, printReceipt, autoPrintOnConfirm, autoPrintOnPaid)
- [x] Frontend: Replace hardcoded SettingsHardware with dynamic printer CRUD
- [x] Frontend: Add/Edit printer form (name, type, IP, port, paperWidth)
- [x] Frontend: Test Print button + status indicator
- [x] Auto-print: confirmOrder → networkPrintOnConfirm (order slip + kitchen + labels)
- [x] Auto-print: markPaid → networkPrintOnPaid (receipt + open cash drawer)
- [x] Vitest: printing router tests (6 tests — ESC/POS commands, socket mock)
- [x] Schema: Added autoPrintOrderSlip, autoPrintKitchenTicket, autoPrintLabels to pos_branch_payment_settings

## Bug Fix: WebUSB → Network Printer

- [x] Remove USB printReceipt + openCashDrawer imports from POS.jsx
- [x] Replace payment onSuccess: USB printReceipt → trpc.printing.autoPrintOnPaid (network TCP)
- [x] Replace receipt page Print button: USB → trpc.printing.autoPrintOnPaid
- [x] Replace receipt page Drawer button: USB openCashDrawer → trpc.printing.autoPrintOnPaid (openDrawer:true)
- [x] hardware.ts file kept (barcode scanner still used) but USB print functions no longer called

## Bug Fix: Print button → Popup with paper size selection

- [x] Remove network printer dependency from Print button (no Sunmi/TCP needed)
- [x] Print button opens modal: เลือกขนาดกระดาษ (80mm / 58mm / A4)
- [x] After selecting size → opens new window with formatted receipt HTML → window.print()
- [x] Works on any device/browser (Chrome, Safari, etc.) via system print dialog
- [x] Removed Drawer button (USB-only feature, not applicable)

## Franchise Branch Detail: Menu Tab
- [x] Implement BranchMenuTab component showing assigned menu items
- [x] Add listAssignedToBranch tRPC procedure (only items with pos_branch_menu_items row)
- [x] Super Admin can assign menu items via drawer (uses branches.distribute)
- [x] Super Admin can remove items (sets isAvailable=false)
- [x] Search filter for assigned items

## Branch Requisition System (สาขาขอสั่งจาก HQ)
- [x] Schema: pos_requisitions + pos_requisition_items tables
- [x] Backend: requisitions tRPC router (create, list, getById, approve, reject, cancel)
- [x] Auto-transfer stock on approve (deduct HQ, add to branch, create movements)
- [x] Auto-assign menu items on approve (insert pos_branch_menu_items)
- [x] Frontend: Branch Requisition page (/backoffice/requisitions) with list + create drawer
- [x] Frontend: Requisition detail drawer with approve/reject/cancel actions
- [x] Sidebar nav link under Inventory section
- [x] Notifications: notify HQ on new request, notify branch on approve/reject

## Purchase Orders — Full Implementation
- [x] Frontend: New PO form with supplier picker, item picker, qty/price, notes
- [x] Frontend: Export PO list to CSV
- [x] Frontend: PO detail view (items, totals, status actions — already existed)
- [x] Backend: purchaseOrders.create verified working (supplier, items, price calc, tax)

## Fix Non-Functional Areas
- [x] Supplier Detail: dynamic data from DB (trpc.suppliers.getById)
- [x] Supplier Detail: functional tabs (Overview editable, Orders from DB, Notes)
- [x] PO lifecycle UI: Submit, Approve, Reject, Mark Sent, Receive All, Close, Cancel buttons
- [x] Franchise Branch Detail: Staff tab (list staff by branchId)
- [x] Franchise Branch Detail: Inventory tab (list items by branchId)
- [x] Franchise Branch Detail: Contract tab (ownership, royalty, dates)

## Phase 11: Branch Switching, Staff PIN, Real-time, Invite Fixes
- [x] Global BranchContext: shared branch state across all pages (SOP, POS, Admin)
- [x] SOP branch selector: switching branch must re-query/filter SOP data for that branch
- [x] Fix SOP compliance backend to actually filter by branchId
- [x] POS branch selector: must work when navigating from SOP or any other page
- [x] Super Admin/Admin: must see and access ALL branches in selectors
- [x] Staff PIN/password visibility: admin can see PIN status + reset PIN for staff
- [x] Staff can view their own employee code in profile (via StaffDetailDrawer PinSection)
- [x] Staff creation: creator can see generated PIN/code after creation
- [x] Branch creation: invalidate branch queries after create so selectors update
- [x] Add accessCode column to branches schema + branch creation form
- [x] Branch login: users can select branch and enter branch PIN during login
- [x] Wire staff invite guidance into branch creation wizard step 6
- [x] Add query invalidation after mutations for real-time feel

## Phase 12: PWA Support for iPad
- [x] Create manifest.json with app name, icons, theme color, display: standalone
- [x] Create service worker for offline caching
- [x] Add iPad-specific meta tags (apple-mobile-web-app-capable, status-bar-style, splash screens)
- [x] Add PWA install prompt UI
- [x] Ensure viewport and touch handling works on iPad

## Phase 13: Export Documents (ใบเสร็จรับเงิน/ใบกำกับภาษี + ใบขนส่งสินค้า)
- [x] Backend: export tRPC router (list documents, get document, create/update draft)
- [x] PDF generation (client-side via browser print dialog, Sarabun font, A4 layout)
- [x] CSV export (client-side with BOM for Excel UTF-8 compatibility)
- [x] Frontend: Export Documents page with document type selector
- [x] Frontend: Editable form for ใบเสร็จรับเงิน/ใบกำกับภาษี (all fields from template)
- [x] Frontend: Editable form for ใบขนส่งสินค้า (all fields from template)
- [x] Frontend: Add/remove line items dynamically
- [x] Frontend: Auto-calculate totals (subtotal, VAT 7%, grand total)
- [x] Frontend: Export as PDF button (generates matching template layout)
- [x] Frontend: Export as CSV button (generates matching template layout)
- [x] Frontend: Quick-fill picker from orders (completed in Phase 20)
- [x] Frontend: Quick-fill picker from purchase orders (completed in Phase 20)
- [x] Sidebar: Add Documents/Export nav link
- [x] Vitest: export router tests (9 tests passing)

## Phase 14: Receipt Format Update (ปรับ format ใบเสร็จ POS ตามตัวอย่างจริง)
- [x] POS Receipt: Update header to "Hibi Matcha Café" + branch name (สาขาลาดพร้าว71)
- [x] POS Receipt: Update layout to match real receipt (หมายเลขการรับอาหาร, หมายเลขคำสั่งซื้อ, SN, เลขที่ใบเสร็จ)
- [x] POS Receipt: Show product code (HBM01M18L) + item name + options with price modifiers
- [x] POS Receipt: Update totals section (ยอดรวมส่วนลด, ปัดเศษ, ยอดรวม, ภาษีมูลค่าเพิ่ม 7%, ยอดรวมทั้งหมด)
- [x] POS Receipt: Show payment method section (ประเภทการชำระเงิน, เงินโอน, ยอดชำระ)
- [x] POS Receipt: Footer with branch name
- [x] Export Documents: Add "ใบเสร็จ POS" as third document type option
- [x] Export Documents: Editable POS receipt form matching the real format
- [x] Export Documents: PDF export for POS receipt format
- [x] Settings: Update default store name to "Hibi Matcha Café"
- [x] Settings: Document number format = YYYY + 12-digit running (2026000000000143)
- [x] printing.ts: buildOrderDataFromDb updated with SKU, payment info, receipt fields
- [x] All 43 tests passing

## Phase 15: Stock Cost Tracking + POS Branch Linking

### POS Branch Linking Fix
- [x] Investigate: understand how staff PIN login assigns branch to POS session
- [x] Fix: POS session must use staff's assigned branch (setBranch on PIN login in Auth.jsx)
- [x] Fix: POS orders must be linked to the correct branch ID (branchId from context)
- [x] Fix: Each POS screen shows only data for its linked branch (orders, stock, etc.)
- [x] Verify: branch linking logic tested in vitest (3 tests)

### Stock Cost Tracking
- [x] Backend: Add costPerUnit field to receiveStock mutation (per line item)
- [x] Backend: Calculate Weighted Average Cost on each stock receipt
- [x] Backend: Store averageCost in posBranchInventoryStock
- [x] Frontend: Add cost input field in Receiving page per line item
- [x] Frontend: Show stock value (qty × avg cost) in Inventory Overview
- [x] Frontend: Show cost breakdown by source (HQ vs external)

### POS → Inventory Link (auto-deduct stock on sale)
- [x] Backend: On order completion, deduct recipe ingredients from branch stock
- [x] Backend: Create inventory movement record (type: "sold") per ingredient
- [x] Frontend: Low-stock alerts in POS (completed in Phase 20)

## Phase 16: Clear Items + External Purchase Receipt System

### Clear All Items & Materials
- [x] Delete all inventory items from database (395 items)
- [x] Delete related data (movements, stock records, recipe ingredients)
- [x] Verify items page shows empty state (admin will add items manually)

### External Purchase Receipt System (บิล/ใบเสร็จจากร้านค้าภายนอก)
- [x] Database: Create posExpenseReceipts table (vendor, date, items, total, receipt image, category)
- [x] Backend: CRUD router for expense receipts (create, list, update, delete)
- [x] Backend: Filter by vendor (Makro, Shopee, etc.), date range, category
- [x] Backend: Summary/totals endpoint (monthly expenses by vendor)
- [x] Frontend: Expense Receipts page in Backoffice (list view with filters)
- [x] Frontend: Add/Edit receipt form (vendor, date, line items, total, attach receipt image)
- [x] Frontend: Vendor presets (Makro, Shopee, Lazada, LINE Shopping, Big C, Lotus's, 7-Eleven, Tops, อื่นๆ)
- [x] Frontend: Monthly expense summary view (by vendor + by category)
- [x] Sidebar: Add Expense Receipts nav link
- [x] Vitest: expense receipts router tests (11 tests passing, 70 total)

## Phase 17: Full CRUD + Real-time Updates for All Backoffice Pages

### Backend: Add missing delete mutations
- [x] categories.ts: add delete mutation
- [x] discounts.ts: add delete mutation
- [x] inventory.ts: add deleteItem and deleteCategory mutations
- [x] suppliers.ts: add delete mutation
- [x] purchaseOrders.ts: add delete mutation
- [x] payments.ts: add deleteMethod mutation
- [x] branches.ts: add delete mutation

### Frontend: Ensure all pages have working New/Edit/Delete buttons
- [x] Items & Materials: New Item + Delete works with real-time update (deleteItem mutation + confirm dialog)
- [x] Categories: New + Delete works with real-time update (delete mutation + refetch)
- [x] Options & Modifiers: New + Delete works (already had CRUD)
- [x] Discounts: New + Delete works with real-time update (delete mutation + refetch)
- [x] Payment Methods: New + Delete works with real-time update (deleteMethod mutation + refetch)
- [x] Suppliers: New + Delete works with real-time update (delete mutation + refetch)
- [x] Purchase Orders: New + Delete works with real-time update (delete mutation + refetch)
- [x] Expense Receipts: New + Delete works with real-time update (already had full CRUD)

### Real-time updates (optimistic + auto-refetch)
- [x] All pages: staleTime reduced from 30s/60s to 5s + refetchOnWindowFocus: true
- [x] All mutations: onSuccess -> refetch/invalidate for instant UI update
- [x] UI reflects changes immediately without page refresh
- [x] All 70 tests passing

## Phase 18: Branch Isolation Fix + SOP Auto-Calculation

### Branch Isolation (ข้อมูลแยกตามสาขา)
- [x] Backend: Ensure all queries filter by branchId (orders, inventory, staff, menu, etc.)
- [x] Frontend: When branch is switched, all pages must reload data for the new branch
- [x] Frontend: Branch selector in Backoffice must update global context and refetch all data
- [x] Login: PIN Login must allow selecting branch and link session correctly
- [x] Login: Admin/OAuth Login must allow selecting branch and persist choice
- [x] Verify: Each branch shows only its own data (empty for new branches, populated for existing)

### POS Auto-Deduct Stock with SOP Details
- [x] POS: When order is completed, show which ingredients were deducted (from SOP recipe)
- [x] SOP page: Show real-time ingredient usage status per menu item
- [x] SOP page: Show stock status of each ingredient (available/low/out)

### SOP Auto-Calculation System
- [x] SOP: Calculate cost per recipe (ต้นทุนวัตถุดิบตามสูตร)
- [x] SOP: Calculate quantity needed per X cups (ปริมาณที่ต้องใช้ตามจำนวนแก้ว)
- [x] SOP: Calculate total material cost for bills (คำนวณบิล/วัตถุดิบ)
- [x] SOP: Real-time stock check per ingredient with units

## Phase 19: Remove all menu items from POS display
- [x] Delete all menu items from the database so POS shows empty menu

## Phase 20: Quick-fill Pickers + Low-stock Alerts
- [x] Quick-fill picker from Orders in Export Documents page
- [x] Quick-fill picker from Purchase Orders (PO) in Export Documents page
- [x] Low-stock alerts banner in POS terminal (auto-refresh every 60s)

## Phase 21: Auth Security Fix (ระบบยืนยันตัวตนปลอดภัย)
- [x] Backend: Hash all passwords with bcrypt (no plain text in DB)
- [x] Backend: Hash all PINs with bcrypt
- [x] Backend: Create login procedure (admin) that verifies bcrypt hash and issues JWT
- [x] Backend: Create pinLogin procedure (staff) that verifies bcrypt hash and issues JWT
- [x] Backend: protectedProcedure middleware checks JWT token + role on every request
- [x] Backend: adminProcedure requires role=admin for Backoffice endpoints
- [x] Backend: Rate limit PIN login (block after 5 failed attempts in 1 minute)
- [x] Frontend: Store token, attach to every request, redirect to login on expiry/missing
- [x] Test: Wrong password → rejected
- [x] Test: No token → 401
- [x] Test: staff calling admin endpoint → 403
- [x] Test: DB passwords are hashed not plain text

## Phase 22: Transactional Stock Deduction (ตัดยอดวัตถุดิบแบบ atomic)
- [x] Wrap order completion + stock deduction in single DB transaction
- [x] Pre-check stock availability before closing order (reject if insufficient)
- [x] Idempotent: prevent double-deduction on repeated calls for same order
- [x] Every stock movement references the source order ID
- [x] Test: mid-flow failure → full rollback, no orphaned stock deductions
- [x] Test: close same order twice → stock deducted only once
- [x] Test: insufficient stock → order not closed, error lists which items are short

## Phase 23: Branch Selection Single Source of Truth + State Management + i18n

### Branch Selection — Single Source of Truth
- [x] Audit all locations where branch state is stored (Context, localStorage, JWT, etc.)
- [x] Consolidate to single store (Zustand or single Context) — all components read from here only
- [x] Login: selected branch writes to the single store + persists to localStorage
- [x] Tab bar / sidebar: renders branch name from the single store (not cached value)
- [x] Branch switch: updates store + invalidates all branch-dependent queries
- [x] Refresh: restores branch from persisted store (localStorage), not default
- [x] Backend: verifies branchId from JWT token, not trusting frontend-only values

### State Management — Proper Query Invalidation
- [x] After menu mutation (create/edit/delete) → invalidate menu queries
- [x] After order completion → invalidate inventory/stock queries
- [x] After stock adjustment → invalidate inventory queries
- [x] After branch switch → invalidate ALL queries (already partially done)
- [x] Remove unnecessary interval polling (kept only for Dashboard, Kitchen, Delivery, PendingOrders)
- [x] Add loading + error states to all pages that fetch data (Distribute, Requisitions added; others already had them)

### i18n (Internationalization)
- [x] Create lightweight i18n system (client/src/lib/i18n.js) with 295+ translation keys
- [x] Set up createT() helper with key-based lookup + inline fallback mode
- [x] Language persistence via localStorage (hibi_lang)
- [x] Extract hardcoded text from POS pages (Terminal, Cart, Payment, Receipt, Kitchen, Orders, Pending)
- [x] Extract hardcoded text from Backoffice pages (Dashboard, Landing)
- [x] Extract hardcoded text from Shell (Sidebar nav, POS tabs, Exit POS)
- [x] Add language switcher button (TH/EN toggle in both Backoffice topbar and POS header)
- [x] DB: name (English) + nameThai (Thai) already exist in schema — no migration needed
- [x] Frontend: displayName() helper shows item names based on selected language (POS cards/rows, Inventory table)
- [x] Complete i18n for Settings page (tabs, headers, sidebar labels)
- [x] Complete i18n for Admin page headers (Dashboard, Menu, Categories, Options, Discounts, Payments, Staff, Reports)
- [ ] Deep i18n for Admin/Inventory form labels, drawer content, error messages (deferred)

## Phase 24: Expense Receipts — UI Redesign + Full Features
- [x] Audit current ExpenseReceipts page code and DB schema
- [x] Backend: expense CRUD tRPC procedures (create, list, update, delete, summary, vendors) — already existed
- [x] Backend: receipt image upload support (S3 via ImageUploader component)
- [x] Frontend: Redesign page with card layout, stat summary cards (monthly total, count, avg, top vendor)
- [x] Frontend: Beautiful table with status pills, category badges, receipt thumbnails
- [x] Frontend: Create/Edit expense drawer (vendor, category, payment method, line items, receipt image upload)
- [x] Frontend: Monthly summary modal with category breakdown
- [x] Frontend: Filter by branch, category, date range, status
- [x] Mandatory receipt image attachment before confirming expense
- [x] Multi-branch oversight: owner/super_admin can view all branches' expenses

## Bug Fix: PageInvItems white screen (สต็อกทั้งหมด)
- [x] Fix: PageInvItems missing `lang` from useApp() — displayName(it, lang) had undefined lang causing potential render issues
