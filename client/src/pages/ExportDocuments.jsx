// ============================================
// Export Documents: ใบเสร็จรับเงิน/ใบกำกับภาษี + ใบขนส่งสินค้า
// Editable forms → Export as PDF or CSV
// ============================================
import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Modal, Field, Select, Tabs, EmptyState } from "@/components";
import { IconPlus, IconExport, IconImport, IconEdit, IconTrash, IconReceipt, IconTruck, IconSave } from "@/icons";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { AGAPE_LOGO_BASE64 } from "@/lib/logoBase64";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n) {
  if (n == null || isNaN(n)) return "0.00";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() + 543}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Thai baht text conversion (simplified)
function bahtText(amount) {
  if (!amount || amount === 0) return "ศูนย์บาทถ้วน";
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  const thaiDigits = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const thaiUnits = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function numToThai(n) {
    if (n === 0) return "ศูนย์";
    let result = "";
    let digits = String(n).split("").reverse();
    for (let i = digits.length - 1; i >= 0; i--) {
      const d = parseInt(digits[i]);
      if (d === 0) continue;
      if (i === 0 && d === 1 && digits.length > 1) { result += "เอ็ด"; continue; }
      if (i === 1 && d === 2) { result += "ยี่สิบ"; continue; }
      if (i === 1 && d === 1) { result += "สิบ"; continue; }
      result += thaiDigits[d] + thaiUnits[i];
    }
    return result;
  }

  let text = numToThai(intPart) + "บาท";
  if (decPart > 0) text += numToThai(decPart) + "สตางค์";
  else text += "ถ้วน";
  return text;
}

// ─── Default form data ───────────────────────────────────────────────────────

const DEFAULT_COMPANY = {
  companyName: "บริษัท อากาเป้ เอสเซนส์ กรุ๊ป จำกัด",
  companyAddress: "55/60 ซอยนวมินทร์111 แยก4 แขวงนวมินทร์ เขตบึงกุ่ม กรุงเทพมหานคร 10230",
  companyTaxId: "0105568070121",
  companyBranch: "สำนักงานใหญ่",
  companyPhone: "080-2349443",
  companyEmail: "hibimatchacafe@gmail.com",
};

function getDefaultInvoice() {
  return {
    docType: "receipt_tax_invoice",
    ...DEFAULT_COMPANY,
    customerCode: "",
    customerName: "",
    customerAddress: "",
    customerTaxId: "",
    customerBranch: "สำนักงานใหญ่",
    customerPhone: "",
    documentNumber: "",
    soNumber: "",
    poNumber: "",
    documentDate: todayISO(),
    deliveryDate: "",
    salesperson: "",
    reference: "",
    shippingBy: "",
    salesRegion: "",
    items: [{ no: 1, productCode: "", description: "", quantity: 0, unit: "แก้ว", unitPrice: 0, totalPrice: 0 }],
    subtotal: 0,
    discount: 0,
    totalBeforeVat: 0,
    vatRate: 7,
    vatAmount: 0,
    grandTotal: 0,
    amountInWords: "",
    note: "",
  };
}

function getDefaultShipping() {
  return {
    docType: "shipping_note",
    ...DEFAULT_COMPANY,
    customerCode: "",
    customerName: "Hibi Matcha Café สาขาลาดพร้าว107",
    customerAddress: "297 หมู่บ้านดีสมโชค ซอย 3 แขวงคลองจั่น บางกะปิ กรุงเทพมหานคร 10240",
    customerTaxId: "",
    customerBranch: "",
    customerPhone: "0839130556",
    documentNumber: "0876-0001",
    soNumber: "",
    poNumber: "A123456",
    documentDate: "2009-11-12",
    deliveryDate: "",
    salesperson: "",
    reference: "",
    shippingBy: "",
    salesRegion: "",
    items: [
      { no: 1, productCode: "MA-001", description: "ฝาแก้ว สีใส", quantity: 5000, unit: "ชิ้น", unitPrice: 1.306, totalPrice: 6530.00 },
      { no: 2, productCode: "MA-002", description: "ฝาแก้ว สีครีม/เบจ", quantity: 2000, unit: "ชิ้น", unitPrice: 1.306, totalPrice: 2612.00 },
      { no: 3, productCode: "MA-003", description: "ฝาแก้ว สีเขียว", quantity: 9000, unit: "ชิ้น", unitPrice: 1.306, totalPrice: 11754.00 },
      { no: 4, productCode: "MA-004", description: "ฝาแก้ว สีขาว", quantity: 6000, unit: "ชิ้น", unitPrice: 1.306, totalPrice: 7836.00 },
      { no: 5, productCode: "MA-005", description: "นมมะพร้าว1000ml", quantity: 116, unit: "กล่อง", unitPrice: 75.772, totalPrice: 8789.55 },
      { no: 6, productCode: "MA-006", description: "น้ำมะพร้าว 1000ml", quantity: 302, unit: "กล่อง", unitPrice: 70.693, totalPrice: 21349.29 },
      { no: 7, productCode: "MA-007", description: "น้ำมะพร้าวจัดสมิน 1000ml", quantity: 184, unit: "กล่อง", unitPrice: 85.021, totalPrice: 15643.86 },
      { no: 8, productCode: "MA-008", description: "butter milk 1000ml", quantity: 36, unit: "กล่อง", unitPrice: 138.375, totalPrice: 4981.50 },
      { no: 9, productCode: "S-004", description: "Rice Moji 500g", quantity: 20, unit: "ถุง", unitPrice: 111.130, totalPrice: 2222.60 },
    ],
    subtotal: 81718.80,
    discount: 0,
    totalBeforeVat: 81718.80,
    vatRate: 7,
    vatAmount: 5720.32,
    grandTotal: 87439.12,
    amountInWords: "แปดหมื่นเจ็ดพันสี่ร้อยสามสิบเก้าบาทสิบสองสตางค์",
    note: "",
  };
}

function getDefaultPosReceipt() {
  return {
    docType: "pos_receipt",
    // Required by backend schema
    companyName: "Hibi Matcha Caf\u00e9",
    companyAddress: "55/60 ซอยนวมินทร์111 แยก4 แขวงนวมินทร์ เขตบึงกุ่ม กรุงเทพมหานคร",
    companyTaxId: "0105568070121",
    companyBranch: "",
    customerCode: "",
    customerName: "",
    customerAddress: "",
    customerTaxId: "",
    customerBranch: "",
    documentNumber: "",
    soNumber: "",
    documentDate: todayISO(),
    deliveryDate: "",
    salesperson: "",
    reference: "",
    shippingBy: "",
    salesRegion: "",
    amountInWords: "",
    note: "",
    // POS-specific fields
    branchName: "สาขาลาดพร้าว71",
    pickupNumber: "001",
    orderNumber: "0001",
    deviceSN: "",
    receiptNumber: "",
    paymentMethod: "เงินสด",
    items: [{ no: 1, productCode: "", description: "", quantity: 1, unit: "แก้ว", unitPrice: 0, totalPrice: 0, options: [] }],
    subtotal: 0,
    discount: 0,
    totalBeforeVat: 0,
    vatRate: 7,
    vatAmount: 0,
    grandTotal: 0,
    paidAmount: 0,
    roundingAmount: 0,
  };
}

