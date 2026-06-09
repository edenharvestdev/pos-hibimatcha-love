// server/middleware/auth.ts
// Express middleware for RBAC (Role Based Access Control) for staff users.
// This is complementary to the tRPC middlewares defined in server/_core/trpc.ts.
// It can be used for any plain Express routes that need staff authentication
// and role checks (admin / super_admin).

import type { Request, Response, NextFunction } from "express";
import { extractBearerToken, verifyStaffToken, type StaffTokenPayload } from "../lib/auth";

/**
 * Verify the JWT staff token from the Authorization header and attach the payload
 * to `req.staff`.
 */
export async function staffAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization ?? "");
  if (!token) {
    return res.status(401).json({ message: "Missing Authorization token" });
  }
  try {
    const payload: StaffTokenPayload = await verifyStaffToken(token);
    // Attach to request for downstream handlers
    (req as any).staff = payload;
    next();
  } catch (err) {
    console.error("Staff token verification failed", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Ensure the authenticated staff has at least `staff_admin` role.
 * Must be placed after `staffAuth`.
 */
export function requireStaffAdmin(req: Request, res: Response, next: NextFunction) {
  const staff = (req as any).staff as StaffTokenPayload | undefined;
  if (!staff) {
    return res.status(401).json({ message: "Staff authentication required" });
  }
  if (staff.role !== "staff_admin" && staff.role !== "super_admin") {
    return res.status(403).json({ message: "Staff admin access required" });
  }
  next();
}

/**
 * Ensure the authenticated staff has `super_admin` role.
 * Must be placed after `staffAuth`.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const staff = (req as any).staff as StaffTokenPayload | undefined;
  if (!staff) {
    return res.status(401).json({ message: "Staff authentication required" });
  }
  if (staff.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}
