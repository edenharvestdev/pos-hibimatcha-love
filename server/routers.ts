import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Feature routers
import { authRouter } from "./routers/auth";
import { branchesRouter } from "./routers/branches";
import { staffRouter } from "./routers/staff";
import { categoriesRouter } from "./routers/categories";
import { menuRouter } from "./routers/menu";
import { optionsRouter } from "./routers/options";
import { discountsRouter } from "./routers/discounts";
import { paymentsRouter } from "./routers/payments";
import { ordersRouter } from "./routers/orders";
import { kitchenRouter } from "./routers/kitchen";
import { inventoryRouter } from "./routers/inventory";
import { suppliersRouter } from "./routers/suppliers";
import { purchaseOrdersRouter } from "./routers/purchaseOrders";
import { sopRouter } from "./routers/sop";
import { franchiseRouter } from "./routers/franchise";
import { reportsRouter } from "./routers/reports";
import { auditLogRouter } from "./routers/auditLog";
import { notificationsRouter } from "./routers/notificationsRouter";
import { deliveryRouter } from "./routers/delivery";
import { branchSettingsRouter } from "./routers/branchSettings";
import { inventoryAttributesRouter } from "./routers/inventoryAttributes";
import { printingRouter } from "./routers/printing";
import { requisitionsRouter } from "./routers/requisitions";
import { exportDocumentsRouter } from "./routers/exportDocuments";
import { expenseReceiptsRouter } from "./routers/expenseReceipts";
import { inventoryLotsRouter } from "./routers/inventoryLots";
import { membersRouter } from "./routers/members";
import { customerOrdersRouter } from "./routers/customerOrders";
import { supplierPaymentsRouter } from "./routers/supplierPayments";
export const appRouter = router({
  system: systemRouter,

  // Legacy Manus auth (kept for backward compat)
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // POS / Backoffice feature routers
  posAuth: authRouter,
  branches: branchesRouter,
  staff: staffRouter,
  categories: categoriesRouter,
  menu: menuRouter,
  options: optionsRouter,
  discounts: discountsRouter,
  payments: paymentsRouter,
  orders: ordersRouter,
  kitchen: kitchenRouter,
  inventory: inventoryRouter,
  suppliers: suppliersRouter,
  purchaseOrders: purchaseOrdersRouter,
  sop: sopRouter,
  franchise: franchiseRouter,
  reports: reportsRouter,
  auditLog: auditLogRouter,
  notifications: notificationsRouter,
  delivery: deliveryRouter,
  branchSettings: branchSettingsRouter,
  inventoryAttributes: inventoryAttributesRouter,
  printing: printingRouter,
  requisitions: requisitionsRouter,
  exportDocuments: exportDocumentsRouter,
  expenseReceipts: expenseReceiptsRouter,
  inventoryLots: inventoryLotsRouter,
  members: membersRouter,
  customerOrders: customerOrdersRouter,
  supplierPayments: supplierPaymentsRouter,
});

export type AppRouter = typeof appRouter;
