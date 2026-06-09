import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { router, staffAdminProcedure } from "../_core/trpc";

export const auditLogRouter = router({
  list: staffAdminProcedure
    .input(z.object({
      entityType: z.string().optional(),
      entityId: z.number().int().optional(),
      actorId: z.number().int().optional(),
      action: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().int().optional(),
      limit: z.number().int().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      let rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

      if (input?.entityType) rows = rows.filter((l) => l.entity === input.entityType);
      if (input?.entityId) rows = rows.filter((l) => l.entityId === input.entityId);
      if (input?.actorId) rows = rows.filter((l) => l.actorId === input.actorId);
      if (input?.action) rows = rows.filter((l) => l.action === input.action);
      if (input?.dateFrom) rows = rows.filter((l) => l.createdAt && l.createdAt >= new Date(input.dateFrom!));
      if (input?.dateTo) rows = rows.filter((l) => l.createdAt && l.createdAt <= new Date(input.dateTo!));

      const total = rows.length;
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const paged = rows.slice((page - 1) * limit, page * limit);

      return { logs: paged, total };
    }),

  getById: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(auditLogs).where(eq(auditLogs.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});
