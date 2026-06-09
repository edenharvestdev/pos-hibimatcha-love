// server/lib/omise.ts
// Simple Omise wrapper (sandbox/production via env vars)
import axios from "axios";
import { z } from "zod";

const OMisePublicKey = process.env.OMISE_PUBLIC_KEY || "your-omise-public-key";
const OMiseSecretKey = process.env.OMISE_SECRET_KEY || "your-omise-secret-key";
const baseURL = "https://api.omise.co";

const client = axios.create({
  baseURL,
  auth: { username: OMiseSecretKey, password: "" },
});

/**
 * Create a charge (customer payment).
 * amount: in satang (e.g., 1000 = 10 THB)
 */
export async function createCharge(params: {
  amount: number;
  currency?: string;
  description?: string;
  return_uri?: string;
  capture?: boolean;
  card?: string; // tokenized card
}) {
  const schema = z.object({
    amount: z.number().int().positive(),
    currency: z.string().optional().default("THB"),
    description: z.string().optional(),
    return_uri: z.string().url().optional(),
    capture: z.boolean().optional().default(true),
    card: z.string().optional(),
  });
  const data = schema.parse(params);
  const resp = await client.post("/charges", data);
  return resp.data;
}

/** Retrieve a charge by its ID */
export async function retrieveCharge(chargeId: string) {
  const resp = await client.get(`/charges/${chargeId}`);
  return resp.data;
}

/** Refund a charge (full or partial) */
export async function refundCharge(params: {
  chargeId: string;
  amount?: number; // satang, optional for partial refund
}) {
  const schema = z.object({
    chargeId: z.string().min(1),
    amount: z.number().int().positive().optional(),
  });
  const { chargeId, amount } = schema.parse(params);
  const resp = await client.post(`/charges/${chargeId}/refunds`, amount ? { amount } : {});
  return resp.data;
}
