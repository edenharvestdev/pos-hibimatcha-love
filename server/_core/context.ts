import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { extractBearerToken, verifyStaffToken, type StaffTokenPayload } from "../lib/auth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;         // Manus OAuth user (legacy)
  staff: StaffTokenPayload | null; // POS/Backoffice staff
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let staff: StaffTokenPayload | null = null;

  // Try Manus OAuth auth (legacy, kept for backward compat)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Try POS staff JWT auth from Authorization header
  const token = extractBearerToken(opts.req.headers.authorization);
  if (token) {
    try {
      staff = await verifyStaffToken(token);
    } catch {
      staff = null;
    }
  }

  return { req: opts.req, res: opts.res, user, staff };
}
