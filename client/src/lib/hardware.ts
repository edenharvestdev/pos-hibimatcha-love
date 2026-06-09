// ============================================
// POS Hardware Abstraction Layer
// ============================================
// Supports:
//   - Receipt printing  → ESC/POS via Web USB / Web Bluetooth / browser print fallback
//   - Cash drawer       → Triggered through receipt printer (most thermal printers)
//   - Barcode scanner   → Listens to global keyboard input (most USB scanners act as keyboards)
//   - Customer display  → Via second window / iframe on tablet
//
// All methods degrade gracefully:
//   - Web app    → browser print, keyboard scanner
//   - Tablet     → Web Bluetooth printer (if paired), keyboard scanner
//   - Capacitor  → native plugin can replace the print backend
//   - POS terminal → Web USB (Chrome) or network printer

export type PrintReceiptInput = {
  branchName: string;
  branchAddress?: string;
  orderNumber: string;
  date: Date;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    options?: string[];
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  cashier?: string;
  customerName?: string;
  tableNumber?: string;
  footerNote?: string;
};

// ESC/POS command bytes
const ESC = 0x1b;
const GS = 0x1d;
const ESCPOS = {
  init: new Uint8Array([ESC, 0x40]),
  alignCenter: new Uint8Array([ESC, 0x61, 0x01]),
  alignLeft: new Uint8Array([ESC, 0x61, 0x00]),
  alignRight: new Uint8Array([ESC, 0x61, 0x02]),
  boldOn: new Uint8Array([ESC, 0x45, 0x01]),
  boldOff: new Uint8Array([ESC, 0x45, 0x00]),
  doubleSize: new Uint8Array([GS, 0x21, 0x11]),
  normalSize: new Uint8Array([GS, 0x21, 0x00]),
  cut: new Uint8Array([GS, 0x56, 0x42, 0x00]),
  // Pulse cash drawer (pin 2)
  openCashDrawer: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]),
  lineFeed: new Uint8Array([0x0a]),
};

function encode(text: string): Uint8Array {
  // TextEncoder defaults to UTF-8, which most thermal printers support
  return new TextEncoder().encode(text);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ============================================================
// Build ESC/POS byte stream for a receipt
// ============================================================
export function buildReceiptBytes(r: PrintReceiptInput): Uint8Array {
  const parts: Uint8Array[] = [ESCPOS.init];

  // Header
  parts.push(ESCPOS.alignCenter, ESCPOS.boldOn, ESCPOS.doubleSize);
  parts.push(encode(r.branchName + "\n"));
  parts.push(ESCPOS.normalSize, ESCPOS.boldOff);
  if (r.branchAddress) parts.push(encode(r.branchAddress + "\n"));
  parts.push(encode("\n"));

  // Order info
  parts.push(ESCPOS.alignLeft);
  parts.push(encode(`Order: ${r.orderNumber}\n`));
  parts.push(encode(`Date:  ${r.date.toLocaleString()}\n`));
  if (r.cashier) parts.push(encode(`Cashier: ${r.cashier}\n`));
  if (r.tableNumber) parts.push(encode(`Table: ${r.tableNumber}\n`));
  if (r.customerName) parts.push(encode(`Customer: ${r.customerName}\n`));
  parts.push(encode("--------------------------------\n"));

  // Items
  for (const it of r.items) {
    const line = `${it.qty}x ${it.name}`;
    const price = (it.unitPrice * it.qty).toFixed(2);
    const padding = Math.max(1, 32 - line.length - price.length);
    parts.push(encode(line + " ".repeat(padding) + price + "\n"));
    for (const opt of it.options || []) {
      parts.push(encode(`   + ${opt}\n`));
    }
  }
  parts.push(encode("--------------------------------\n"));

  // Totals
  const fmtLine = (label: string, value: number) => {
    const v = value.toFixed(2);
    const padding = Math.max(1, 32 - label.length - v.length);
    return label + " ".repeat(padding) + v + "\n";
  };
  parts.push(encode(fmtLine("Subtotal", r.subtotal)));
  if (r.discount && r.discount > 0) parts.push(encode(fmtLine("Discount", -r.discount)));
  if (r.tax && r.tax > 0) parts.push(encode(fmtLine("VAT 7%", r.tax)));
  parts.push(ESCPOS.boldOn, ESCPOS.doubleSize);
  parts.push(encode(fmtLine("TOTAL", r.total)));
  parts.push(ESCPOS.normalSize, ESCPOS.boldOff);
  if (r.paymentMethod) parts.push(encode(`\nPaid via: ${r.paymentMethod}\n`));

  // Footer
  parts.push(encode("\n"), ESCPOS.alignCenter);
  parts.push(encode((r.footerNote ?? "Thank you · ありがとうございました") + "\n"));
  parts.push(encode("Hibi Matcha · ひびマッチャ\n"));

  parts.push(ESCPOS.lineFeed, ESCPOS.lineFeed, ESCPOS.lineFeed, ESCPOS.cut);
  return concat(...parts);
}

// ============================================================
// Print over Web USB (Chrome / Edge desktop / Android Chrome)
// ============================================================
export async function printViaUSB(bytes: Uint8Array): Promise<void> {
  const nav = navigator as any;
  if (!nav.usb) throw new Error("Web USB not supported on this device");

  // Common thermal-printer vendor IDs (Epson, Star, Citizen, Bixolon, etc.)
  // Empty filter shows all devices.
  const device = await nav.usb.requestDevice({ filters: [] });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  await device.claimInterface(device.configuration.interfaces[0].interfaceNumber);

  const endpoint = device.configuration.interfaces[0].alternate.endpoints
    .find((e: any) => e.direction === "out");
  if (!endpoint) throw new Error("No OUT endpoint on printer");

  // Chunk to 64-byte packets for compatibility
  const chunkSize = 64;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    await device.transferOut(endpoint.endpointNumber, bytes.slice(i, i + chunkSize));
  }
  await device.close();
}

