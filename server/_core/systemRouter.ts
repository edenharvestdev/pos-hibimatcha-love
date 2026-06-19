import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getDb } from "../db";
import { branches } from "../../drizzle/schema";
import { getEnvStatus } from "../lib/env";

export const systemRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  readiness: publicProcedure.query(async () => {
    const env = getEnvStatus();
    let database = false;
    try {
      const db = await getDb();
      if (db) {
        await db.select().from(branches).limit(1);
        database = true;
      }
    } catch {
      database = false;
    }
    return {
      ok: database && env.jwt,
      checks: { database, jwt: env.jwt, s3: env.s3, pusher: env.pusher, twilio: env.twilio },
      env: env.nodeEnv,
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