// ─── Quick-fill Picker Modal ─────────────────────────────────────────────────
const QuickFillPicker = ({ open, onClose, type, branchId, onSelect }) => {
  const [search, setSearch] = useState("");
  // Fetch orders or purchase orders based on type
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = trpc.orders.list.useQuery(
    { branchId, status: "completed", limit: 100 },
    { enabled: open && type === "orders" }
  );
  const { data: poData, isLoading: poLoading, error: poError } = trpc.purchaseOrders.list.useQuery(
    { branchId },
    { enabled: open && type === "po" }
  );
  const isLoading = type === "orders" ? ordersLoading : poLoading;
  const error = type === "orders" ? ordersError : poError;
  const items = type === "orders" ? (ordersData?.orders ?? []) : (poData ?? []);
  const filtered = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (type === "orders") {
      return (it.orderNumber ?? "").toLowerCase().includes(q) || (it.customerName ?? "").toLowerCase().includes(q);
    } else {
      return (it.poNumber ?? "").toLowerCase().includes(q) || (it.supplierName ?? "").toLowerCase().includes(q);
    }
  });
  return (
    <Modal open={open} onClose={onClose} title={type === "orders" ? "เลือกจากออเดอร์" : "เลือกจากใบสั่งซื้อ (PO)"} width={600}>
      <div style={{ padding: 16 }}>
        <input
          style={{ width: "100%", padding: "10px 14px", border: "1px solid var(--border-default)", borderRadius: 8, fontSize: 14, marginBottom: 16 }}
          placeholder={type === "orders" ? "ค้นหาเลขออเดอร์ / ชื่อลูกค้า..." : "ค้นหาเลข PO / ชื่อ Supplier..."}
          value={search} onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ maxHeight: 400, overflow: "auto" }}>
          {isLoading && <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>กำลังโหลด...</div>}
          {error && <div style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>เกิดข้อผิดพลาด: {error.message}</div>}
          {!isLoading && !error && filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>ไม่พบข้อมูล</div>}
          {!isLoading && !error && filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => onSelect(it)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                padding: "12px 16px", border: "1px solid var(--border-default)", borderRadius: 8,
                background: "var(--bg-surface)", cursor: "pointer", marginBottom: 8, textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {type === "orders" ? (it.orderNumber || `#${it.id}`) : (it.poNumber || `PO-${it.id}`)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                  {type === "orders"
                    ? `${it.customerName || "Walk-in"} · ${it.createdAt ? new Date(it.createdAt).toLocaleDateString("th-TH") : ""}`
                    : `${it.supplierName || ""} · ${it.orderDate ? new Date(it.orderDate).toLocaleDateString("th-TH") : ""}`
                  }
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--matcha-700)" }}>
                ฿{formatNumber(type === "orders" ? it.totalAmount : it.totalAmount)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const PageExportDocuments = () => {
  const { branch, role } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState("receipt_tax_invoice");
  const [formData, setFormData] = useState(getDefaultInvoice());
  const [savedDocs, setSavedDocs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [quickFillOpen, setQuickFillOpen] = useState(false);
  const [quickFillType, setQuickFillType] = useState("orders"); // "orders" | "po"

  // tRPC utils for fetching full details
  const trpcUtils = trpc.useUtils();

  // Quick-fill handler: fetch full details then fill form
  const handleQuickFill = async (item) => {
    setQuickFillOpen(false);
    try {
      if (quickFillType === "orders") {
        // Fetch full order with items
        const fullOrder = await trpcUtils.orders.getById.fetch({ id: item.id });
        setFormData((prev) => {
          const newItems = (fullOrder.items || []).map((oi, idx) => ({
            no: idx + 1,
            productCode: oi.menuItemSku || oi.sku || "",
            description: oi.menuItemName || oi.name || "",
            quantity: oi.quantity || 1,
            unit: "แก้ว",
            unitPrice: Number(oi.unitPrice || 0),
            totalPrice: Number(oi.totalPrice || 0),
          }));
          const updated = {
            ...prev,
            customerName: fullOrder.customerName || prev.customerName,
            soNumber: fullOrder.orderNumber || "",
            documentDate: fullOrder.createdAt ? new Date(fullOrder.createdAt).toISOString().slice(0, 10) : prev.documentDate,
            items: newItems.length > 0 ? newItems : prev.items,
          };
          return recalcTotals(updated);
        });
        toast.success(`เติมข้อมูลจากออเดอร์ ${fullOrder.orderNumber || "#" + item.id} สำเร็จ`);
      } else {
        // Fetch full PO with items
        const fullPO = await trpcUtils.purchaseOrders.getById.fetch({ id: item.id });
        setFormData((prev) => {
          const newItems = (fullPO.items || []).map((pi, idx) => ({
            no: idx + 1,
            productCode: pi.itemSku || "",
            description: pi.itemName || (pi.notes ? `สินค้า (${pi.notes})` : ""),
            quantity: Number(pi.quantityOrdered || 0),
            unit: pi.unitOfMeasure || "กรัม",
            unitPrice: Number(pi.unitCost || 0),
            totalPrice: Number(pi.totalCost || 0),
          }));
          const updated = {
            ...prev,
            customerName: fullPO.supplierName || prev.customerName,
            customerCode: fullPO.supplierId ? `SUP-${fullPO.supplierId}` : prev.customerCode,
            soNumber: fullPO.poNumber || "",
            reference: `PO-${fullPO.id}`,
            documentDate: fullPO.orderDate ? new Date(fullPO.orderDate).toISOString().slice(0, 10) : prev.documentDate,
            deliveryDate: fullPO.expectedDelivery ? new Date(fullPO.expectedDelivery).toISOString().slice(0, 10) : prev.deliveryDate,
            items: newItems.length > 0 ? newItems : prev.items,
          };
          return recalcTotals(updated);
        });
        toast.success(`เติมข้อมูลจากใบสั่งซื้อ ${fullPO.poNumber || "PO-" + item.id} สำเร็จ`);
      }
    } catch (err) {
      toast.error("ไม่สามารถดึงข้อมูลได้: " + (err?.message || ""));
    }
  };

  // Fetch next document number
  const { data: nextNum } = trpc.exportDocuments.getNextNumber.useQuery(
    { docType: tab },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );

  // Fetch saved documents
  const { data: history = [], refetch: refetchHistory } = trpc.exportDocuments.list.useQuery(
    { docType: tab, limit: 50 },
    { staleTime: 15000 }
  );

  // Mutations
  const createMut = trpc.exportDocuments.create.useMutation({
    onSuccess: () => { toast.success("บันทึกเอกสารสำเร็จ"); refetchHistory(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.exportDocuments.update.useMutation({
    onSuccess: () => { toast.success("อัพเดทเอกสารสำเร็จ"); refetchHistory(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.exportDocuments.delete.useMutation({
    onSuccess: () => { toast.success("ลบเอกสารสำเร็จ"); refetchHistory(); },
    onError: (e) => toast.error(e.message),
  });

  // Switch document type
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setEditingId(null);
    if (newTab === "receipt_tax_invoice") setFormData(getDefaultInvoice());
    else if (newTab === "shipping_note") setFormData(getDefaultShipping());
    else if (newTab === "pos_receipt") setFormData(getDefaultPosReceipt());
  };

  // Update form field
  const setField = (key, value) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-recalculate totals when items change
      if (key === "items" || key === "discount" || key === "vatRate") {
        return recalcTotals(next);
      }
      return next;
    });
  };

  // Recalculate totals
  const recalcTotals = (data) => {
    const itemsTotal = data.items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
    const discount = Number(data.discount) || 0;
    const afterDiscount = itemsTotal - discount;
    const vatRate = Number(data.vatRate) || 7;

    if (data.docType === "pos_receipt") {
      // POS receipt: VAT inclusive pricing (same as receipt_tax_invoice)
      const grandTotal = afterDiscount;
      const totalBeforeVat = grandTotal / (1 + vatRate / 100);
      const vatAmount = grandTotal - totalBeforeVat;
      return {
        ...data,
        subtotal: itemsTotal,
        vatAmount: Math.round(vatAmount * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        paidAmount: Math.round(grandTotal * 100) / 100,
      };
    } else if (data.docType === "receipt_tax_invoice") {
      // Items include VAT → calculate backwards
      const grandTotal = afterDiscount;
      const totalBeforeVat = grandTotal / (1 + vatRate / 100);
      const vatAmount = grandTotal - totalBeforeVat;
      return {
        ...data,
        subtotal: itemsTotal,
        totalBeforeVat: Math.round(totalBeforeVat * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        amountInWords: bahtText(Math.round(grandTotal * 100) / 100),
      };
    } else {
      // Shipping note: items are before VAT
      const vatAmount = afterDiscount * (vatRate / 100);
      const grandTotal = afterDiscount + vatAmount;
      return {
        ...data,
        subtotal: itemsTotal,
        totalBeforeVat: afterDiscount,
        vatAmount: Math.round(vatAmount * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        amountInWords: bahtText(Math.round(grandTotal * 100) / 100),
      };
    }
  };

  // Line item operations
  const addItem = () => {
    const items = [...formData.items, {
      no: formData.items.length + 1,
      productCode: "",
      description: "",
      quantity: 0,
      unit: tab === "receipt_tax_invoice" ? "แก้ว" : "กรัม",
      unitPrice: 0,
      totalPrice: 0,
    }];
    setField("items", items);
  };

  const removeItem = (idx) => {
    const items = formData.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }));
    setField("items", items);
  };

  const updateItem = (idx, key, value) => {
    const items = [...formData.items];
    items[idx] = { ...items[idx], [key]: value };
    // Auto-calc totalPrice
    if (key === "quantity" || key === "unitPrice") {
      items[idx].totalPrice = (Number(items[idx].quantity) || 0) * (Number(items[idx].unitPrice) || 0);
    }
    setField("items", items);
  };

  // Save document
  const handleSave = () => {
    const docNum = formData.documentNumber || nextNum || "00000001";
    const payload = { ...formData, documentNumber: docNum, branchId: branch?.id };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  // Load saved document for editing
  const loadDocument = (doc) => {
    if (doc.data) {
      setFormData(doc.data);
      setEditingId(doc.id);
      setShowHistory(false);
    }
  };

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    let html, title;
    if (tab === "receipt_tax_invoice") {
      html = generateInvoicePDFHtml(formData);
      title = "ใบเสร็จรับเงิน-ใบกำกับภาษี";
    } else if (tab === "shipping_note") {
      html = generateShippingPDFHtml(formData);
      title = "ใบขนส่งสินค้า";
    } else {
      html = generatePosReceiptPDFHtml(formData);
      title = "ใบเสร็จ-POS";
    }
    downloadPDF(title, html);
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = formData.items.map((it) => ({
      "ลำดับ": it.no,
      "รหัสสินค้า": it.productCode || "",
      "รายการ": it.description,
      "จำนวน": it.quantity,
      "หน่วย": it.unit,
      "ราคา/หน่วย": it.unitPrice,
      "จำนวนเงิน": it.totalPrice,
    }));
    // Add summary rows
    rows.push({ "ลำดับ": "", "รหัสสินค้า": "", "รายการ": "", "จำนวน": "", "หน่วย": "", "ราคา/หน่วย": "รวมราคาสินค้า", "จำนวนเงิน": formData.subtotal });
    rows.push({ "ลำดับ": "", "รหัสสินค้า": "", "รายการ": "", "จำนวน": "", "หน่วย": "", "ราคา/หน่วย": `ภาษีมูลค่าเพิ่ม ${formData.vatRate}%`, "จำนวนเงิน": formData.vatAmount });
    rows.push({ "ลำดับ": "", "รหัสสินค้า": "", "รายการ": "", "จำนวน": "", "หน่วย": "", "ราคา/หน่วย": "จำนวนเงินรวมทั้งสิ้น", "จำนวนเงิน": formData.grandTotal });

    const filename = tab === "receipt_tax_invoice"
      ? `ใบเสร็จ-${formData.documentNumber || "draft"}`
      : `ใบขนส่ง-${formData.documentNumber || "draft"}`;
    downloadCSV(filename, rows);
  };

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  const docTabs = [
    { id: "receipt_tax_invoice", label: "ใบเสร็จรับเงิน/ใบกำกับภาษี" },
    { id: "shipping_note", label: "ใบขนส่งสินค้า" },
    { id: "pos_receipt", label: "ใบเสร็จ POS (Thermal)" },
  ];

  return (
    <div style={{ padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 className="t-h2" style={{ fontWeight: 600 }}>เอกสารส่งออก (Export Documents)</h1>
          <p className="muted" style={{ marginTop: 4 }}>สร้างและแก้ไขเอกสารก่อน export เป็น PDF หรือ CSV</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setQuickFillType("orders"); setQuickFillOpen(true); }}>
            <IconImport size={16} /> จากออเดอร์
          </button>
          <button className="btn btn-secondary" onClick={() => { setQuickFillType("po"); setQuickFillOpen(true); }}>
            <IconImport size={16} /> จาก PO
          </button>
          <button className="btn btn-secondary" onClick={() => setShowHistory(true)}>
            ประวัติเอกสาร ({history.length})
          </button>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <IconExport size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF}>
            <IconExport size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Document Type Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border-default)", paddingBottom: 0 }}>
        {docTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: tab === t.id ? "var(--matcha-50)" : "transparent",
              borderBottom: tab === t.id ? "2px solid var(--matcha-700)" : "2px solid transparent",
              color: tab === t.id ? "var(--matcha-700)" : "var(--text-secondary)",
              fontWeight: tab === t.id ? 600 : 400,
              cursor: "pointer",
              borderRadius: "8px 8px 0 0",
              fontSize: 14,
            }}
          >
            {t.id === "receipt_tax_invoice" ? <IconReceipt size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> : t.id === "shipping_note" ? <IconTruck size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> : <IconReceipt size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card" style={{ padding: 24 }}>
        {tab === "pos_receipt" ? (
          /* POS Receipt Form */
          <PosReceiptForm formData={formData} setField={setField} updateItem={updateItem} addItem={addItem} removeItem={removeItem} />
        ) : (
          <>
        {/* Company Info Section */}
        <SectionTitle title="ข้อมูลบริษัท (ผู้ขาย)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <FormField label="ชื่อบริษัท" value={formData.companyName} onChange={(v) => setField("companyName", v)} />
          <FormField label="เลขประจำตัวผู้เสียภาษี" value={formData.companyTaxId} onChange={(v) => setField("companyTaxId", v)} />
          <FormField label="สำนักงาน" value={formData.companyBranch} onChange={(v) => setField("companyBranch", v)} />
          <FormField label="เบอร์โทรศัพท์" value={formData.companyPhone} onChange={(v) => setField("companyPhone", v)} />
          <FormField label="อีเมล" value={formData.companyEmail} onChange={(v) => setField("companyEmail", v)} />
          <FormField label="ที่อยู่" value={formData.companyAddress} onChange={(v) => setField("companyAddress", v)} fullWidth />
        </div>

        {/* Customer Info Section */}
        <SectionTitle title="ข้อมูลลูกค้า (ผู้ซื้อ)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <FormField label="รหัสลูกค้า" value={formData.customerCode} onChange={(v) => setField("customerCode", v)} />
          <FormField label="ชื่อลูกค้า/บริษัท" value={formData.customerName} onChange={(v) => setField("customerName", v)} />
          <FormField label="เลขประจำตัวผู้เสียภาษี" value={formData.customerTaxId} onChange={(v) => setField("customerTaxId", v)} />
          <FormField label="สำนักงาน/สาขา" value={formData.customerBranch} onChange={(v) => setField("customerBranch", v)} />
          <FormField label="เบอร์โทรศัพท์" value={formData.customerPhone} onChange={(v) => setField("customerPhone", v)} />
          <FormField label="ที่อยู่" value={formData.customerAddress} onChange={(v) => setField("customerAddress", v)} fullWidth />
        </div>

        {/* Document Meta */}
        <SectionTitle title="ข้อมูลเอกสาร" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <FormField label="เลขที่เอกสาร" value={formData.documentNumber || nextNum || ""} onChange={(v) => setField("documentNumber", v)} placeholder={nextNum || "Auto"} />
          {tab === "receipt_tax_invoice" && <FormField label="เลขที่ใบสั่งขาย (SO)" value={formData.soNumber} onChange={(v) => setField("soNumber", v)} />}
          {tab === "shipping_note" && <FormField label="ใบสั่งซื้อ" value={formData.poNumber} onChange={(v) => setField("poNumber", v)} />}
          <FormField label="วันที่" value={formData.documentDate} onChange={(v) => setField("documentDate", v)} type="date" />
          {tab === "receipt_tax_invoice" && <FormField label="วันที่ส่งของ" value={formData.deliveryDate} onChange={(v) => setField("deliveryDate", v)} type="date" />}
          {tab === "receipt_tax_invoice" && <FormField label="พนักงานขาย" value={formData.salesperson} onChange={(v) => setField("salesperson", v)} />}
          {tab === "receipt_tax_invoice" && <FormField label="อ้างอิง" value={formData.reference} onChange={(v) => setField("reference", v)} />}
          {tab === "receipt_tax_invoice" && <FormField label="ขนส่งโดย" value={formData.shippingBy} onChange={(v) => setField("shippingBy", v)} />}
          {tab === "receipt_tax_invoice" && <FormField label="เขตการขาย" value={formData.salesRegion} onChange={(v) => setField("salesRegion", v)} />}
        </div>

        {/* Line Items */}
        <SectionTitle title="รายการสินค้า" />
        <div style={{ overflowX: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={thStyle}>ลำดับ</th>
                <th style={thStyle}>รหัสสินค้า</th>
                <th style={{ ...thStyle, minWidth: 200 }}>รายละเอียด</th>
                <th style={thStyle}>จำนวน</th>
                {tab !== "shipping_note" && <th style={thStyle}>หน่วย</th>}
                <th style={thStyle}>ราคา/หน่วย</th>
                <th style={thStyle}>{tab === "receipt_tax_invoice" ? "ราคารวมภาษี" : "จำนวนเงิน"}</th>
                <th style={{ ...thStyle, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={tdStyle}>{item.no}</td>
                  <td style={tdStyle}>
                    <input style={inputStyle} value={item.productCode || ""} onChange={(e) => updateItem(idx, "productCode", e.target.value)} placeholder="รหัส..." />
                  </td>
                  <td style={tdStyle}>
                    <input style={{ ...inputStyle, width: "100%" }} value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="ชื่อสินค้า..." />
                  </td>
                  <td style={tdStyle}>
                    <input style={{ ...inputStyle, width: 70, textAlign: "right" }} type="number" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                  </td>
                  {tab !== "shipping_note" && (
                    <td style={tdStyle}>
                      <input style={{ ...inputStyle, width: 60 }} value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </td>
                  )}
                  <td style={tdStyle}>
                    <input style={{ ...inputStyle, width: 90, textAlign: "right" }} type="number" value={item.unitPrice || ""} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} step="any" />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>
                    {formatNumber(item.totalPrice)}
                  </td>
                  <td style={tdStyle}>
                    {formData.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: 4 }}>
                        <IconTrash size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-secondary" onClick={addItem} style={{ marginBottom: 24 }}>
          <IconPlus size={14} /> เพิ่มรายการ
        </button>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 350, background: "var(--bg-secondary)", borderRadius: 8, padding: 16 }}>
            <TotalRow label="รวมเป็นเงิน" value={formatNumber(formData.subtotal)} />
            {(tab === "receipt_tax_invoice" || tab === "shipping_note") && (
              <TotalRow label="หักส่วนลด">
                <input style={{ ...inputStyle, width: 100, textAlign: "right" }} type="number" value={formData.discount || ""} onChange={(e) => setField("discount", Number(e.target.value))} />
              </TotalRow>
            )}
            {tab === "shipping_note" && (
              <TotalRow label="คงเหลือ" value={formatNumber(formData.subtotal - (formData.discount || 0))} />
            )}
            <TotalRow label={tab === "shipping_note" ? "สุทธิ" : "จำนวนเงินรวมทั้งสิ้น"} value={formatNumber(formData.grandTotal)} bold />
            <TotalRow label={`ภาษีมูลค่าเพิ่ม ${formData.vatRate}%`} value={formatNumber(formData.vatAmount)} />
            {tab === "receipt_tax_invoice" && (
              <TotalRow label="ราคาสินค้า (ก่อน VAT)" value={formatNumber(formData.totalBeforeVat)} />
            )}
            {(tab === "receipt_tax_invoice" || tab === "shipping_note") && formData.amountInWords && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                ({formData.amountInWords})
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        {tab === "shipping_note" && (
          <div style={{ marginTop: 16 }}>
            <FormField label="หมายเหตุ" value={formData.note} onChange={(v) => setField("note", v)} fullWidth />
          </div>
        )}
          </>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border-default)" }}>
          <button className="btn btn-secondary" onClick={() => { const d = tab === "receipt_tax_invoice" ? getDefaultInvoice() : tab === "shipping_note" ? getDefaultShipping() : getDefaultPosReceipt(); setFormData(d); setEditingId(null); }}>
            ล้างฟอร์ม
          </button>
          <button className="btn btn-secondary" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            <IconSave size={16} /> {editingId ? "อัพเดท" : "บันทึก"}
          </button>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <IconExport size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportPDF}>
            <IconExport size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* History Drawer */}
      <Drawer open={showHistory} onClose={() => setShowHistory(false)} title="ประวัติเอกสาร" width={600}>
        <div style={{ padding: 20 }}>
          {history.length === 0 ? (
            <EmptyState title="ยังไม่มีเอกสาร" subtitle="เอกสารที่บันทึกจะแสดงที่นี่" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((doc) => (
                <div key={doc.id} className="card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{doc.documentNumber}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{doc.customerName || "—"} · ฿{formatNumber(doc.grandTotal)}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{doc.createdAt ? new Date(doc.createdAt).toLocaleString("th-TH") : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => loadDocument(doc)}>
                      <IconEdit size={12} /> โหลด
                    </button>
                    <button style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer" }} onClick={() => { if (confirm("ลบเอกสารนี้?")) deleteMut.mutate({ id: doc.id }); }}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* Quick-fill Picker */}
      <QuickFillPicker
        open={quickFillOpen}
        onClose={() => setQuickFillOpen(false)}
        type={quickFillType}
        branchId={branch?.id}
        onSelect={handleQuickFill}
      />
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionTitle = ({ title }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--matcha-700)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {title}
  </div>
);

const FormField = ({ label, value, onChange, type = "text", placeholder, fullWidth }) => (
  <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 12px",
        border: "1px solid var(--border-default)",
        borderRadius: 6,
        fontSize: 14,
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
      }}
    />
  </div>
);

const TotalRow = ({ label, value, bold, children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 13, fontWeight: bold ? 600 : 400 }}>
    <span>{label}</span>
    {children || <span>{value}</span>}
  </div>
);

const thStyle = { padding: "10px 8px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" };
const tdStyle = { padding: "8px", verticalAlign: "middle" };
const inputStyle = { padding: "6px 8px", border: "1px solid var(--border-default)", borderRadius: 4, fontSize: 13, background: "var(--bg-primary)", color: "var(--text-primary)" };

// ─── PDF HTML Generators ─────────────────────────────────────────────────────

function generateInvoicePDFHtml(data) {
  const items = data.items.map((it) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${it.no}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${it.productCode ? it.productCode + " " : ""}${it.description}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;">${it.quantity} ${it.unit}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${formatNumber(it.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;">${formatNumber(it.totalPrice)}</td>
    </tr>
  `).join("");

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
      body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #333; }
      @page { size: A4; margin: 15mm; }
      .header { text-align: center; margin-bottom: 12px; }
      .company-name { font-size: 22px; font-weight: 700; }
      .doc-title { font-size: 16px; font-weight: 600; text-align: center; margin: 12px 0; border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 6px 0; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; font-size: 12px; }
      .info-row { display: flex; gap: 8px; }
      .info-label { color: #666; min-width: 120px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { background: #f5f5f0; padding: 8px; border: 1px solid #ddd; font-size: 12px; }
      .totals { margin-left: auto; width: 280px; }
      .totals tr td { padding: 4px 8px; font-size: 12px; }
      .totals tr td:last-child { text-align: right; }
      .totals .grand { font-weight: 700; font-size: 14px; border-top: 2px solid #333; }
      .signature { margin-top: 40px; display: flex; justify-content: space-between; }
      .sig-box { text-align: center; width: 200px; }
      .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 11px; }
      .amount-words { font-size: 12px; margin-top: 8px; font-style: italic; }
    </style>

    <div class="header">
      <div class="company-name">${data.companyName}</div>
      <div>${data.companyAddress}</div>
      <div>เลขประจำตัวผู้เสียภาษี ${data.companyTaxId} &nbsp;&nbsp; ${data.companyBranch || "สำนักงานใหญ่"}</div>
    </div>

    <div class="doc-title">ใบเสร็จรับเงิน / ใบกำกับภาษี</div>

    <div class="info-grid">
      <div class="info-row"><span class="info-label">ลูกค้า:</span> <span>${data.customerCode || ""} ${data.customerName}</span></div>
      <div class="info-row"><span class="info-label">เลขที่ใบสั่งขาย:</span> <span>${data.soNumber || ""}</span></div>
      <div class="info-row"><span class="info-label">ที่อยู่:</span> <span>${data.customerAddress}</span></div>
      <div class="info-row"><span class="info-label">วันที่:</span> <span>${formatDate(data.documentDate)}</span></div>
      <div class="info-row"><span class="info-label">เลขประจำตัวผู้เสียภาษี:</span> <span>${data.customerTaxId || ""}</span></div>
      <div class="info-row"><span class="info-label">วันที่ส่งของ:</span> <span>${formatDate(data.deliveryDate)}</span></div>
      <div class="info-row"><span class="info-label">อ้างอิง:</span> <span>${data.reference || ""}</span></div>
      <div class="info-row"><span class="info-label">พนักงานขาย:</span> <span>${data.salesperson || "-"}</span></div>
      <div class="info-row"><span class="info-label">ขนส่งโดย:</span> <span>${data.shippingBy || ""}</span></div>
      <div class="info-row"><span class="info-label">เขตการขาย:</span> <span>${data.salesRegion || ""}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;">No.</th>
          <th>รหัสสินค้า/รายละเอียด</th>
          <th style="width:80px;">จำนวน</th>
          <th style="width:80px;">หน่วยละ</th>
          <th style="width:100px;">ราคารวมภาษี</th>
        </tr>
      </thead>
      <tbody>
        ${items}
      </tbody>
    </table>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div class="amount-words">(${data.amountInWords || ""})</div>
      <table class="totals">
        <tr><td>รวมเป็นเงิน</td><td>${formatNumber(data.subtotal)}</td></tr>
        <tr><td>หักส่วนลด</td><td>${formatNumber(data.discount || 0)}</td></tr>
        <tr class="grand"><td>จำนวนเงินรวมทั้งสิ้น</td><td>${formatNumber(data.grandTotal)}</td></tr>
        <tr><td>จำนวนภาษีมูลค่าเพิ่ม ${data.vatRate}%</td><td>${formatNumber(data.vatAmount)}</td></tr>
        <tr><td>ราคาสินค้า</td><td>${formatNumber(data.totalBeforeVat)}</td></tr>
      </table>
    </div>

    <div class="signature">
      <div class="sig-box">
        <div class="sig-line">ผู้รับ วันที่ ____/____/____</div>
      </div>
      <div class="sig-box">
        <div style="font-size:12px;margin-bottom:4px;">ในนาม ${data.companyName}</div>
        <div class="sig-line">ผู้รับมอบอำนาจ</div>
      </div>
    </div>
  `;
}

function generateShippingPDFHtml(data) {
  const items = data.items.map((it) => `
    <tr>
      <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: center;">${it.no}</td>
      <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: left;">${it.productCode || ""}</td>
      <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: left;">${it.description}</td>
      <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: right;">${it.quantity}</td>
      <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: right;">${formatNumber(it.unitPrice)}</td>
      <td style="padding: 6px; border-bottom: 1px solid #8eb543; text-align: right;">${formatNumber(it.totalPrice)}</td>
    </tr>
  `).join("");

  // Pad items with empty rows if fewer than 9 to maintain layout structure
  const minRows = 10;
  let extraRowsHtml = "";
  if (data.items.length < minRows) {
    for (let i = data.items.length + 1; i <= minRows; i++) {
      extraRowsHtml += `
        <tr>
          <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; text-align: center; color: transparent;">${i}</td>
          <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; color: transparent;">&nbsp;</td>
          <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; color: transparent;">&nbsp;</td>
          <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; color: transparent;">&nbsp;</td>
          <td style="padding: 6px; border-right: 1px solid #8eb543; border-bottom: 1px solid #8eb543; color: transparent;">&nbsp;</td>
          <td style="padding: 6px; border-bottom: 1px solid #8eb543; color: transparent;">&nbsp;</td>
        </tr>
      `;
    }
  }

  const discountVal = Number(data.discount) || 0;
  const discountText = discountVal > 0 ? `${formatNumber(discountVal)}` : "-";

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #111; margin: 0; padding: 0; }
      @page { size: A4; margin: 12mm 15mm; }
      
      /* Main grid */
      .top-section { display: flex; justify-content: space-between; margin-bottom: 10px; }
      .left-col { width: 55%; }
      .right-col { width: 40%; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
      
      /* Typography */
      .company-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; color: #000; }
      .company-details { font-size: 12px; line-height: 1.4; color: #333; }
      
      /* Title Badge */
      .title-badge { 
        background-color: #8eb543; 
        color: white; 
        font-size: 20px; 
        font-weight: bold; 
        padding: 6px 40px; 
        border-radius: 12px; 
        text-align: center;
        display: inline-block;
        margin-bottom: 4px;
        width: 220px;
      }
      .subtitle-red { color: red; font-weight: bold; font-size: 13px; margin-bottom: 8px; text-align: center; width: 220px; }
      .tax-id-line { font-size: 12px; font-weight: bold; margin-bottom: 6px; width: 220px; text-align: left; padding-left: 10px; }
      
      /* Info box */
      .info-box { 
        border: 1px solid #8eb543; 
        border-radius: 12px; 
        padding: 8px 12px; 
        font-size: 12px; 
        text-align: left;
        width: 220px;
        line-height: 1.6;
      }
      .info-row { display: flex; justify-content: space-between; }
      .info-label { font-weight: bold; color: #000; }
      .info-value { color: #111; }
      
      /* Warning text */
      .warning-text { color: red; font-weight: bold; font-size: 12px; margin: 6px 0; }
      
      /* Customer box */
      .customer-box {
        border: 1px solid #8eb543;
        border-radius: 12px;
        padding: 8px 14px;
        margin-bottom: 12px;
        font-size: 12px;
        line-height: 1.5;
        min-height: 80px;
      }
      .customer-title { font-weight: bold; display: inline-block; margin-right: 4px; }
      
      /* Table styling */
      table.items-table { 
        width: 100%; 
        border-collapse: collapse; 
        border: 1.5px solid #8eb543; 
        font-size: 12px;
        margin-bottom: 10px;
      }
      table.items-table th { 
        border: 1px solid #8eb543; 
        padding: 8px 6px; 
        font-weight: bold; 
        color: #000;
        text-align: center;
      }
      table.items-table td {
        vertical-align: middle;
      }
      
      /* Footer sections */
      .footer-section { display: flex; justify-content: space-between; margin-bottom: 10px; }
      .remarks-box { 
        width: 60%; 
        font-size: 10px; 
        color: #333; 
        line-height: 1.4;
      }
      .remarks-title { font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #000; }
      .remarks-list { margin: 0; padding-left: 14px; }
      
      .totals-box { width: 38%; }
      .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .totals-table td { padding: 4px 0; }
      .totals-table td.label { font-weight: bold; color: #000; text-align: left; }
      .totals-table td.val { text-align: right; padding-right: 4px; }
      
      /* Grand total bar */
      .grand-total-bar {
        border: 1.5px solid #8eb543;
        background-color: #fff;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 14px;
        border-radius: 4px;
      }
      .thai-words { color: #111; }
      .net-amount { font-size: 14px; color: #000; }
      
      /* Signatures */
      .signatures-section { display: flex; justify-content: space-between; margin-top: 10px; }
      .signature-box {
        border: 1px solid #8eb543;
        border-radius: 12px;
        width: 48%;
        padding: 10px;
        text-align: center;
        font-size: 12px;
        min-height: 85px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .signature-title { font-weight: bold; text-align: left; margin-bottom: 25px; }
      .signature-line { border-bottom: 1px dotted #333; width: 70%; margin: 0 auto 4px auto; }
      .signature-date { margin-top: 4px; }
    </style>

    <div class="top-section">
      <div class="left-col">
        <img src="${AGAPE_LOGO_BASE64}" style="height: 44px; margin-bottom: 6px; display: block;" alt="agape" />
        <div class="company-name">${data.companyName}</div>
        <div class="company-details">
          ${data.companyAddress}<br/>
          <strong>โทร.</strong> ${data.companyPhone || "-"}<br/>
          E-mail: ${data.companyEmail || "-"}
        </div>
      </div>
      <div class="right-col">
        <div class="title-badge">ใบส่งสินค้า</div>
        <div class="subtitle-red">ต้นฉบับ</div>
        <div class="tax-id-line">
          <strong>เลขผู้เสียภาษี</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${data.companyTaxId}
        </div>
        <div class="info-box">
          <div class="info-row"><span class="info-label">เลขที่</span> <span class="info-value">${data.documentNumber}</span></div>
          <div class="info-row"><span class="info-label">วันที่</span> <span class="info-value">${formatDate(data.documentDate)}</span></div>
          <div class="info-row"><span class="info-label">ใบสั่งซื้อ</span> <span class="info-value">${data.poNumber || "-"}</span></div>
        </div>
      </div>
    </div>

    <div class="warning-text">ไม่ใช่ใบกำกับภาษี</div>

    <div class="customer-box">
      <div><span class="customer-title">ลูกค้า</span> ${data.customerName}</div>
      <div style="margin-left: 36px; margin-top: 2px;">
        ${data.customerAddress}<br/>
        <strong>โทร.</strong> ${data.customerPhone || "-"}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr style="border-bottom: 1.5px solid #8eb543; background: #fff;">
          <th style="width: 45px; border-right: 1px solid #8eb543;">ลำดับ</th>
          <th style="width: 100px; border-right: 1px solid #8eb543;">รหัสสินค้า</th>
          <th style="border-right: 1px solid #8eb543; text-align: left; padding-left: 10px;">รายการ</th>
          <th style="width: 75px; border-right: 1px solid #8eb543;">จำนวน</th>
          <th style="width: 90px; border-right: 1px solid #8eb543;">ราคา/หน่วย</th>
          <th style="width: 110px;">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        ${items}
        ${extraRowsHtml}
      </tbody>
    </table>

    <div class="footer-section">
      <div class="remarks-box">
        <div class="remarks-title">หมายเหตุ</div>
        <ol class="remarks-list">
          <li>กรุณาตรวจสอบสินค้า จำนวน และสภาพสินค้าให้ถูกต้องครบถ้วนก่อนลงนามรับสินค้า</li>
          <li>เมื่อลงนามรับสินค้าแล้ว บริษัทฯ จะถือว่าท่านได้รับสินค้าครบถ้วนและอยู่ในสภาพเรียบร้อย</li>
          <li>กรณีพบว่าสินค้าไม่ครบ ชำระ หรือไม่ตรงตามรายการ กรุณาแจ้งบริษัทฯ ภายใน 24 ชั่วโมง นับจากเวลารับสินค้า</li>
          <li>เอกสารฉบับนี้ใช้เป็นหลักฐานการส่งมอบสินค้า และไม่ใช่ใบเสร็จรับเงิน</li>
        </ol>
      </div>
      <div class="totals-box">
        <table class="totals-table">
          <tr>
            <td class="label">รวม</td>
            <td class="val">${formatNumber(data.subtotal)}</td>
          </tr>
          <tr>
            <td class="label">ส่วนลด 0%</td>
            <td class="val">${discountText}</td>
          </tr>
          <tr>
            <td class="label">คงเหลือ</td>
            <td class="val">${formatNumber(data.subtotal - discountVal)}</td>
          </tr>
          <tr>
            <td class="label">ภาษีมูลค่าเพิ่ม 7%</td>
            <td class="val">${formatNumber(data.vatAmount)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="grand-total-bar">
      <div class="thai-words">${data.amountInWords || ""}</div>
      <div class="net-amount">
        สุทธิ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${formatNumber(data.grandTotal)}
      </div>
    </div>

    <div class="signatures-section">
      <div class="signature-box">
        <div class="signature-title">ผู้รับสินค้า</div>
        <div>
          <div class="signature-line"></div>
          <div class="signature-date">วันที่ ........................................</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-title">ผู้ส่งสินค้า</div>
        <div>
          <div class="signature-line"></div>
          <div class="signature-date">วันที่ ........................................</div>
        </div>
      </div>
    </div>
  `;
}

// ─── POS Receipt Form Component ─────────────────────────────────────────────

const PosReceiptForm = ({ formData, setField, updateItem, addItem, removeItem }) => {
  const addOption = (itemIdx) => {
    const items = [...formData.items];
    const opts = [...(items[itemIdx].options || []), { name: "", priceAdjustment: 0 }];
    items[itemIdx] = { ...items[itemIdx], options: opts };
    setField("items", items);
  };

  const updateOption = (itemIdx, optIdx, key, value) => {
    const items = [...formData.items];
    const opts = [...(items[itemIdx].options || [])];
    opts[optIdx] = { ...opts[optIdx], [key]: value };
    items[itemIdx] = { ...items[itemIdx], options: opts };
    // Recalc item total: unitPrice + sum of option adjustments
    const optTotal = opts.reduce((s, o) => s + (Number(o.priceAdjustment) || 0), 0);
    items[itemIdx].totalPrice = ((Number(items[itemIdx].unitPrice) || 0) + optTotal) * (Number(items[itemIdx].quantity) || 1);
    setField("items", items);
  };

  const removeOption = (itemIdx, optIdx) => {
    const items = [...formData.items];
    const opts = (items[itemIdx].options || []).filter((_, i) => i !== optIdx);
    items[itemIdx] = { ...items[itemIdx], options: opts };
    const optTotal = opts.reduce((s, o) => s + (Number(o.priceAdjustment) || 0), 0);
    items[itemIdx].totalPrice = ((Number(items[itemIdx].unitPrice) || 0) + optTotal) * (Number(items[itemIdx].quantity) || 1);
    setField("items", items);
  };

  return (
    <>
      {/* Branch & Receipt Info */}
      <SectionTitle title="ข้อมูลใบเสร็จ POS" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <FormField label="ชื่อสาขา" value={formData.branchName} onChange={(v) => setField("branchName", v)} />
        <FormField label="หมายเลขการรับอาหาร" value={formData.pickupNumber} onChange={(v) => setField("pickupNumber", v)} />
        <FormField label="หมายเลขคำสั่งซื้อ" value={formData.orderNumber} onChange={(v) => setField("orderNumber", v)} />
        <FormField label="วันที่" value={formData.documentDate} onChange={(v) => setField("documentDate", v)} type="date" />
        <FormField label="SN (Device Serial)" value={formData.deviceSN} onChange={(v) => setField("deviceSN", v)} placeholder="D402P5C9J0888" />
        <FormField label="เลขที่ใบเสร็จ" value={formData.receiptNumber} onChange={(v) => setField("receiptNumber", v)} placeholder="2026000000000143" />
        <FormField label="วิธีชำระเงิน" value={formData.paymentMethod} onChange={(v) => setField("paymentMethod", v)} />
        <FormField label="ยอดชำระ" value={formData.paidAmount} onChange={(v) => setField("paidAmount", Number(v))} type="number" />
      </div>

      {/* Line Items with Options */}
      <SectionTitle title="สินค้า" />
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        {formData.items.map((item, idx) => (
          <div key={idx} style={{ border: "1px solid var(--border-default)", borderRadius: 8, padding: 12, marginBottom: 12, background: "var(--bg-secondary)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 60px 90px 90px 40px", gap: 8, alignItems: "center" }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)" }}>SKU</label>
                <input style={inputStyle} value={item.productCode || ""} onChange={(e) => updateItem(idx, "productCode", e.target.value)} placeholder="HBM01M18L" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)" }}>ชื่อสินค้า</label>
                <input style={{ ...inputStyle, width: "100%" }} value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Matcha Latte (Milk Whisk)" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)" }}>ราคา</label>
                <input style={{ ...inputStyle, width: "100%", textAlign: "right" }} type="number" value={item.unitPrice || ""} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)" }}>จำนวน</label>
                <input style={{ ...inputStyle, width: "100%", textAlign: "center" }} type="number" value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)" }}>รวม</label>
                <div style={{ padding: "6px 8px", fontWeight: 600, textAlign: "right" }}>{formatNumber(item.totalPrice)}</div>
              </div>
              <div>
                <button onClick={() => addOption(idx)} style={{ fontSize: 11, border: "1px solid var(--border-default)", background: "white", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                  + Option
                </button>
              </div>
              <div>
                {formData.items.length > 1 && (
                  <button onClick={() => removeItem(idx)} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer" }}>
                    <IconTrash size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* Options */}
            {(item.options || []).length > 0 && (
              <div style={{ marginTop: 8, paddingLeft: 16 }}>
                {item.options.map((opt, optIdx) => (
                  <div key={optIdx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>-</span>
                    <input style={{ ...inputStyle, flex: 1 }} value={opt.name} onChange={(e) => updateOption(idx, optIdx, "name", e.target.value)} placeholder="Oat Milk นมโอ๊ต" />
                    <input style={{ ...inputStyle, width: 80, textAlign: "right" }} type="number" value={opt.priceAdjustment || ""} onChange={(e) => updateOption(idx, optIdx, "priceAdjustment", Number(e.target.value))} placeholder="+20" />
                    <button onClick={() => removeOption(idx, optIdx)} style={{ border: "none", background: "none", color: "var(--red)", cursor: "pointer", fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={addItem} style={{ marginBottom: 24 }}>
        <IconPlus size={14} /> เพิ่มรายการ
      </button>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ width: 350, background: "var(--bg-secondary)", borderRadius: 8, padding: 16 }}>
          <TotalRow label="รวม" value={`${formData.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} รายการ — ${formatNumber(formData.subtotal)}`} />
          <TotalRow label="ยอดรวมส่วนลด">
            <input style={{ ...inputStyle, width: 100, textAlign: "right" }} type="number" value={formData.discount || ""} onChange={(e) => setField("discount", Number(e.target.value))} />
          </TotalRow>
          <TotalRow label="ปัดเศษ">
            <input style={{ ...inputStyle, width: 100, textAlign: "right" }} type="number" value={formData.roundingAmount || ""} onChange={(e) => setField("roundingAmount", Number(e.target.value))} step="0.01" />
          </TotalRow>
          <TotalRow label="ยอดรวม" value={formatNumber(formData.subtotal)} />
          <TotalRow label={`ภาษีมูลค่าเพิ่ม (${formData.vatRate}%)`} value={formatNumber(formData.vatAmount)} />
          <TotalRow label="ยอดรวมทั้งหมด" value={formatNumber(formData.grandTotal)} bold />
        </div>
      </div>
    </>
  );
};

// ─── POS Receipt PDF HTML Generator (Thermal 80mm format) ───────────────────

function generatePosReceiptPDFHtml(data) {
  const dt = data.documentDate ? new Date(data.documentDate) : new Date();
  const dateStr = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  const timeStr = new Date().toTimeString().slice(0, 8);
  const dateTimeStr = `${dateStr} ${timeStr}`;
  const receiptNo = data.receiptNumber || `${dt.getFullYear()}${String(Date.now()).slice(-12)}`;
  const totalQty = data.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const roundingAmt = Number(data.roundingAmount) || 0;

  const itemsHtml = data.items.map((item) => {
    const sku = item.productCode ? `${item.productCode}-` : "";
    const optionsHtml = (item.options || []).map((opt) =>
      `<div style="padding-left:8px;font-size:10px;color:#333;">- ${opt.name}${Number(opt.priceAdjustment) > 0 ? `  +${Number(opt.priceAdjustment).toFixed(2)}` : ""}</div>`
    ).join("");
    return `
      <div style="margin:4px 0;">
        <div style="font-weight:bold;font-size:11px;">${sku}${item.description}</div>
        <div style="display:flex;justify-content:space-between;">
          <span></span>
          <span style="min-width:50px;text-align:right;">${Number(item.unitPrice).toFixed(2)}</span>
          <span style="min-width:40px;text-align:center;">${item.quantity}</span>
          <span style="min-width:55px;text-align:right;">${Number(item.totalPrice).toFixed(2)}</span>
        </div>
        ${optionsHtml}
      </div>`;
  }).join("");

  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
      body { font-family: 'Sarabun', 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 3mm; color: #000; }
      @page { size: 80mm auto; margin: 0; }
      .center { text-align: center; }
      .right { text-align: right; }
      .bold { font-weight: bold; }
      .large { font-size: 16px; }
      .small { font-size: 10px; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; margin: 1px 0; }
      .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
    </style>

    <div class="center bold large">ใบเสร็จ</div>
    <div class="center" style="margin-top:4px;">Hibi Matcha Café</div>
    <div class="center bold large" style="margin:4px 0;">Hibi Matcha Cafe ${data.branchName || ""}</div>

    <div class="line"></div>

    <div>หมายเลขการรับอาหาร: ${data.pickupNumber || "001"}</div>
    <div>หมายเลขคำสั่งซื้อ: ${data.orderNumber || "0001"}</div>
    <div>วันและเวลา: ${dateTimeStr}</div>
    ${data.deviceSN ? `<div>SN:${data.deviceSN}</div>` : ""}
    <div>เลขที่ใบเสร็จ:${receiptNo}</div>

    <div class="line"></div>

    <div style="display:flex;justify-content:space-between;font-size:11px;border-bottom:1px solid #000;padding:2px 0;">
      <span style="font-weight:bold;">สินค้า</span>
      <span>ราคา</span>
      <span>จำนวน</span>
      <span>รวม</span>
    </div>

    ${itemsHtml}

    <div class="line"></div>
    <div class="row bold">
      <span>รวม</span>
      <span>${totalQty}</span>
      <span>${Number(data.subtotal).toFixed(2)}</span>
    </div>

    <div class="line"></div>

    <div class="totals-row"><span>ยอดรวมส่วนลด</span><span>${Number(data.discount) > 0 ? Number(data.discount).toFixed(2) : ""}</span></div>
    <div class="totals-row"><span>ปัดเศษ</span><span>${roundingAmt !== 0 ? roundingAmt.toFixed(2) : ""}</span></div>
    <div class="totals-row"><span>ยอดรวม</span><span>${Number(data.subtotal).toFixed(2)}</span></div>
    <div class="totals-row"><span>ภาษีมูลค่าเพิ่ม (${data.vatRate || 7}%)</span><span>${Number(data.vatAmount).toFixed(2)}</span></div>
    <div class="totals-row bold"><span>ยอดรวมทั้งหมด</span><span>${Number(data.grandTotal).toFixed(2)}</span></div>

    <div class="line"></div>

    ${roundingAmt !== 0 ? `<div class="totals-row"><span></span><span>${(Number(data.grandTotal) + roundingAmt).toFixed(2)}</span></div>` : ""}
    <div class="totals-row"><span></span><span>${Number(data.grandTotal).toFixed(2)}</span></div>

    <div class="line"></div>

    <div>ประเภทการชำระเงิน</div>
    <div>${data.paymentMethod || "เงินสด"}</div>
    <div class="row"><span>ยอดชำระ</span><span>${data.paymentMethod || "เงินสด"}</span></div>
    <div class="right">${Number(data.paidAmount || data.grandTotal).toFixed(2)}</div>
    <div class="right bold large">${Number(data.grandTotal).toFixed(2)}</div>

    <div class="line"></div>
    <div class="center small">${data.branchName || ""}</div>
  `;
}