// ============================================================
// Print over Web Bluetooth (iOS Safari does NOT support this — use USB or browser print)
// ============================================================
export async function printViaBluetooth(bytes: Uint8Array): Promise<void> {
  const nav = navigator as any;
  if (!nav.bluetooth) throw new Error("Web Bluetooth not supported on this device");

  // SPP UUID for most thermal printers
  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
    optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
  const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

  const chunkSize = 120;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    await characteristic.writeValue(bytes.slice(i, i + chunkSize));
  }
}

// ============================================================
// Print via network printer (TCP — only works in Capacitor / Electron context)
// ============================================================
export async function printViaNetwork(host: string, port: number, bytes: Uint8Array): Promise<void> {
  // In a pure web context this requires a relay endpoint on the server.
  // The Express backend would expose POST /api/print/network { host, port, base64Bytes }.
  const res = await fetch("/api/print/network", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host,
      port,
      bytes: btoa(String.fromCharCode(...bytes)),
    }),
  });
  if (!res.ok) throw new Error("Network print failed: " + res.status);
}

// ============================================================
// Fallback: browser print dialog (works everywhere, just less pretty)
// ============================================================
export function printViaBrowser(r: PrintReceiptInput): void {
  const w = window.open("", "_blank", "width=300,height=600");
  if (!w) { alert("Pop-up blocked — please allow pop-ups to print."); return; }
  const html = `
    <!doctype html><html><head><title>${r.orderNumber}</title>
    <style>
      body { font-family: monospace; padding: 12px; width: 280px; }
      h1 { font-size: 14px; text-align: center; margin: 0 0 8px; }
      .row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
      .sep { border-top: 1px dashed #888; margin: 6px 0; }
      .big { font-size: 14px; font-weight: bold; }
      .center { text-align: center; }
      .small { font-size: 9px; color: #666; }
    </style></head><body>
      <h1>${r.branchName}</h1>
      ${r.branchAddress ? `<div class="center small">${r.branchAddress}</div>` : ""}
      <div class="sep"></div>
      <div class="row"><span>Order</span><span>${r.orderNumber}</span></div>
      <div class="row"><span>Date</span><span>${r.date.toLocaleString()}</span></div>
      ${r.cashier ? `<div class="row"><span>Cashier</span><span>${r.cashier}</span></div>` : ""}
      <div class="sep"></div>
      ${r.items.map((it) => `
        <div class="row"><span>${it.qty}x ${it.name}</span><span>฿${(it.unitPrice*it.qty).toFixed(2)}</span></div>
        ${(it.options||[]).map((o) => `<div class="small">  + ${o}</div>`).join("")}
      `).join("")}
      <div class="sep"></div>
      <div class="row"><span>Subtotal</span><span>฿${r.subtotal.toFixed(2)}</span></div>
      ${r.discount ? `<div class="row"><span>Discount</span><span>-฿${r.discount.toFixed(2)}</span></div>` : ""}
      ${r.tax ? `<div class="row"><span>VAT 7%</span><span>฿${r.tax.toFixed(2)}</span></div>` : ""}
      <div class="row big"><span>TOTAL</span><span>฿${r.total.toFixed(2)}</span></div>
      ${r.paymentMethod ? `<div class="row"><span>Paid via</span><span>${r.paymentMethod}</span></div>` : ""}
      <div class="sep"></div>
      <div class="center">${r.footerNote ?? "Thank you · ありがとうございました"}</div>
      <div class="center small">Hibi Matcha · ひびマッチャ</div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 200); }<\/script>
    </body></html>`;
  w.document.write(html);
  w.document.close();
}

