import bcrypt from "bcrypt";
import { createHash, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const BCRYPT_ROUNDS = 10;
const getSecret = () => new TextEncoder().encode(ENV.cookieSecret || "hibi-matcha-pos-secret-key-2026");

export type StaffTokenPayload = {
  staffId: number;
  role: "super_admin" | "staff_admin" | "staff";
  primaryBranchId: number | null;
  currentBranchId: number | null;
  employeeCode: string;
};

export async function signStaffToken(payload: StaffTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyStaffToken(token: string): Promise<StaffTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as StaffTokenPayload;
}

// ─── Password hashing with bcrypt ───────────────────────────────────────────
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    // Support legacy scrypt format (salt:hash) for migration period
    if (stored.includes(":") && !stored.startsWith("$2")) {
      return verifyLegacyScrypt(password, stored);
    }
    return bcrypt.compareSync(password, stored);
  } catch {
    return false;
  }
}

// ─── PIN hashing with bcrypt ────────────────────────────────────────────────
export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, BCRYPT_ROUNDS);
}

export function verifyPin(pin: string, stored: string): boolean {
  try {
    // Support legacy SHA256 format (salt:hash) for migration period
    if (stored.includes(":") && !stored.startsWith("$2")) {
      return verifyLegacySha256Pin(pin, stored);
    }
    return bcrypt.compareSync(pin, stored);
  } catch {
    return false;
  }
}

// ─── Legacy format support (for existing hashes until re-hashed on next login) ─
function verifyLegacyScrypt(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const hashBuffer = Buffer.from(hash, "hex");
    const derived = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, derived);
  } catch {
    return false;
  }
}

function verifyLegacySha256Pin(pin: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const derived = createHash("sha256").update(`${pin}:${salt}`).digest("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  } catch {
    return false;
  }
}

/** Extract Bearer token from Authorization header */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
