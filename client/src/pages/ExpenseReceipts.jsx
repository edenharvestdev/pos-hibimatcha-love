// ============================================
// ExpenseReceipts: Manage bills/receipts from external vendors (Makro, Shopee, etc.)
// Redesigned with the same design system as Dashboard (page/card/btn CSS classes)
// ============================================

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Modal } from "@/components";
import { ImageUploader } from "@/components/ImageUploader";
import { IconReceipt, IconPlus, IconX, IconCheck, IconSearch, IconFilter, IconTrash, IconEdit, IconWallet, IconCoin, IconTag } from "@/icons";

const VENDOR_PRESETS = [
  "Makro", "Shopee", "Lazada", "LINE Shopping",
  "Big C", "Lotus's", "7-Eleven", "Tops", "อื่นๆ",
];

const CATEGORY_OPTIONS = [
  { value: "ingredients",  label: "วัตถุดิบ",       labelEn: "Ingredients", color: "#059669", bg: "#d1fae5" },
  { value: "packaging",    label: "บรรจุภัณฑ์",     labelEn: "Packaging",   color: "#2563eb", bg: "#dbeafe" },
  { value: "equipment",    label: "อุปกรณ์",         labelEn: "Equipment",   color: "#7c3aed", bg: "#ede9fe" },
  { value: "cleaning",     label: "ทำความสะอาด",   labelEn: "Cleaning",    color: "#0891b2", bg: "#cffafe" },
  { value: "utilities",    label: "สาธารณูปโภค",   labelEn: "Utilities",   color: "#d97706", bg: "#fef3c7" },
  { value: "marketing",    label: "การตลาด",        labelEn: "Marketing",   color: "#db2777", bg: "#fce7f3" },
  { value: "delivery_fee", label: "ค่าส่ง",         labelEn: "Delivery",    color: "#ea580c", bg: "#ffedd5" },
  { value: "other",        label: "อื่นๆ",           labelEn: "Other",       color: "#6b7280", bg: "#f3f4f6" },
];

const PAYMENT_OPTIONS = [
  { value: "cash",           label: "เงินสด" },
  { value: "transfer",       label: "โอนเงิน" },
  { value: "credit_card",    label: "บัตรเครดิต" },
  { value: "corporate_card", label: "บัตรองค์กร" },
  { value: "cod",            label: "เก็บเงินปลายทาง" },
  { value: "other",          label: "อื่นๆ" },
];

