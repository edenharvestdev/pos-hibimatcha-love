/**
 * Print Payload Generators
 * Generates HTML-based print payloads for thermal printers (80mm paper)
 * Documents: Order Slip, Sticker Labels, Kitchen Ticket, Tax Receipt
 */
import * as generatePayloadModule from "promptpay-qr";
import * as QRCode from "qrcode";

const generatePayload = (generatePayloadModule as any).default || generatePayloadModule;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderData {
  id: number;
  orderNumber: string;
  orderType: string;
  tableNumber?: string | null;
  customerName?: string | null;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  staffName: string;
  createdAt: Date | string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  notes?: string | null;
  items: OrderItemData[];
  // New fields for real receipt format
  pickupNumber?: string; // หมายเลขการรับอาหาร (e.g. 002)
  receiptNumber?: string; // เลขที่ใบเสร็จ (e.g. 2026000000000143)
  deviceSN?: string; // SN (Sunmi device serial)
  paymentMethodName?: string; // ชื่อวิธีชำระเงิน
  paidAmount?: number; // ยอดชำระ
  roundingAmount?: number; // ปัดเศษ
}

export interface OrderItemData {
  id: number;
  menuItemName: string;
  menuItemSku?: string; // SKU code e.g. HBM01M18L
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  options: { name: string; priceAdjustment: number }[];
}

export interface BranchPaymentSettings {
  promptpayId?: string | null;
  promptpayName?: string | null;
  promptpayType?: string | null;
  taxId?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  receiptHeaderImage?: string | null;
  receiptFooterText?: string | null;
}

// ─── PromptPay QR ─────────────────────────────────────────────────────────────
export function generatePromptPayPayload(promptpayId: string, amount: number): string {
  return generatePayload(promptpayId, { amount });
}

