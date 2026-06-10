import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posKitchenTickets, posOrders, posOrderItems } from "../../drizzle/schema";
import { router, staffProcedure } from "../_core/trpc";
import { broadcastToBranch, RealtimeEvents } from "../lib/realtime";

export const kitchenRouter = router({
  listTickets: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      station: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get active orders for this branch
      const orders = await db.select().from(posOrders)
        .where(and(
          eq(posOrders.branchId, input.branchId),
          // Status is one of the active statuses
        ));

      const activeOrderIds = orders
        .filter((o) => ["pending", "preparing", "ready"].includes(o.status ?? ""))
        .map((o) => o.id);

      if (activeOrderIds.length === 0) return [];

      let tickets = await db.select().from(posKitchenTickets);
      tickets = tickets.filter((t) => activeOrderIds.includes(t.orderId));

      if (input.station) tickets = tickets.filter((t) => t.station === input.station || t.station === "all");
      if (input.status) tickets = tickets.filter((t) => t.status === input.status);

      // Attach order info to each ticket
      const ordersMap = new Map(orders.map((o) => [o.id, o]));
      const ticketsWithOrders = await Promise.all(tickets.map(async (ticket) => {
        const order = ordersMap.get(ticket.orderId);
        const items = await db.select().from(posOrderItems)
          .where(eq(posOrderItems.orderId, ticket.orderId));
        return { ...ticket, order, items };
      }));

      return ticketsWithOrders.sort((a, b) => {
        // Urgent first, then by creation time
        if (a.priority === "urgent" && b.priority !== "urgent") return -1;
        if (b.priority === "urgent" && a.priority !== "urgent") return 1;
        return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
      });
    }),

  getTicketById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [ticket] = await db.select().from(posKitchenTickets)
        .where(eq(posKitchenTickets.id, input.id)).limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      const [order] = await db.select().from(posOrders)
        .where(eq(posOrders.id, ticket.orderId)).limit(1);
      const items = await db.select().from(posOrderItems)
        .where(eq(posOrderItems.orderId, ticket.orderId));
      return { ...ticket, order, items };
    }),

  markPreparing: staffProcedure
    .input(z.object({ ticketId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posKitchenTickets)
        .set({ status: "preparing", startedAt: new Date() })
        .where(eq(posKitchenTickets.id, input.ticketId));

      const [ticket] = await db.select().from(posKitchenTickets)
        .where(eq(posKitchenTickets.id, input.ticketId)).limit(1);

      // Update order status too
      if (ticket?.orderId) {
        await db.update(posOrders).set({ status: "preparing", preparingAt: new Date() })
          .where(eq(posOrders.id, ticket.orderId));

        const [ord] = await db.select().from(posOrders).where(eq(posOrders.id, ticket.orderId)).limit(1);
        if (ord && ord.branchId) {
          await broadcastToBranch(ord.branchId, RealtimeEvents.ORDER_UPDATED, {
            id: ord.id,
            orderNumber: ord.orderNumber,
            status: "preparing",
          });
        }
      }
      return ticket;
    }),

  markReady: staffProcedure
    .input(z.object({ ticketId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posKitchenTickets)
        .set({ status: "ready", completedAt: new Date() })
        .where(eq(posKitchenTickets.id, input.ticketId));

      const [ticket] = await db.select().from(posKitchenTickets)
        .where(eq(posKitchenTickets.id, input.ticketId)).limit(1);

      if (ticket?.orderId) {
        await db.update(posOrders).set({ status: "ready", readyAt: new Date() })
          .where(eq(posOrders.id, ticket.orderId));
        await db.update(posOrderItems).set({ kitchenStatus: "ready" })
          .where(eq(posOrderItems.orderId, ticket.orderId));

        const [ord] = await db.select().from(posOrders).where(eq(posOrders.id, ticket.orderId)).limit(1);
        if (ord && ord.branchId) {
          await broadcastToBranch(ord.branchId, RealtimeEvents.ORDER_UPDATED, {
            id: ord.id,
            orderNumber: ord.orderNumber,
            status: "ready",
          });
        }
      }
      return ticket;
    }),

  markServed: staffProcedure
    .input(z.object({ ticketId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posKitchenTickets)
        .set({ status: "served" })
        .where(eq(posKitchenTickets.id, input.ticketId));

      const [ticket] = await db.select().from(posKitchenTickets)
        .where(eq(posKitchenTickets.id, input.ticketId)).limit(1);

      if (ticket?.orderId) {
        await db.update(posOrders).set({ status: "served", servedAt: new Date() })
          .where(eq(posOrders.id, ticket.orderId));

        const [ord] = await db.select().from(posOrders).where(eq(posOrders.id, ticket.orderId)).limit(1);
        if (ord && ord.branchId) {
          await broadcastToBranch(ord.branchId, RealtimeEvents.ORDER_UPDATED, {
            id: ord.id,
            orderNumber: ord.orderNumber,
            status: "served",
          });
        }
      }
      return ticket;
    }),
});