// ============================================================
// High-level: print receipt with best available backend
// ============================================================
export type PrintBackend = "usb" | "bluetooth" | "network" | "browser";

export async function printReceipt(
  r: PrintReceiptInput,
  preferred: PrintBackend = "browser",
  options?: { networkHost?: string; networkPort?: number; openDrawer?: boolean }
): Promise<{ ok: boolean; backend: PrintBackend; error?: string }> {
  let bytes = buildReceiptBytes(r);
  if (options?.openDrawer) {
    // Append cash drawer pulse after the print
    bytes = concat(bytes, ESCPOS.openCashDrawer);
  }

  const tryBackends: PrintBackend[] = [preferred, "usb", "bluetooth", "browser"];
  for (const backend of [...new Set(tryBackends)]) {
    try {
      if (backend === "usb") {
        await printViaUSB(bytes);
        return { ok: true, backend };
      }
      if (backend === "bluetooth") {
        await printViaBluetooth(bytes);
        return { ok: true, backend };
      }
      if (backend === "network" && options?.networkHost) {
        await printViaNetwork(options.networkHost, options.networkPort ?? 9100, bytes);
        return { ok: true, backend };
      }
      if (backend === "browser") {
        printViaBrowser(r);
        return { ok: true, backend };
      }
    } catch (err) {
      console.warn(`[Hardware] ${backend} print failed:`, err);
    }
  }
  return { ok: false, backend: preferred, error: "All print backends failed" };
}

// ============================================================
// Cash drawer (standalone — uses ESC/POS pulse)
// ============================================================
export async function openCashDrawer(backend: PrintBackend = "usb"): Promise<void> {
  const bytes = ESCPOS.openCashDrawer;
  if (backend === "usb") return printViaUSB(bytes);
  if (backend === "bluetooth") return printViaBluetooth(bytes);
  throw new Error("Cash drawer not available without a connected printer");
}

// ============================================================
// Barcode scanner — global keyboard listener
// ============================================================
// Most USB barcode scanners act as keyboards: they type the barcode quickly
// and end with Enter. We detect a rapid sequence terminated by Enter.
export type ScannerHandler = (barcode: string) => void;

let scannerBuffer = "";
let scannerTimer: number | null = null;
let scannerHandlers: ScannerHandler[] = [];

export function startBarcodeScanner(): () => void {
  const onKey = (e: KeyboardEvent) => {
    // Ignore when typing in inputs (so we don't intercept normal typing)
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

    if (e.key === "Enter") {
      if (scannerBuffer.length >= 4) {
        scannerHandlers.forEach((h) => h(scannerBuffer));
      }
      scannerBuffer = "";
      return;
    }
    if (e.key.length === 1) {
      scannerBuffer += e.key;
      // Reset buffer after 200ms of inactivity (human typing is slower than scanner)
      if (scannerTimer) window.clearTimeout(scannerTimer);
      scannerTimer = window.setTimeout(() => { scannerBuffer = ""; }, 200);
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

export function onBarcodeScan(handler: ScannerHandler): () => void {
  scannerHandlers.push(handler);
  return () => { scannerHandlers = scannerHandlers.filter((h) => h !== handler); };
}

// ============================================================
// Device detection
// ============================================================
export const device = {
  get isTablet() {
    return /iPad|Tablet|Android(?!.*Mobile)/i.test(navigator.userAgent);
  },
  get isMobile() {
    return /iPhone|iPod|Android.*Mobile/i.test(navigator.userAgent);
  },
  get isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },
  get isAndroid() {
    return /Android/.test(navigator.userAgent);
  },
  get isStandalone() {
    // True when launched from a home-screen icon as a PWA
    return (window.matchMedia("(display-mode: standalone)").matches)
      || (navigator as any).standalone === true;
  },
  get supportsUSB() {
    return "usb" in navigator;
  },
  get supportsBluetooth() {
    return "bluetooth" in navigator;
  },
  get isOnline() {
    return navigator.onLine;
  },
};