const STATUS_OPTIONS = [
  { value: "",          label: "ทั้งหมด" },
  { value: "draft",     label: "แบบร่าง" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "voided",    label: "ยกเลิก" },
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(v) {
  if (!v && v !== 0) return "0.00";
  return Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoryInfo(value) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

// ─── Status badge styles ─────────────────────────────────────────────────────
const STATUS_STYLES = {
  draft:     { bg: "#fef3c7", color: "#92400e", label: "แบบร่าง" },
  confirmed: { bg: "#d1fae5", color: "#065f46", label: "ยืนยัน" },
  voided:    { bg: "#fee2e2", color: "#991b1b", label: "ยกเลิก" },
};

export default function ExpenseReceipts() {
  const { branch, lang } = useApp();
  const toast = useToast();
  const branchId = branch?.id;

  const [filterVendor, setFilterVendor]     = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [searchText, setSearchText]         = useState("");
  const [showForm, setShowForm]             = useState(false);
  const [editingId, setEditingId]           = useState(null);
  const [showSummary, setShowSummary]       = useState(false);
  const [showFilters, setShowFilters]       = useState(false);

  const listQuery = trpc.expenseReceipts.list.useQuery({
    branchId: branchId || undefined,
    vendor:   filterVendor   || undefined,
    category: filterCategory || undefined,
    status:   filterStatus   || undefined,
  });

  const summaryQuery = trpc.expenseReceipts.summary.useQuery({ branchId: branchId || undefined });

  const receipts = listQuery.data?.receipts || [];
  const total    = listQuery.data?.total    || 0;
  const summary  = summaryQuery.data;

  const filteredReceipts = useMemo(() => {
    if (!searchText.trim()) return receipts;
    const q = searchText.toLowerCase();
    return receipts.filter((r) =>
      r.vendor?.toLowerCase().includes(q) ||
      r.receiptNumber?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  }, [receipts, searchText]);

  const thisMonthTotal  = parseFloat(summary?.total || "0");
  const confirmedCount  = receipts.filter((r) => r.status === "confirmed").length;
  const draftCount      = receipts.filter((r) => r.status === "draft").length;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">🧾 ใบเสร็จค่าใช้จ่าย</h1>
            <p className="page-desc">
              {lang === "en"
                ? `Record bills from external vendors (Makro, Shopee, etc.) — ${total} entries`
                : `บันทึกบิล/ใบเสร็จจากร้านค้าภายนอก — ${total} รายการ`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowSummary(true)}>
              💰 {lang === "en" ? "Summary" : "สรุป"}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingId(null); setShowForm(true); }}
            >
              <IconPlus size={16} /> {lang === "en" ? "New Expense" : "เพิ่มบิล"}
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="t-caption" style={{ color: "var(--matcha-700)" }}>ยอดรวม (ยืนยันแล้ว)</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
            ฿{formatMoney(thisMonthTotal)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{confirmedCount} รายการ</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="t-caption">แบบร่าง (รอยืนยัน)</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: "var(--warning)" }}>
            {draftCount}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>รอตรวจสอบ</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="t-caption">จำนวนบิลทั้งหมด</div>
          <div className="tabular" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{total}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>ทั้งหมด</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div className="t-caption" style={{ marginBottom: 10 }}>แยกตามหมวดหมู่</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {summary.byCategory.map((c, i) => {
              const cat = getCategoryInfo(c.category);
              return (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: cat.bg, color: cat.color,
                }}>
                  {lang === "en" ? cat.labelEn : cat.label}
                  <span style={{ opacity: 0.7 }}>฿{formatMoney(c.total)}</span>
                  <span style={{ opacity: 0.5 }}>({c.count})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter Bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <IconSearch size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={lang === "en" ? "Search vendor, receipt no..." : "ค้นหาร้านค้า, เลขบิล..."}
            style={{
              width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
              border: "1px solid var(--border-default)", borderRadius: "var(--r-default)",
              fontSize: 14, background: "var(--bg-surface)", color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>
        <button
          className={showFilters ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          onClick={() => setShowFilters(!showFilters)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <IconFilter size={15} />
          {lang === "en" ? "Filters" : "ตัวกรอง"}
          {(filterVendor || filterCategory || filterStatus) && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--matcha-400)", display: "inline-block" }} />
          )}
        </button>
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--r-default)", fontSize: 13, background: "var(--bg-surface)" }}
          >
            <option value="">ร้านค้าทั้งหมด</option>
            {VENDOR_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--r-default)", fontSize: 13, background: "var(--bg-surface)" }}
          >
            <option value="">หมวดหมู่ทั้งหมด</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{lang === "en" ? c.labelEn : c.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--border-default)", borderRadius: "var(--r-default)", fontSize: 13, background: "var(--bg-surface)" }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(filterVendor || filterCategory || filterStatus) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterVendor(""); setFilterCategory(""); setFilterStatus(""); }}
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      )}

      {/* Table / Empty State */}
      {filteredReceipts.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
          <div className="t-h4" style={{ marginBottom: 6 }}>ยังไม่มีบิล/ใบเสร็จ</div>
          <div className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
            {lang === "en"
              ? "Click 'New Expense' to record a receipt from an external vendor"
              : "กดปุ่ม 'เพิ่มบิล' เพื่อบันทึกใบเสร็จจากร้านค้าภายนอก"}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { setEditingId(null); setShowForm(true); }}
          >
            <IconPlus size={16} /> เพิ่มบิล
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-muted)" }}>
                  {["วันที่", "ร้านค้า", "เลขที่บิล", "หมวดหมู่", "รูป", "ยอดรวม", "สถานะ", ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "10px 14px", textAlign: i >= 5 ? (i === 5 ? "right" : "center") : "left",
                      fontWeight: 600, fontSize: 11, color: "var(--text-tertiary)",
                      textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((r, idx) => {
                  const cat = getCategoryInfo(r.category);
                  const st  = STATUS_STYLES[r.status] || { bg: "#f3f4f6", color: "#374151", label: r.status };
                  return (
                    <tr
                      key={r.id}
                      onClick={() => { setEditingId(r.id); setShowForm(true); }}
                      style={{
                        borderBottom: "1px solid var(--border-default)",
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = ""}
                    >
                      <td style={{ padding: "12px 14px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                        {formatDate(r.receiptDate)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 500 }}>{r.vendor}</div>
                        {r.vendorBranch && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{r.vendorBranch}</div>}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-tertiary)", fontFamily: "monospace", fontSize: 12 }}>
                        {r.receiptNumber || "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 12,
                          fontSize: 11, fontWeight: 600, background: cat.bg, color: cat.color,
                        }}>
                          {lang === "en" ? cat.labelEn : cat.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {r.receiptImageUrl ? (
                          <div style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border-default)" }}>
                            <img src={r.receiptImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-quaternary)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        ฿{formatMoney(r.grandTotal)}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 12,
                          fontSize: 11, fontWeight: 600, background: st.bg, color: st.color,
                        }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setEditingId(r.id); setShowForm(true); }}
                          style={{ padding: "4px 8px" }}
                        >
                          <IconEdit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Drawer */}
      {showForm && (
        <ExpenseReceiptForm
          receiptId={editingId}
          branchId={branchId}
          lang={lang}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { listQuery.refetch(); summaryQuery.refetch(); }}
        />
      )}

      {/* Summary Modal */}
      {showSummary && (
        <ExpenseSummaryModal
          data={summary}
          lang={lang}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}

// ─── Form Drawer ─────────────────────────────────────────────────────────────

function ExpenseReceiptForm({ receiptId, branchId, lang, onClose, onSaved }) {
  const toast  = useToast();
  const isEdit = !!receiptId;

  const existingQuery = trpc.expenseReceipts.getById.useQuery({ id: receiptId }, { enabled: isEdit });
  const createMut     = trpc.expenseReceipts.create.useMutation();
  const updateMut     = trpc.expenseReceipts.update.useMutation();
  const deleteMut     = trpc.expenseReceipts.delete.useMutation();

  const [form, setForm]     = useState(() => defaultForm());
  const [items, setItems]   = useState([defaultItem()]);
  const [loaded, setLoaded] = useState(false);
  const [imgErr, setImgErr] = useState("");

  React.useEffect(() => {
    if (isEdit && existingQuery.data && !loaded) {
      const r = existingQuery.data;
      setForm({
        vendor: r.vendor || "", vendorBranch: r.vendorBranch || "",
        receiptNumber: r.receiptNumber || "",
        receiptDate: r.receiptDate ? new Date(r.receiptDate).toISOString().split("T")[0] : "",
        category: r.category || "ingredients", paymentMethod: r.paymentMethod || "transfer",
        subtotal: r.subtotal || "0", vatAmount: r.vatAmount || "0",
        discountAmount: r.discountAmount || "0", deliveryFee: r.deliveryFee || "0",
        grandTotal: r.grandTotal || "0", receiptImageUrl: r.receiptImageUrl || "",
        notes: r.notes || "", status: r.status || "draft",
      });
      if (r.items?.length > 0) {
        setItems(r.items.map((i) => ({
          itemName: i.itemName, quantity: i.quantity, unit: i.unit || "",
          unitPrice: i.unitPrice, totalPrice: i.totalPrice, category: i.category || "", notes: i.notes || "",
        })));
      }
      setLoaded(true);
    }
  }, [existingQuery.data, isEdit, loaded]);

  function defaultForm() {
    return {
      vendor: "", vendorBranch: "", receiptNumber: "",
      receiptDate: new Date().toISOString().split("T")[0],
      category: "ingredients", paymentMethod: "transfer",
      subtotal: "0", vatAmount: "0", discountAmount: "0", deliveryFee: "0",
      grandTotal: "0", receiptImageUrl: "", notes: "", status: "draft",
    };
  }

  function defaultItem() {
    return { itemName: "", quantity: "1", unit: "", unitPrice: "0", totalPrice: "0", category: "", notes: "" };
  }

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const q = parseFloat(next[idx].quantity) || 0;
        const p = parseFloat(next[idx].unitPrice)  || 0;
        next[idx].totalPrice = (q * p).toFixed(2);
      }
      return next;
    });
  }

  React.useEffect(() => {
    const subtotal  = items.reduce((s, i) => s + (parseFloat(i.totalPrice) || 0), 0);
    const vat       = parseFloat(form.vatAmount)       || 0;
    const discount  = parseFloat(form.discountAmount)  || 0;
    const delivery  = parseFloat(form.deliveryFee)     || 0;
    setForm((p) => ({ ...p, subtotal: subtotal.toFixed(2), grandTotal: (subtotal + vat - discount + delivery).toFixed(2) }));
  }, [items, form.vatAmount, form.discountAmount, form.deliveryFee]);

  async function handleSave() {
    if (!form.vendor) { toast.error("กรุณาเลือกร้านค้า"); return; }
    if (!items[0]?.itemName) { toast.error("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ"); return; }
    if (!form.receiptImageUrl) { setImgErr("กรุณาแนบรูปใบเสร็จ"); toast.error("กรุณาแนบรูปใบเสร็จ (บังคับ)"); return; }
    setImgErr("");
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: receiptId, data: { ...form, branchId: branchId || 1, items } });
        toast.success("อัพเดทบิลเรียบร้อย");
      } else {
        await createMut.mutateAsync({ ...form, branchId: branchId || 1, items });
        toast.success("บันทึกบิลเรียบร้อย");
      }
      onSaved(); onClose();
    } catch (err) { toast.error("เกิดข้อผิดพลาด: " + (err?.message || "Unknown")); }
  }

  async function handleDelete() {
    if (!confirm("ต้องการลบบิลนี้?")) return;
    try {
      await deleteMut.mutateAsync({ id: receiptId });
      toast.success("ลบบิลเรียบร้อย"); onSaved(); onClose();
    } catch { toast.error("ลบไม่สำเร็จ"); }
  }

  async function handleConfirm() {
    if (!form.receiptImageUrl) { setImgErr("กรุณาแนบรูปใบเสร็จก่อนยืนยัน"); return; }
    try {
      await updateMut.mutateAsync({ id: receiptId, data: { status: "confirmed" } });
      toast.success("ยืนยันบิลเรียบร้อย"); onSaved(); onClose();
    } catch { toast.error("ยืนยันไม่สำเร็จ"); }
  }

  // Input / label style shortcuts
  const inp = {
    width: "100%", padding: "8px 10px",
    border: "1px solid var(--border-default)", borderRadius: "var(--r-default)",
    fontSize: 13, background: "var(--bg-surface)", color: "var(--text-primary)", outline: "none",
  };

  if (isEdit && existingQuery.isLoading) {
    return (
      <Drawer open onClose={onClose} title="กำลังโหลด..." width={820}>
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-tertiary)" }}>
          กำลังโหลดข้อมูล...
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open onClose={onClose}
      title={isEdit ? "แก้ไขบิล" : "เพิ่มบิลใหม่"}
      width={820}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Receipt Image */}
        <div style={{
          padding: 16, borderRadius: "var(--r-default)",
          border: `2px dashed ${imgErr ? "#f87171" : "var(--border-default)"}`,
          background: imgErr ? "rgba(254,226,226,0.3)" : "var(--bg-muted)",
        }}>
          <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 13 }}>
            รูปใบเสร็จ <span style={{ color: "#ef4444" }}>*</span>
            <span style={{ fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 6 }}>(บังคับ)</span>
          </div>
          <ImageUploader
            value={form.receiptImageUrl}
            onChange={(url) => { setForm((f) => ({ ...f, receiptImageUrl: url })); setImgErr(""); }}
            label=""
          />
          {imgErr && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 6, fontWeight: 500 }}>{imgErr}</div>}
        </div>

        {/* Vendor + Branch */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              ร้านค้า <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} style={inp}>
              <option value="">เลือกร้านค้า...</option>
              {VENDOR_PRESETS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>สาขา</label>
            <input type="text" value={form.vendorBranch} onChange={(e) => setForm((f) => ({ ...f, vendorBranch: e.target.value }))} placeholder="เช่น สาขาลาดพร้าว" style={inp} />
          </div>
        </div>

        {/* Receipt No + Date + Category */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>เลขที่บิล</label>
            <input type="text" value={form.receiptNumber} onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))} placeholder="เลขที่ใบเสร็จ" style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
              วันที่ <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input type="date" value={form.receiptDate} onChange={(e) => setForm((f) => ({ ...f, receiptDate: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>หมวดหมู่</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inp}>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{lang === "en" ? c.labelEn : c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Payment + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>วิธีชำระเงิน</label>
            <select value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} style={inp}>
              {PAYMENT_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>หมายเหตุ</label>
            <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="หมายเหตุเพิ่มเติม" style={inp} />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>รายการสินค้า</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setItems((p) => [...p, defaultItem()])} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <IconPlus size={14} /> เพิ่มรายการ
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "4fr 2fr 1.5fr 2fr 2fr 0.5fr", gap: 6, padding: "0 4px", marginBottom: 6 }}>
            {["สินค้า", "จำนวน", "หน่วย", "ราคา/หน่วย", "รวม", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textAlign: i > 0 ? "center" : "left" }}>{h}</div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                display: "grid", gridTemplateColumns: "4fr 2fr 1.5fr 2fr 2fr 0.5fr",
                gap: 6, alignItems: "center", padding: 10,
                background: "var(--bg-muted)", borderRadius: "var(--r-default)",
                border: "1px solid var(--border-default)",
              }}>
                <input type="text" value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} placeholder="ชื่อสินค้า" style={inp} />
                <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} style={{ ...inp, textAlign: "center" }} />
                <input type="text" value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} placeholder="หน่วย" style={{ ...inp, textAlign: "center" }} />
                <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} style={{ ...inp, textAlign: "right" }} />
                <div style={{ textAlign: "right", fontWeight: 600, fontFamily: "monospace", fontSize: 13 }}>฿{formatMoney(item.totalPrice)}</div>
                <div style={{ textAlign: "center" }}>
                  {items.length > 1 && (
                    <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 4 }}>
                      <IconX size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="card" style={{ padding: 16 }}>
          {[
            ["ยอดรวมสินค้า", <span className="tabular" style={{ fontWeight: 600 }}>฿{formatMoney(form.subtotal)}</span>],
          ].map(([label, val], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>{val}
            </div>
          ))}
          {[
            ["VAT (ถ้ามี)", "vatAmount"],
            ["ส่วนลด",       "discountAmount"],
            ["ค่าจัดส่ง",    "deliveryFee"],
          ].map(([label, key]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              <input
                type="number" value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ ...inp, width: 110, textAlign: "right" }}
              />
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>ยอดรวมทั้งหมด</span>
            <span className="tabular" style={{ fontWeight: 700, fontSize: 22, color: "var(--matcha-600)" }}>฿{formatMoney(form.grandTotal)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}
          >
            {createMut.isPending || updateMut.isPending ? "กำลังบันทึก..." : isEdit ? "อัพเดท" : "บันทึก"}
          </button>
          {isEdit && form.status === "draft" && (
            <button className="btn btn-secondary" onClick={handleConfirm} style={{ display: "flex", alignItems: "center", gap: 6, background: "#059669", color: "#fff", border: "none" }}>
              <IconCheck size={15} /> ยืนยัน
            </button>
          )}
          {isEdit && (
            <button className="btn btn-ghost" onClick={handleDelete} disabled={deleteMut.isPending} style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 6 }}>
              <IconTrash size={15} /> ลบ
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─── Summary Modal ────────────────────────────────────────────────────────────

function ExpenseSummaryModal({ data, lang, onClose }) {
  if (!data) return null;
  return (
    <Modal open onClose={onClose} title="สรุปค่าใช้จ่าย (ยืนยันแล้ว)" width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{
          textAlign: "center", background: "var(--matcha-50,#f0fdf4)",
          borderRadius: "var(--r-default)", padding: "32px 24px",
          border: "1px solid var(--matcha-100,#dcfce7)",
        }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>ค่าใช้จ่ายรวมทั้งหมด</div>
          <div className="tabular" style={{ fontSize: 40, fontWeight: 700, color: "var(--matcha-600)" }}>
            ฿{formatMoney(data.total)}
          </div>
        </div>

        {data.byVendor?.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              แยกตามร้านค้า
            </div>
            {data.byVendor.map((v, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: "var(--r-default)", marginBottom: 4, background: "var(--bg-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-subtle)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: "var(--text-secondary)" }}>
                    {v.vendor?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{v.vendor}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{v.count} บิล</div>
                  </div>
                </div>
                <div className="tabular" style={{ fontWeight: 600, fontSize: 13 }}>฿{formatMoney(v.total)}</div>
              </div>
            ))}
          </div>
        )}

        {data.byCategory?.length > 0 && (
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              แยกตามหมวดหมู่
            </div>
            {data.byCategory.map((c, i) => {
              const cat = getCategoryInfo(c.category);
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--r-default)", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: cat.bg, color: cat.color }}>
                      {lang === "en" ? cat.labelEn : cat.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.count} บิล</span>
                  </div>
                  <div className="tabular" style={{ fontWeight: 600, fontSize: 13 }}>฿{formatMoney(c.total)}</div>
                </div>
              );
            })}
          </div>
        )}

        {!data.byVendor?.length && !data.byCategory?.length && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
            <div style={{ fontSize: 13 }}>ยังไม่มีบิลที่ยืนยันแล้ว</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
