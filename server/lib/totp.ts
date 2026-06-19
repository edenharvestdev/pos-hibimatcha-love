import { generateSecret, generateURI, verify } from "otplib";

const ISSUER = process.env.VITE_BRAND_NAME || "Hibi Matcha";

export function createTotpSecret(): string {
  return generateSecret();
}

export function getTotpUri(employeeCode: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: employeeCode, secret });
}

export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
  const result = await verify({ secret, token });
  return result.valid;
}
