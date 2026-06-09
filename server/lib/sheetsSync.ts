// ============================================
// Google Sheets sync — append rows to a Google Sheet
// ============================================
// Strategy: post to a Google Apps Script Web App that runs with the sheet
// owner's permissions. No OAuth, no service account, no library required —
// just a single fetch() to the published Web App URL.
//
// Setup once (see HANDOFF.md → "Google Sheets sync"):
//   1. Open the sheet https://docs.google.com/spreadsheets/d/1D5uavkMFPDfZeoQ4thUMvSVM46QdydORvmIGFmF3uEQ/edit
//   2. Extensions → Apps Script
//   3. Paste the script from HANDOFF.md
//   4. Deploy → New deployment → Web app, "Anyone" can access
//   5. Copy the deployment URL into .env as GOOGLE_SHEET_WEBAPP_URL
//
// All requests are fire-and-forget — they never block the order flow.
// Failures are logged but don't fail the payment.

const SHEET_URL = process.env.GOOGLE_SHEET_WEBAPP_URL || "";
const SHEET_ID = "1D5uavkMFPDfZeoQ4thUMvSVM46QdydORvmIGFmF3uEQ";

export type CashSheetRow = {
  timestamp: string;       // ISO datetime
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm:ss
  orderNumber: string;
  branchName: string;
  branchCode: string;
  paymentMethod: string;
  paymentType: string;     // cash | qr | card | transfer | voucher
  amount: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  cashier: string;
  customer: string;
  tableNumber: string;
  itemsSummary: string;    // "2x Iced Matcha Latte, 1x Brownie"
  reference: string;       // EDC ref, QR ref, slip ref, etc.
};

/**
 * Append a row to the Google Sheet "cash" tab.
 * Returns true on success, false on failure (never throws).
 */
export async function appendCashRow(row: CashSheetRow): Promise<boolean> {
  if (!SHEET_URL) {
    console.warn("[Sheets] GOOGLE_SHEET_WEBAPP_URL not set — skipping sync");
    return false;
  }
  try {
    const res = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: "cash",
        sheetId: SHEET_ID,
        row,
      }),
      // 5 second timeout — don't block payment flow
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn("[Sheets] sync failed with status", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Sheets] sync error:", err);
    return false;
  }
}

/**
 * Same as appendCashRow but fire-and-forget — doesn't await.
 * Use this from request handlers so the response returns immediately.
 */
export function appendCashRowAsync(row: CashSheetRow): void {
  appendCashRow(row).catch((err) => console.warn("[Sheets] async error:", err));
}
