// ============================================
// Automation preferences (per-device, in localStorage)
// ============================================
// Each automation has a corresponding manual action elsewhere in the UI.
// Default: ON for low-risk things (auto-print, auto-ack), OFF for
// destructive/sensitive things (auto-complete cancel, auto-PO).

const KEY = "hibi-automation";

export type AutomationSettings = {
  // Payment flow
  autoPrintReceipt: boolean;        // Print receipt after payment confirmed
  autoOpenCashDrawer: boolean;      // Pulse cash drawer on cash payments
  autoCompleteOrderOnPayment: boolean; // Mark order completed after payment recorded

  // Hardware
  barcodeScannerListener: boolean;  // Global keyboard scanner listener active

  // Sync
  autoGoogleSheetSync: boolean;     // Push every payment row to the Google Sheet

  // Knowledge
  autoAcknowledgeSOP: boolean;      // Auto-acknowledge SOP on scroll-to-bottom

  // Kitchen
  autoAdvanceKitchen: boolean;      // Auto move pending → preparing when ticket opened

  // Stock
  autoDeductIngredientsOnSale: boolean; // Subtract recipe ingredients on order complete
  autoLowStockNotice: boolean;      // Show banner when items hit reorder point

  // Reports
  autoEmailDailySummary: boolean;   // Email daily report at close-of-day (server-side)
};

const DEFAULTS: AutomationSettings = {
  autoPrintReceipt: true,
  autoOpenCashDrawer: true,
  autoCompleteOrderOnPayment: true,
  barcodeScannerListener: true,
  autoGoogleSheetSync: true,
  autoAcknowledgeSOP: true,
  autoAdvanceKitchen: false,
  autoDeductIngredientsOnSale: true,
  autoLowStockNotice: true,
  autoEmailDailySummary: false,
};

let cache: AutomationSettings | null = null;
const listeners = new Set<(s: AutomationSettings) => void>();

export function getAutomation(): AutomationSettings {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache = { ...DEFAULTS, ...parsed };
      return cache!;
    }
  } catch {}
  cache = { ...DEFAULTS };
  return cache!;
}

export function setAutomation(patch: Partial<AutomationSettings>): AutomationSettings {
  cache = { ...getAutomation(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach((fn) => fn(cache!));
  return cache;
}

export function resetAutomation(): AutomationSettings {
  cache = { ...DEFAULTS };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach((fn) => fn(cache!));
  return cache;
}

export function subscribeAutomation(fn: (s: AutomationSettings) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// React hook for automation settings
import { useEffect, useState } from "react";
export function useAutomation(): [AutomationSettings, (patch: Partial<AutomationSettings>) => void] {
  const [s, setS] = useState(getAutomation);
  useEffect(() => subscribeAutomation(setS), []);
  return [s, (patch) => setAutomation(patch)];
}

// ============================================================
// Labels for the Settings UI
// ============================================================
export const AUTOMATION_LABELS: Record<keyof AutomationSettings, { label: string; desc: string; group: string }> = {
  autoPrintReceipt: {
    label: "Auto-print receipt",
    desc: "Print receipt automatically after payment is confirmed. Off: print only via the Print button on the receipt page.",
    group: "Payment",
  },
  autoOpenCashDrawer: {
    label: "Auto-open cash drawer",
    desc: "Pulse the cash drawer on cash payments. Off: only opens when you press 'Open drawer'.",
    group: "Payment",
  },
  autoCompleteOrderOnPayment: {
    label: "Auto-complete order on payment",
    desc: "Mark the order 'completed' as soon as payment is recorded. Off: leave the order in its current status — manually mark complete later.",
    group: "Payment",
  },
  barcodeScannerListener: {
    label: "Barcode scanner listener",
    desc: "Listen for rapid keyboard input (USB scanner) anywhere in POS. Off: only use the 📷 Scan button.",
    group: "Hardware",
  },
  autoGoogleSheetSync: {
    label: "Auto-sync to Google Sheet",
    desc: "Send every confirmed payment to the cash sheet automatically. Off: use the Sync button on Reports.",
    group: "Sync",
  },
  autoAcknowledgeSOP: {
    label: "Auto-acknowledge SOPs",
    desc: "Mark an SOP acknowledged when staff scrolls to the bottom + spends ≥5s. Off: must tap Acknowledge button.",
    group: "Knowledge",
  },
  autoAdvanceKitchen: {
    label: "Auto-advance kitchen tickets",
    desc: "Tickets move 'pending → preparing' the moment the kitchen view is opened. Off: kitchen taps Start.",
    group: "Kitchen",
  },
  autoDeductIngredientsOnSale: {
    label: "Auto-deduct ingredients",
    desc: "Subtract recipe ingredients from inventory when each order is completed. Off: stock adjusts only when you do a count.",
    group: "Stock",
  },
  autoLowStockNotice: {
    label: "Low stock notification",
    desc: "Show a banner when items drop below reorder point. Off: only the Inventory page shows alerts.",
    group: "Stock",
  },
  autoEmailDailySummary: {
    label: "Email daily summary (server)",
    desc: "Server emails the close-of-day report each night. Requires SMTP config on backend (not enabled by default).",
    group: "Reports",
  },
};
