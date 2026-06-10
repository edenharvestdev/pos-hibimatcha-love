// ============================================
// ExpenseReceipts: Manage bills/receipts from external vendors (Makro, Shopee, etc.)
// Redesigned with stat cards, beautiful table, receipt image upload, monthly breakdown
// ============================================

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Modal } from "@/components";
import { ImageUploader } from "@/components/ImageUploader";
import { IconReceipt, IconPlus, IconX, IconCheck, IconSearch, IconFilter, IconExport, IconTrash, IconEdit, IconWallet, IconCoin, IconTag } from "@/icons";

const VENDOR_PRESETS = [
  "Makro",
  "Shopee",
  "Lazada",
  "LINE Shopping",
  "Big C",
  "Lotus's",
  "7-Eleven",
  "Tops",
  "อื่นๆ",
];

const CATEGORY_OPTIONS = [
  { value: "ingredients", label: "วัตถุดิบ", labelEn: "Ingredients", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  { value: "packaging", label: "บรรจุภัณฑ์", labelEn: "Packaging", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { value: "equipment", label: "อุปกรณ์", labelEn: "Equipment", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { value: "cleaning", label: "ทำความสะอาด", labelEn: "Cleaning", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300" },
  { value: "utilities", label: "สาธารณูปโภค", labelEn: "Utilities", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { value: "marketing", label: "การตลาด", labelEn: "Marketing", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
  { value: "delivery_fee", label: "ค่าส่ง", labelEn: "Delivery", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "other", label: "อื่นๆ", labelEn: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" },
];

const PAYMENT_OPTIONS = [
  { value: "cash", label: "เงินสด" },
  { value: "transfer", label: "โอนเงิน" },
  { value: "credit_card", label: "บัตรเครดิต" },
  { value: "corporate_card", label: "บัตรองค์กร" },
  { value: "cod", label: "เก็บเงินปลายทาง" },
  { value: "other", label: "อื่นๆ" },
];

const STATUS_OPTIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "draft", label: "แบบร่าง" },
  { value: "confirmed", label: "ยืนยันแล้ว" },
  { value: "voided", label: "ยกเลิก" },
];

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(v) {
  if (!v && v !== 0) return "0.00";
  return Number(v).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoryInfo(value) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

export default function ExpenseReceipts() {
  const { branch, lang, t } = useApp();
  const toast = useToast();
  const branchId = branch?.id;

  const [filterVendor, setFilterVendor] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Queries
  const listQuery = trpc.expenseReceipts.list.useQuery({
    branchId: branchId || undefined,
    vendor: filterVendor || undefined,
    category: filterCategory || undefined,
    status: filterStatus || undefined,
  });

  const summaryQuery = trpc.expenseReceipts.summary.useQuery({
    branchId: branchId || undefined,
  });

  const receipts = listQuery.data?.receipts || [];
  const total = listQuery.data?.total || 0;
  const summary = summaryQuery.data;

  // Filter by search text
  const filteredReceipts = useMemo(() => {
    if (!searchText.trim()) return receipts;
    const q = searchText.toLowerCase();
    return receipts.filter(
      (r) =>
        r.vendor?.toLowerCase().includes(q) ||
        r.receiptNumber?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
    );
  }, [receipts, searchText]);

  // Stats
  const thisMonthTotal = parseFloat(summary?.total || "0");
  const confirmedCount = receipts.filter((r) => r.status === "confirmed").length;
  const draftCount = receipts.filter((r) => r.status === "draft").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {lang === "en" ? "Expense Receipts" : "ใบเสร็จค่าใช้จ่าย"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "en"
              ? `Record bills from external vendors (Makro, Shopee, etc.) — ${total} entries`
              : `บันทึกบิล/ใบเสร็จจากร้านค้าภายนอก — ${total} รายการ`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSummary(true)}
            className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-accent transition-all duration-150 active:scale-[0.97] flex items-center gap-2"
          >
            <IconCoin className="w-4 h-4" />
            {lang === "en" ? "Summary" : "สรุป"}
          </button>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all duration-150 active:scale-[0.97] shadow-sm"
          >
            <IconPlus className="w-4 h-4" />
            {lang === "en" ? "New Expense" : "เพิ่มบิล"}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<IconWallet className="w-5 h-5" />}
          iconBg="bg-primary/10 text-primary"
          label={lang === "en" ? "Total Confirmed" : "ยอดรวม (ยืนยันแล้ว)"}
          value={<><span className="font-sans">฿</span>{formatMoney(thisMonthTotal)}</>}
          sub={`${confirmedCount} ${lang === "en" ? "receipts" : "รายการ"}`}
        />
        <StatCard
          icon={<IconReceipt className="w-5 h-5" />}
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
          label={lang === "en" ? "Pending Draft" : "แบบร่าง (รอยืนยัน)"}
          value={draftCount.toString()}
          sub={lang === "en" ? "awaiting confirmation" : "รอตรวจสอบ"}
        />
        <StatCard
          icon={<IconTag className="w-5 h-5" />}
          iconBg="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300"
          label={lang === "en" ? "Total Entries" : "จำนวนบิลทั้งหมด"}
          value={total.toString()}
          sub={lang === "en" ? "all time" : "ทั้งหมด"}
        />
      </div>

      {/* Category Breakdown (mini) */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            {lang === "en" ? "By Category" : "แยกตามหมวดหมู่"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.byCategory.map((c, i) => {
              const cat = getCategoryInfo(c.category);
              return (
                <div key={i} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${cat.color}`}>
                  <span>{lang === "en" ? cat.labelEn : cat.label}</span>
                  <span className="opacity-70"><span className="font-sans">฿</span>{formatMoney(c.total)}</span>
                  <span className="opacity-50">({c.count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={lang === "en" ? "Search vendor, receipt no..." : "ค้นหาร้านค้า, เลขบิล..."}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2.5 border rounded-xl text-sm flex items-center gap-2 transition-all duration-150 active:scale-[0.97] ${showFilters ? "bg-primary/10 border-primary text-primary" : "border-border hover:bg-accent"}`}
        >
          <IconFilter className="w-4 h-4" />
          {lang === "en" ? "Filters" : "ตัวกรอง"}
          {(filterVendor || filterCategory || filterStatus) && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border border-border animate-in slide-in-from-top-2 duration-200">
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background min-w-[140px]"
          >
            <option value="">{lang === "en" ? "All Vendors" : "ร้านค้าทั้งหมด"}</option>
            {VENDOR_PRESETS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background min-w-[140px]"
          >
            <option value="">{lang === "en" ? "All Categories" : "หมวดหมู่ทั้งหมด"}</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{lang === "en" ? c.labelEn : c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background min-w-[120px]"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(filterVendor || filterCategory || filterStatus) && (
            <button
              onClick={() => { setFilterVendor(""); setFilterCategory(""); setFilterStatus(""); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "en" ? "Clear all" : "ล้างตัวกรอง"}
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {filteredReceipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <IconReceipt className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {lang === "en" ? "No expense receipts" : "ยังไม่มีบิล/ใบเสร็จ"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === "en"
              ? "Click 'New Expense' to record a receipt from an external vendor"
              : "กดปุ่ม 'เพิ่มบิล' เพื่อบันทึกใบเสร็จจากร้านค้าภายนอก"}
          </p>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97]"
          >
            <IconPlus className="w-4 h-4" />
            {lang === "en" ? "New Expense" : "เพิ่มบิล"}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Date" : "วันที่"}
                  </th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Vendor" : "ร้านค้า"}
                  </th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Receipt No." : "เลขที่บิล"}
                  </th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Category" : "หมวดหมู่"}
                  </th>
                  <th className="text-left px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Image" : "รูป"}
                  </th>
                  <th className="text-right px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Amount" : "ยอดรวม"}
                  </th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Status" : "สถานะ"}
                  </th>
                  <th className="text-center px-4 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {lang === "en" ? "Action" : "จัดการ"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReceipts.map((r) => {
                  const cat = getCategoryInfo(r.category);
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors duration-100 cursor-pointer" onClick={() => { setEditingId(r.id); setShowForm(true); }}>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatDate(r.receiptDate)}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium">{r.vendor}</div>
                        {r.vendorBranch && <div className="text-xs text-muted-foreground">{r.vendorBranch}</div>}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">{r.receiptNumber || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${cat.color}`}>
                          {lang === "en" ? cat.labelEn : cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {r.receiptImageUrl ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border">
                            <img src={r.receiptImageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-medium whitespace-nowrap">
                        <span className="font-sans">฿</span>{formatMoney(r.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setEditingId(r.id); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title={lang === "en" ? "Edit" : "แก้ไข"}
                        >
                          <IconEdit className="w-4 h-4 text-muted-foreground" />
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

// ─── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:shadow-sm transition-shadow duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    voided: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const labels = { draft: "แบบร่าง", confirmed: "ยืนยัน", voided: "ยกเลิก" };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {labels[status] || status}
    </span>
  );
}

// ─── Expense Receipt Form (Drawer) ───────────────────────────────────────────

function ExpenseReceiptForm({ receiptId, branchId, lang, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!receiptId;

  // Fetch existing receipt if editing
  const existingQuery = trpc.expenseReceipts.getById.useQuery(
    { id: receiptId },
    { enabled: isEdit }
  );

  const createMut = trpc.expenseReceipts.create.useMutation();
  const updateMut = trpc.expenseReceipts.update.useMutation();
  const deleteMut = trpc.expenseReceipts.delete.useMutation();

  const [form, setForm] = useState(() => getDefaultForm());
  const [items, setItems] = useState([getDefaultItem()]);
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState("");

  // Load existing data
  React.useEffect(() => {
    if (isEdit && existingQuery.data && !loaded) {
      const r = existingQuery.data;
      setForm({
        vendor: r.vendor || "",
        vendorBranch: r.vendorBranch || "",
        receiptNumber: r.receiptNumber || "",
        receiptDate: r.receiptDate ? new Date(r.receiptDate).toISOString().split("T")[0] : "",
        category: r.category || "ingredients",
        paymentMethod: r.paymentMethod || "transfer",
        subtotal: r.subtotal || "0",
        vatAmount: r.vatAmount || "0",
        discountAmount: r.discountAmount || "0",
        deliveryFee: r.deliveryFee || "0",
        grandTotal: r.grandTotal || "0",
        receiptImageUrl: r.receiptImageUrl || "",
        notes: r.notes || "",
        status: r.status || "draft",
      });
      if (r.items && r.items.length > 0) {
        setItems(r.items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit || "",
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          category: i.category || "",
          notes: i.notes || "",
        })));
      }
      setLoaded(true);
    }
  }, [existingQuery.data, isEdit, loaded]);

  function getDefaultForm() {
    return {
      vendor: "",
      vendorBranch: "",
      receiptNumber: "",
      receiptDate: new Date().toISOString().split("T")[0],
      category: "ingredients",
      paymentMethod: "transfer",
      subtotal: "0",
      vatAmount: "0",
      discountAmount: "0",
      deliveryFee: "0",
      grandTotal: "0",
      receiptImageUrl: "",
      notes: "",
      status: "draft",
    };
  }

  function getDefaultItem() {
    return { itemName: "", quantity: "1", unit: "", unitPrice: "0", totalPrice: "0", category: "", notes: "" };
  }

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        const qty = parseFloat(next[idx].quantity) || 0;
        const price = parseFloat(next[idx].unitPrice) || 0;
        next[idx].totalPrice = (qty * price).toFixed(2);
      }
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, getDefaultItem()]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Recalculate totals
  React.useEffect(() => {
    const subtotal = items.reduce((sum, i) => sum + (parseFloat(i.totalPrice) || 0), 0);
    const vat = parseFloat(form.vatAmount) || 0;
    const discount = parseFloat(form.discountAmount) || 0;
    const delivery = parseFloat(form.deliveryFee) || 0;
    const grand = subtotal + vat - discount + delivery;
    setForm((prev) => ({
      ...prev,
      subtotal: subtotal.toFixed(2),
      grandTotal: grand.toFixed(2),
    }));
  }, [items, form.vatAmount, form.discountAmount, form.deliveryFee]);

  async function handleSave() {
    if (!form.vendor) {
      toast.error(lang === "en" ? "Please select a vendor" : "กรุณาเลือกร้านค้า");
      return;
    }
    if (items.length === 0 || !items[0].itemName) {
      toast.error(lang === "en" ? "Please add at least 1 item" : "กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }
    // Mandatory receipt image
    if (!form.receiptImageUrl) {
      setImageError(lang === "en" ? "Receipt image is required" : "กรุณาแนบรูปใบเสร็จ");
      toast.error(lang === "en" ? "Please attach a receipt image" : "กรุณาแนบรูปใบเสร็จ (บังคับ)");
      return;
    }
    setImageError("");

    try {
      if (isEdit) {
        await updateMut.mutateAsync({
          id: receiptId,
          data: { ...form, branchId: branchId || 1, items },
        });
        toast.success(lang === "en" ? "Expense updated" : "อัพเดทบิลเรียบร้อย");
      } else {
        await createMut.mutateAsync({
          ...form,
          branchId: branchId || 1,
          items,
        });
        toast.success(lang === "en" ? "Expense saved" : "บันทึกบิลเรียบร้อย");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((lang === "en" ? "Error: " : "เกิดข้อผิดพลาด: ") + (err?.message || "Unknown error"));
    }
  }

  async function handleDelete() {
    if (!confirm(lang === "en" ? "Delete this expense?" : "ต้องการลบบิลนี้?")) return;
    try {
      await deleteMut.mutateAsync({ id: receiptId });
      toast.success(lang === "en" ? "Deleted" : "ลบบิลเรียบร้อย");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(lang === "en" ? "Delete failed" : "ลบไม่สำเร็จ");
    }
  }

  async function handleConfirm() {
    if (!form.receiptImageUrl) {
      setImageError(lang === "en" ? "Receipt image is required before confirming" : "กรุณาแนบรูปใบเสร็จก่อนยืนยัน");
      toast.error(lang === "en" ? "Please attach receipt image first" : "กรุณาแนบรูปใบเสร็จก่อนยืนยัน");
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: receiptId,
        data: { status: "confirmed" },
      });
      toast.success(lang === "en" ? "Confirmed" : "ยืนยันบิลเรียบร้อย");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(lang === "en" ? "Confirm failed" : "ยืนยันไม่สำเร็จ");
    }
  }

  if (isEdit && existingQuery.isLoading) {
    return (
      <Drawer open onClose={onClose} title={lang === "en" ? "Loading..." : "กำลังโหลด..."}>
        <div className="p-8 text-center text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {lang === "en" ? "Loading data..." : "กำลังโหลดข้อมูล..."}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title={isEdit ? (lang === "en" ? "Edit Expense" : "แก้ไขบิล") : (lang === "en" ? "New Expense" : "เพิ่มบิลใหม่")} width={800}>
      <div className="space-y-6 p-1">
        {/* Receipt Image Upload (Mandatory) */}
        <div className={`p-4 rounded-xl border-2 border-dashed transition-colors ${imageError ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-border bg-muted/20"}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold">
              {lang === "en" ? "Receipt Image" : "รูปใบเสร็จ"} <span className="text-red-500">*</span>
            </span>
            <span className="text-xs text-muted-foreground">
              ({lang === "en" ? "Required" : "บังคับ"})
            </span>
          </div>
          <ImageUploader
            value={form.receiptImageUrl}
            onChange={(url) => { setForm((f) => ({ ...f, receiptImageUrl: url })); setImageError(""); }}
            label=""
          />
          {imageError && (
            <p className="text-xs text-red-500 mt-2 font-medium">{imageError}</p>
          )}
        </div>

        {/* Vendor Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Vendor" : "ร้านค้า"} <span className="text-red-500">*</span>
            </label>
            <select
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">{lang === "en" ? "Select vendor..." : "เลือกร้านค้า..."}</option>
              {VENDOR_PRESETS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Branch" : "สาขา"}
            </label>
            <input
              type="text"
              value={form.vendorBranch}
              onChange={(e) => setForm((f) => ({ ...f, vendorBranch: e.target.value }))}
              placeholder={lang === "en" ? "e.g. Ladprao branch" : "เช่น สาขาลาดพร้าว"}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Receipt No." : "เลขที่บิล"}
            </label>
            <input
              type="text"
              value={form.receiptNumber}
              onChange={(e) => setForm((f) => ({ ...f, receiptNumber: e.target.value }))}
              placeholder={lang === "en" ? "Receipt number" : "เลขที่ใบเสร็จ"}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Date" : "วันที่"} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.receiptDate}
              onChange={(e) => setForm((f) => ({ ...f, receiptDate: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Category" : "หมวดหมู่"}
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{lang === "en" ? c.labelEn : c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Payment Method" : "วิธีชำระเงิน"}
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block text-foreground">
              {lang === "en" ? "Notes" : "หมายเหตุ"}
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={lang === "en" ? "Additional notes" : "หมายเหตุเพิ่มเติม"}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {lang === "en" ? "Line Items" : "รายการสินค้า"}
            </h3>
            <button
              onClick={addItem}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
            >
              <IconPlus className="w-3.5 h-3.5" /> {lang === "en" ? "Add item" : "เพิ่มรายการ"}
            </button>
          </div>
          <div className="space-y-2">
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 2fr 1.5fr 2fr 2fr 0.5fr', gap: 8 }} className="px-2 text-xs text-muted-foreground font-medium">
              <div>{lang === "en" ? "Item" : "สินค้า"}</div>
              <div className="text-center">{lang === "en" ? "Qty" : "จำนวน"}</div>
              <div className="text-center">{lang === "en" ? "Unit" : "หน่วย"}</div>
              <div className="text-center">{lang === "en" ? "Price" : "ราคา"}</div>
              <div className="text-right">{lang === "en" ? "Total" : "รวม"}</div>
              <div />
            </div>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '4fr 2fr 1.5fr 2fr 2fr 0.5fr', gap: 8, alignItems: 'center' }} className="bg-muted/20 rounded-xl p-2.5 border border-border/50">
                <div>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                    placeholder={lang === "en" ? "Item name" : "ชื่อสินค้า"}
                    className="w-full px-2.5 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    placeholder="1"
                    className="w-full px-2.5 py-2 border border-border rounded-lg text-sm text-center focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    placeholder={lang === "en" ? "unit" : "หน่วย"}
                    className="w-full px-1.5 py-2 border border-border rounded-lg text-sm text-center focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-2 border border-border rounded-lg text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="text-right font-mono text-sm font-medium pr-1">
                  <span className="font-sans">฿</span>{formatMoney(item.totalPrice)}
                </div>
                <div className="text-center">
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-muted/20 border border-border rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{lang === "en" ? "Subtotal" : "ยอดรวมสินค้า"}</span>
            <span className="font-mono font-medium"><span className="font-sans">฿</span>{formatMoney(form.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">{lang === "en" ? "VAT" : "VAT (ถ้ามี)"}</span>
            <input
              type="number"
              value={form.vatAmount}
              onChange={(e) => setForm((f) => ({ ...f, vatAmount: e.target.value }))}
              className="w-28 px-2.5 py-1.5 border border-border rounded-lg text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">{lang === "en" ? "Discount" : "ส่วนลด"}</span>
            <input
              type="number"
              value={form.discountAmount}
              onChange={(e) => setForm((f) => ({ ...f, discountAmount: e.target.value }))}
              className="w-28 px-2.5 py-1.5 border border-border rounded-lg text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">{lang === "en" ? "Delivery Fee" : "ค่าจัดส่ง"}</span>
            <input
              type="number"
              value={form.deliveryFee}
              onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))}
              className="w-28 px-2.5 py-1.5 border border-border rounded-lg text-sm text-right focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <hr className="border-border" />
          <div className="flex justify-between items-center">
            <span className="font-bold text-base">{lang === "en" ? "Grand Total" : "ยอดรวมทั้งหมด"}</span>
            <span className="font-mono font-bold text-xl text-primary"><span className="font-sans">฿</span>{formatMoney(form.grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.97] disabled:opacity-50 shadow-sm"
          >
            {createMut.isPending || updateMut.isPending
              ? (lang === "en" ? "Saving..." : "กำลังบันทึก...")
              : isEdit
                ? (lang === "en" ? "Update" : "อัพเดท")
                : (lang === "en" ? "Save" : "บันทึก")}
          </button>
          {isEdit && form.status === "draft" && (
            <button
              onClick={handleConfirm}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.97] flex items-center gap-2 shadow-sm"
            >
              <IconCheck className="w-4 h-4" /> {lang === "en" ? "Confirm" : "ยืนยัน"}
            </button>
          )}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className="px-4 py-3 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-150 active:scale-[0.97] flex items-center gap-2"
            >
              <IconTrash className="w-4 h-4" /> {lang === "en" ? "Delete" : "ลบ"}
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ─── Expense Summary Modal ───────────────────────────────────────────────────

function ExpenseSummaryModal({ data, lang, onClose }) {
  if (!data) return null;

  return (
    <Modal open onClose={onClose} title={lang === "en" ? "Expense Summary (Confirmed)" : "สรุปค่าใช้จ่าย (ยืนยันแล้ว)"} width={560}>
      <div className="space-y-6 p-1">
        {/* Total */}
        <div className="text-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/10">
          <p className="text-sm text-muted-foreground font-medium">
            {lang === "en" ? "Total Confirmed Expenses" : "ค่าใช้จ่ายรวมทั้งหมด"}
          </p>
          <p className="text-4xl font-bold text-primary mt-2"><span className="font-sans">฿</span>{formatMoney(data.total)}</p>
        </div>

        {/* By Vendor */}
        {data.byVendor.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              {lang === "en" ? "By Vendor" : "แยกตามร้านค้า"}
            </h3>
            <div className="space-y-1">
              {data.byVendor.map((v, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {v.vendor?.charAt(0)}
                    </div>
                    <div>
                      <span className="font-medium text-sm">{v.vendor}</span>
                      <span className="text-xs text-muted-foreground ml-2">({v.count} {lang === "en" ? "receipts" : "บิล"})</span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-sm"><span className="font-sans">฿</span>{formatMoney(v.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By Category */}
        {data.byCategory.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              {lang === "en" ? "By Category" : "แยกตามหมวดหมู่"}
            </h3>
            <div className="space-y-1">
              {data.byCategory.map((c, i) => {
                const cat = getCategoryInfo(c.category);
                return (
                  <div key={i} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${cat.color}`}>
                        {lang === "en" ? cat.labelEn : cat.label}
                      </span>
                      <span className="text-xs text-muted-foreground">({c.count} {lang === "en" ? "receipts" : "บิล"})</span>
                    </div>
                    <span className="font-mono font-medium text-sm"><span className="font-sans">฿</span>{formatMoney(c.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.byVendor.length === 0 && data.byCategory.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <IconReceipt className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              {lang === "en" ? "No confirmed receipts yet" : "ยังไม่มีบิลที่ยืนยันแล้ว"}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
