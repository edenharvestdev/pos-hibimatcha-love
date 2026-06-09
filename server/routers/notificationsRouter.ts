import { TRPCError } from "@trpc/server";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { router, staffProcedure } from "../_core/trpc";

export const notificationsRouter = router({
  list: staffProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(notifications)
        .where(eq(notifications.staffId, ctx.staff.staffId));
      rows = rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      if (input?.unreadOnly) rows = rows.filter((n) => !n.isRead);
      return rows.slice(0, 50);
    }),

  markRead: staffProcedure
    .input(z.object({ ids: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.ids.length === 0) return { success: true };
      for (const id of input.ids) {
        await db.update(notifications).set({ isRead: true, readAt: new Date() })
          .where(and(eq(notifications.id, id), eq(notifications.staffId, ctx.staff.staffId)));
      }
      return { success: true };
    }),

  markAllRead: staffProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.staffId, ctx.staff.staffId), eq(notifications.isRead, false)));
    return { success: true };
  }),
});