export async function generatePromptPayQRDataUrl(promptpayId: string, amount: number): Promise<string> {
  const payload = generatePromptPayPayload(promptpayId, amount);
  return QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: "M" });
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const THERMAL_STYLE = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 3mm; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .large { font-size: 16px; }
  .xlarge { font-size: 20px; }
  .small { font-size: 10px; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .double-line { border-top: 2px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .item-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .option { padding-left: 12px; font-size: 10px; color: #333; }
  .qr { text-align: center; margin: 8px 0; }
  .qr img { width: 50mm; height: 50mm; }
  .note { background: #f0f0f0; padding: 4px; margin: 4px 0; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .cut { page-break-after: always; }
  @media print {
    body { width: 80mm; margin: 0; padding: 2mm; }
    .no-print { display: none; }
  }
</style>`;

// ─── Order Slip (Counter) ─────────────────────────────────────────────────────
export async function generateOrderSlipHTML(
  order: OrderData,
  settings: BranchPaymentSettings,
  qrDataUrl?: string
): Promise<string> {
  const time = new Date(order.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

  let qrSection = "";
  if (qrDataUrl) {
    qrSection = `
      <div class="line"></div>
      <div class="center bold">สแกนจ่ายเงิน PromptPay</div>
      <div class="qr"><img src="${qrDataUrl}" alt="PromptPay QR" /></div>
      <div class="center bold large">฿${order.totalAmount.toFixed(2)}</div>
      ${settings.promptpayName ? `<div class="center small">${settings.promptpayName}</div>` : ""}
      ${settings.promptpayId ? `<div class="center small">ID: ${settings.promptpayId}</div>` : ""}
    `;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${THERMAL_STYLE}</head><body>
    <div class="center bold xlarge">HIBI MATCHA</div>
    <div class="center small">${order.branchName}</div>
    <div class="center bold" style="margin: 4px auto; border: 1px solid #000; padding: 2px 4px; font-size: 13px; width: fit-content; max-width: 90%;">ใบเตรียมสินค้า (Order Slip)</div>
    <div class="line"></div>
    <div class="row"><span>Order: <b>${order.orderNumber}</b></span><span>${order.orderType}</span></div>
    ${order.tableNumber ? `<div>โต๊ะ: ${order.tableNumber}</div>` : ""}
    ${order.customerName ? `<div>ลูกค้า: ${order.customerName}</div>` : ""}
    <div class="row"><span>พนักงาน: ${order.staffName}</span></div>
    <div class="small">${time}</div>
    <div class="double-line"></div>
    
    ${order.items.map((item, i) => `
      <div class="item-row">
        <span>${item.quantity}x ${item.menuItemName}</span>
        <span>฿${item.totalPrice.toFixed(2)}</span>
      </div>
      ${item.options.map(opt => `<div class="option">  └ ${opt.name}${opt.priceAdjustment > 0 ? ` +฿${opt.priceAdjustment}` : ""}</div>`).join("")}
      ${item.notes ? `<div class="option note">📝 ${item.notes}</div>` : ""}
    `).join("")}
    
    <div class="double-line"></div>
    <div class="row"><span>รวม</span><span>฿${order.subtotal.toFixed(2)}</span></div>
    ${order.discountAmount > 0 ? `<div class="row"><span>ส่วนลด</span><span>-฿${order.discountAmount.toFixed(2)}</span></div>` : ""}
    ${order.taxAmount > 0 ? `<div class="row"><span>VAT 7%</span><span>฿${order.taxAmount.toFixed(2)}</span></div>` : ""}
    ${order.serviceCharge > 0 ? `<div class="row"><span>Service Charge</span><span>฿${order.serviceCharge.toFixed(2)}</span></div>` : ""}
    <div class="line"></div>
    <div class="row bold large"><span>รวมทั้งหมด</span><span>฿${order.totalAmount.toFixed(2)}</span></div>
    
    ${qrSection}
    
    ${order.notes ? `<div class="line"></div><div class="note">หมายเหตุ: ${order.notes}</div>` : ""}
    <div class="line"></div>
    <div class="center small">ขอบคุณที่อุดหนุน ♥</div>
    <div class="center small">Thank you for your purchase</div>
  </body></html>`;
}

// ─── Sticker Label (per item) ─────────────────────────────────────────────────
export function generateLabelHTML(
  order: OrderData,
  item: OrderItemData,
  itemIndex: number,
  totalItems: number
): string {
  const time = new Date(order.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Generate labels for each quantity
  const labels: string[] = [];
  for (let q = 0; q < item.quantity; q++) {
    const seqNum = itemIndex + q + 1;
    labels.push(`
      <div class="label" style="border: 1px dashed #000; padding: 4mm; margin-bottom: 2mm; page-break-after: always;">
        <div class="row">
          <span class="bold">${order.orderNumber}</span>
          <span class="bold">${seqNum}/${totalItems}</span>
        </div>
        <div class="bold large" style="margin: 2px 0;">${item.menuItemName}</div>
        ${item.options.length > 0 ? `<div style="margin: 2px 0;">${item.options.map(o => o.name).join(" | ")}</div>` : ""}
        ${item.notes ? `<div class="note bold">⚠️ ${item.notes}</div>` : ""}
        <div class="row small" style="margin-top: 4px;">
          <span>${time}</span>
          <span>${order.staffName}</span>
        </div>
      </div>
    `);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 2mm; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .small { font-size: 10px; }
    .row { display: flex; justify-content: space-between; }
    .note { background: #ff0; padding: 2px 4px; margin: 2px 0; }
    .label { break-inside: avoid; }
    @media print { body { width: 80mm; margin: 0; padding: 1mm; } }
  </style></head><body>${labels.join("")}</body></html>`;
}

// ─── All Labels for an Order ──────────────────────────────────────────────────
export function generateAllLabelsHTML(order: OrderData): string {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  let currentIndex = 0;
  const allLabels: string[] = [];

  for (const item of order.items) {
    const labelHtml = generateLabelHTML(order, item, currentIndex, totalItems);
    allLabels.push(labelHtml);
    currentIndex += item.quantity;
  }

  // Combine all into one document
  const time = new Date(order.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });

  const labels: string[] = [];
  currentIndex = 0;
  for (const item of order.items) {
    for (let q = 0; q < item.quantity; q++) {
      currentIndex++;
      labels.push(`
        <div class="label">
          <div class="row">
            <span class="bold">${order.orderNumber}</span>
            <span class="bold">${currentIndex}/${totalItems}</span>
          </div>
          <div class="bold large" style="margin: 2px 0;">${item.menuItemName}</div>
          ${item.options.length > 0 ? `<div style="margin: 2px 0;">${item.options.map(o => o.name).join(" | ")}</div>` : ""}
          ${item.notes ? `<div class="note bold">⚠️ ${item.notes}</div>` : ""}
          <div class="row small" style="margin-top: 4px;">
            <span>${time}</span>
            <span>${order.staffName}</span>
          </div>
        </div>
      `);
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 2mm; }
    .bold { font-weight: bold; }
    .large { font-size: 16px; }
    .small { font-size: 10px; }
    .row { display: flex; justify-content: space-between; }
    .note { background: #ff0; padding: 2px 4px; margin: 2px 0; }
    .label { border: 1px dashed #000; padding: 4mm; margin-bottom: 2mm; page-break-after: always; break-inside: avoid; }
    @media print { body { width: 80mm; margin: 0; padding: 1mm; } }
  </style></head><body>${labels.join("")}</body></html>`;
}

// ─── Kitchen Ticket ───────────────────────────────────────────────────────────
export function generateKitchenTicketHTML(order: OrderData): string {
  const time = new Date(order.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 14px; width: 80mm; padding: 3mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .xlarge { font-size: 24px; }
    .large { font-size: 18px; }
    .small { font-size: 11px; }
    .line { border-top: 2px dashed #000; margin: 6px 0; }
    .item { margin: 6px 0; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .qty { font-size: 20px; font-weight: bold; }
    .option { padding-left: 16px; font-size: 13px; }
    .note { background: #ff0; padding: 4px; margin: 4px 0; font-weight: bold; font-size: 14px; }
    .row { display: flex; justify-content: space-between; }
    @media print { body { width: 80mm; margin: 0; padding: 2mm; } }
  </style></head><body>
    <div class="center bold xlarge" style="border: 2px solid #000; padding: 4px 0;">🍵 ครัว (Kitchen Ticket)</div>
    <div class="line"></div>
    <div class="row">
      <span class="bold large">${order.orderNumber}</span>
      <span class="bold">${order.orderType}</span>
    </div>
    ${order.tableNumber ? `<div class="bold large">โต๊ะ: ${order.tableNumber}</div>` : ""}
    <div class="row"><span>${time}</span><span>${order.staffName}</span></div>
    <div class="line"></div>
    
    ${order.items.map(item => `
      <div class="item">
        <div class="row">
          <span class="qty">${item.quantity}x</span>
          <span class="bold large" style="flex:1; margin-left: 8px;">${item.menuItemName}</span>
        </div>
        ${item.options.map(opt => `<div class="option">→ ${opt.name}</div>`).join("")}
        ${item.notes ? `<div class="note">⚠️ ${item.notes}</div>` : ""}
      </div>
    `).join("")}
    
    ${order.notes ? `<div class="line"></div><div class="note">📝 ORDER NOTE: ${order.notes}</div>` : ""}
    <div class="line"></div>
    <div class="center small">จำนวนรายการ: ${order.items.reduce((s, i) => s + i.quantity, 0)} ชิ้น</div>
  </body></html>`;
}

// ─── Tax Receipt (matches real Hibi Matcha Café receipt format) ───────────────
export function generateReceiptHTML(
  order: OrderData,
  settings: BranchPaymentSettings,
  paymentMethod?: string,
  referenceNumber?: string,
  qrDataUrl?: string
): string {
  const dt = new Date(order.createdAt);
  const dateStr = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  const timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:${String(dt.getSeconds()).padStart(2, "0")}`;
  const dateTimeStr = `${dateStr} ${timeStr}`;

  const receiptNo = order.receiptNumber || `${dt.getFullYear()}${String(order.id).padStart(12, "0")}`;
  const pickupNo = order.pickupNumber || String(order.id % 1000).padStart(3, "0");
  const orderNo = order.orderNumber?.replace(/\D/g, "").slice(-4).padStart(4, "0") || String(order.id).padStart(4, "0");

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const payMethodName = paymentMethod || order.paymentMethodName || "เงินสด";
  const paidAmt = order.paidAmount ?? order.totalAmount;
  const roundingAmt = order.roundingAmount ?? 0;

  const branchDisplay = order.branchName.startsWith("Hibi Matcha")
    ? order.branchName
    : `Hibi Matcha Cafe ${order.branchName}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; padding: 3mm; background: white; }
  .center { text-align: center; }
  .right { text-align: right; }
  .left { text-align: left; }
  .bold { font-weight: bold; }
  .h1 { font-size: 18px; font-weight: bold; }
  .h2 { font-size: 14px; font-weight: bold; }
  .h3 { font-size: 12px; }
  .small { font-size: 9px; }
  .line { border-top: 1px dashed #000; margin: 5px 0; }
  .solid-line { border-top: 1px solid #000; margin: 5px 0; }
  .meta { margin: 2px 0; font-size: 11px; }
  .item-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 10px; }
  .item-table thead tr { border-bottom: 1px solid #000; }
  .item-table thead th { padding: 2px 1px; font-weight: bold; font-size: 10px; }
  .item-table thead th.col-name { text-align: left; width: 45%; }
  .item-table thead th.col-price { text-align: right; width: 18%; }
  .item-table thead th.col-qty { text-align: center; width: 12%; }
  .item-table thead th.col-total { text-align: right; width: 25%; }
  .item-name-row td { padding: 3px 1px 0; font-weight: bold; font-size: 10px; }
  .item-price-row td { padding: 0 1px 3px; }
  .col-price-val { text-align: right; }
  .col-qty-val { text-align: center; }
  .col-total-val { text-align: right; }
  .option-line { padding-left: 4px; font-size: 9px; color: #333; }
  .totals { width: 100%; margin: 3px 0; border-collapse: collapse; }
  .totals td { padding: 1px 0; font-size: 11px; }
  .totals td.tl { text-align: left; }
  .totals td.tr { text-align: right; }
  .totals .bold-row td { font-weight: bold; }
  .pay-table { width: 100%; margin: 3px 0; font-size: 11px; border-collapse: collapse; }
  .pay-table td { padding: 1px 0; }
  .pay-label { font-weight: bold; }
  .qr { text-align: center; margin: 6px 0; }
  .qr img { width: 45mm; height: 45mm; }
  @media print {
    body { width: 80mm; margin: 0; padding: 2mm; }
    .no-print { display: none; }
  }
</style></head><body>

  <div class="center h1" style="font-size: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px;">
    ${paymentMethod ? "ใบเสร็จรับเงิน (Receipt)" : "ใบแจ้งยอดชำระ (Bill/Invoice)"}
  </div>

  ${settings.receiptHeaderImage
    ? `<div class="center" style="margin: 6px 0;"><img src="${settings.receiptHeaderImage}" style="max-width: 40mm; max-height: 30mm;" /></div>`
    : `<div class="center" style="margin: 4px 0; font-size: 24px;">☕</div>`
  }

  <div class="center h3">Hibi Matcha Café</div>
  <div class="center h2" style="margin: 3px 0;">${branchDisplay}</div>

  <div class="line"></div>

  <div class="meta">หมายเลขการรับอาหาร: ${pickupNo}</div>
  <div class="meta">หมายเลขคำสั่งซื้อ: ${orderNo}</div>
  <div class="meta">วันและเวลา: ${dateTimeStr}</div>
  ${order.deviceSN ? `<div class="meta">SN:${order.deviceSN}</div>` : ""}
  <div class="meta">เลขที่ใบเสร็จ:${receiptNo}</div>

  <div class="line"></div>

  <table class="item-table">
    <thead>
      <tr>
        <th class="col-name">สินค้า</th>
        <th class="col-price">ราคา</th>
        <th class="col-qty">จำนวน</th>
        <th class="col-total">รวม</th>
      </tr>
    </thead>
    <tbody>
      ${order.items.map(item => {
        const skuPrefix = item.menuItemSku ? `${item.menuItemSku}-` : "";
        const optLines = item.options
          .map(opt => `<tr><td colspan="4" class="option-line">- (${opt.name}${opt.priceAdjustment !== 0 ? ` ${opt.priceAdjustment > 0 ? "+" : ""}${opt.priceAdjustment.toFixed(2)}` : ""})</td></tr>`)
          .join("");
        return `
          <tr class="item-name-row">
            <td colspan="4">${skuPrefix}${item.menuItemName}</td>
          </tr>
          <tr class="item-price-row">
            <td></td>
            <td class="col-price-val">${item.unitPrice.toFixed(2)}</td>
            <td class="col-qty-val">${item.quantity}</td>
            <td class="col-total-val">${item.totalPrice.toFixed(2)}</td>
          </tr>
          ${optLines}
        `;
      }).join("")}
    </tbody>
  </table>

  <div class="line"></div>

  <table class="totals">
    <tr class="bold-row">
      <td class="tl">รวม</td>
      <td class="tr" style="text-align:center; width:40px;">${totalQty}</td>
      <td class="tr">${order.subtotal.toFixed(2)}</td>
    </tr>
  </table>

  <div class="line"></div>

  <table class="totals">
    <tr>
      <td class="tl">ยอดรวมส่วนลด</td>
      <td class="tr">${order.discountAmount > 0 ? order.discountAmount.toFixed(2) : ""}</td>
    </tr>
    <tr>
      <td class="tl">ปัดเศษ</td>
      <td class="tr">${roundingAmt !== 0 ? roundingAmt.toFixed(2) : ""}</td>
    </tr>
    <tr>
      <td class="tl">ยอดรวม</td>
      <td class="tr">${order.subtotal.toFixed(2)}</td>
    </tr>
    <tr>
      <td class="tl">ภาษีมูลค่าเพิ่ม (7%)</td>
      <td class="tr">${order.taxAmount.toFixed(2)}</td>
    </tr>
    <tr class="bold-row">
      <td class="tl">ยอดรวมทั้งหมด</td>
      <td class="tr">${order.totalAmount.toFixed(2)}</td>
    </tr>
  </table>

  <div class="line"></div>

  <div class="meta">ประเภทการชำระเงิน</div>
  <table class="pay-table">
    <tr>
      <td class="tl">${payMethodName}</td>
      <td class="tr">${payMethodName}</td>
    </tr>
    <tr style="border-top: 1px solid #000;" class="bold-row">
      <td class="tl pay-label">ยอดชำระ</td>
      <td class="tr">${paidAmt.toFixed(2)}</td>
    </tr>
    <tr class="bold-row">
      <td></td>
      <td class="tr">${order.totalAmount.toFixed(2)}</td>
    </tr>
  </table>

  ${qrDataUrl ? `
    <div class="line"></div>
    <div class="center bold" style="margin-top: 4px;">สแกนเพื่อชำระเงิน (Scan to Pay)</div>
    <div class="qr"><img src="${qrDataUrl}" alt="PromptPay QR" /></div>
    <div class="center bold large" style="font-size: 15px; margin-bottom: 4px;">฿${order.totalAmount.toFixed(2)}</div>
  ` : ""}

  <div class="line"></div>

  <div class="center" style="margin-top: 4px; font-size: 11px;">${order.branchName}</div>

</body></html>`;
}
