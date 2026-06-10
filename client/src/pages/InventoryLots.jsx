// ============================================
// InventoryLots: View & manage ingredient batch lots with expiry dates
// ============================================

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer } from "@/components";
import { IconPlus, IconBox, IconFilter, IconTrash, IconEdit, IconWarning } from "@/icons";

function formatDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return "—"; }
}

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG = {
  active:        { label: "ปกติ",           bg: "#d1fae5", color: "#065f46", emoji: "✅" },
  expiring_soon: { label: "ใกล้หมดอายุ",   bg: "#fef3c7", color: "#92400e", emoji: "⚠️" },
  expired:       { label: "หมดอายุ",        bg: "#fee2e2", color: "#991b1b", emoji: "🔴" },
  depleted:      { label: "หมดสต็อค",       bg: "#f3f4f6", color: "#374151", emoji: "📭" },
};

export default function InventoryLots() {
  const { branch, lang } = useApp();
  const toast  = useToast();
  const branchId = branch?.id;

  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm]         = useState(false);
  const [editingLot, setEditingLot]     = useState(null);

  const lotsQuery = trpc.inventoryLots.list.useQuery(
    { branchId: branchId ?? 0, status: filterStatus, warnDays: 7 },
    { enabled: !!branchId, refetchOnWindowFocus: true }
  );
  const alertsQuery = trpc.inventoryLots.getExpiryAlerts.useQuery(
    { branchId: branchId ?? 0, warnDays: 7 },
    { enabled: !!branchId, staleTime: 60000 }
  );

  const lots      = lotsQuery.data?.lots || [];
  const expired   = alertsQuery.data?.expired?.length ?? 0;
  const warnSoon  = alertsQuery.data?.expiringSoon?.length ?? 0;

  const deleteMut = trpc.inventoryLots.delete.useMutation({
    onSuccess: () => { lotsQuery.refetch(); toast.success("ลบ lot เรียบร้อย"); },
    onError:   () => toast.error("ลบไม่สำเร็จ"),
  });

  const inp = {
    padding: "8px 10px", width: "100%",
    border: "1px solid var(--border-default)", borderRadius: "var(--r-default)",
    fontSize: 13, background: "var(--bg-surface)", outline: "none",
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">📦 ติดตาม Lot / วันหมดอายุ</h1>
            <p className="page-desc">ติดตาม batch วัตถุดิบ พร้อมวันผลิต และวันหมดอายุ</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingLot(null); setShowForm(true); }}>
            <IconPlus size={16} /> เพิ่ม Lot
          </button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      {(expired > 0 || warnSoon > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {expired > 0 && (
            <div className="card" style={{ padding: 16, borderLeft: "4px solid #ef4444", background: "rgba(254,226,226,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 15 }}>หมดอายุแล้ว {expired} รายการ</div>
                  <div style={{ fontSize: 12, color: "#dc2626", marginTop: 2 }}>ต้องดำเนินการทันที — ห้ามนำไปใช้</div>
                </div>
              </div>
            </div>
          )}
          {warnSoon > 0 && (
            <div className="card" style={{ padding: 16, borderLeft: "4px solid #f59e0b", background: "rgba(255,237,213,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: "#92400e", fontSize: 15 }}>ใกล้หมดอายุ {warnSoon} รายการ</div>
                  <div style={{ fontSize: 12, color: "#d97706", marginTop: 2 }}>จะหมดอายุภายใน 7 วัน</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { v: "all",           l: "ทั้งหมด" },
          { v: "expired",       l: "🔴 หมดอายุ" },
          { v: "expiring_soon", l: "⚠️ ใกล้หมดอายุ" },
          { v: "active",        l: "✅ ปกติ" },
          { v: "depleted",      l: "📭 หมดสต็อค" },
        ].map(({ v, l }) => (
          <button
            key={v}
            className={filterStatus === v ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
            onClick={() => setFilterStatus(v)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      {lots.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <div className="t-h4" style={{ marginBottom: 6 }}>ยังไม่มี Lot วัตถุดิบ</div>
          <div className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
            เพิ่ม Lot ใหม่ หรือบันทึกใบเสร็จค่าใช้จ่ายพร้อมวันหมดอายุ
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingLot(null); setShowForm(true); }}>
            <IconPlus size={16} /> เพิ่ม Lot
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-default)" }}>
                  {["สินค้า", "Lot #", "วันที่ผลิต", "วันหมดอายุ", "เหลืออยู่", "ต้นทุน/หน่วย", "สถานะ", ""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 14px", textAlign: i >= 4 ? "right" : "left", fontWeight: 600, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lots.map((lot, idx) => {
                  const st = STATUS_CONFIG[lot.status] || STATUS_CONFIG.active;
                  const days = lot.daysLeft;
                  const daysLabel = days === null ? "" : days <= 0 ? "หมดอายุแล้ว" : `${days} วัน`;
                  return (
                    <tr
                      key={lot.id}
                      style={{ borderBottom: "1px solid var(--border-default)", cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = ""}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 500 }}>{lot.itemNameThai || lot.itemName || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>ID: {lot.inventoryItemId}</div>
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                        {lot.lotNumber || "—"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                        {formatDate(lot.manufactureDate)}
                      </td>
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 500 }}>{formatDate(lot.expiryDate)}</div>
                        {daysLabel && (
                          <div style={{ fontSize: 11, color: days !== null && days <= 0 ? "#ef4444" : days !== null && days <= 7 ? "#f59e0b" : "var(--text-tertiary)", fontWeight: 500 }}>
                            {daysLabel}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>
                        {Number(lot.remainingQty).toLocaleString()} {lot.unit || lot.unitOfMeasure || ""}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "monospace" }}>
                        {lot.costPerUnit ? `฿${Number(lot.costPerUnit).toFixed(2)}` : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                          {st.emoji} {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setEditingLot(lot); setShowForm(true); }}
                            style={{ padding: "4px 8px" }}
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", padding: "4px 8px" }}
                            onClick={() => { if (confirm("ลบ lot นี้?")) deleteMut.mutate({ id: lot.id }); }}
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
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
        <LotForm
          lot={editingLot}
          branchId={branchId}
          onClose={() => { setShowForm(false); setEditingLot(null); }}
          onSaved={() => { lotsQuery.refetch(); alertsQuery.refetch(); }}
        />
      )}
    </div>
  );
}

// ─── Lot Form Drawer ─────────────────────────────────────────────────────────

function LotForm({ lot, branchId, onClose, onSaved }) {
  const toast   = useToast();
  const isEdit  = !!lot;
  const createMut = trpc.inventoryLots.create.useMutation();
  const updateMut = trpc.inventoryLots.update.useMutation();

  // Load inventory items for dropdown
  const { data: inventoryItems = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 30000 });

  const [form, setForm] = useState(() => ({
    inventoryItemId: lot?.inventoryItemId ? String(lot.inventoryItemId) : "",
    lotNumber:       lot?.lotNumber || "",
    manufactureDate: lot?.manufactureDate ? new Date(lot.manufactureDate).toISOString().split("T")[0] : "",
    expiryDate:      lot?.expiryDate ? new Date(lot.expiryDate).toISOString().split("T")[0] : "",
    quantity:        lot?.quantity || "1",
    remainingQty:    lot?.remainingQty || "1",
    unitOfMeasure:   lot?.unitOfMeasure || "",
    costPerUnit:     lot?.costPerUnit || "",
    notes:           lot?.notes || "",
  }));

  const inp = {
    width: "100%", padding: "8px 10px",
    border: "1px solid var(--border-default)", borderRadius: "var(--r-default)",
    fontSize: 13, background: "var(--bg-surface)", outline: "none",
  };

  // Compute days left for preview
  const today = new Date(); today.setHours(0,0,0,0);
  const expDate = form.expiryDate ? new Date(form.expiryDate) : null;
  const daysLeft = expDate ? Math.ceil((expDate - today) / 86400000) : null;

  async function handleSave() {
    if (!form.inventoryItemId) { toast.error("กรุณาเลือกวัตถุดิบ"); return; }
    if (!form.expiryDate) { toast.error("กรุณาระบุวันหมดอายุ"); return; }
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: lot.id, remainingQty: parseFloat(form.remainingQty), notes: form.notes });
        toast.success("อัพเดท lot เรียบร้อย");
      } else {
        await createMut.mutateAsync({
          branchId: branchId || 1,
          inventoryItemId: parseInt(form.inventoryItemId),
          lotNumber: form.lotNumber || undefined,
          manufactureDate: form.manufactureDate || undefined,
          expiryDate: form.expiryDate,
          quantity: parseFloat(form.quantity) || 1,
          unitOfMeasure: form.unitOfMeasure || undefined,
          costPerUnit: form.costPerUnit ? parseFloat(form.costPerUnit) : undefined,
          notes: form.notes || undefined,
        });
        toast.success("เพิ่ม Lot เรียบร้อย");
      }
      onSaved(); onClose();
    } catch (err) { toast.error("เกิดข้อผิดพลาด: " + (err?.message || "Unknown")); }
  }

  const expiryBorderColor = daysLeft !== null ? (daysLeft <= 0 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "var(--border-default)") : "var(--border-default)";
  const expiryBg = daysLeft !== null ? (daysLeft <= 0 ? "rgba(254,226,226,0.5)" : daysLeft <= 7 ? "rgba(255,237,213,0.5)" : "var(--bg-surface)") : "var(--bg-surface)";

  return (
    <Drawer open onClose={onClose} title={isEdit ? "แก้ไข Lot" : "เพิ่ม Lot ใหม่"} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Inventory Item */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
            วัตถุดิบ <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <select value={form.inventoryItemId} onChange={(e) => setForm((f) => ({ ...f, inventoryItemId: e.target.value }))} style={inp} disabled={isEdit}>
            <option value="">เลือกวัตถุดิบ...</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>{item.nameThai || item.name}</option>
            ))}
          </select>
        </div>

        {/* Lot Number */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
            เลข Lot / Batch
          </label>
          <input type="text" value={form.lotNumber} onChange={(e) => setForm((f) => ({ ...f, lotNumber: e.target.value }))} placeholder="เช่น LOT-2025-001" style={inp} disabled={isEdit} />
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#d97706" }}>
              📅 วันที่ผลิต (Manufacture Date)
            </label>
            <input type="date" value={form.manufactureDate} onChange={(e) => setForm((f) => ({ ...f, manufactureDate: e.target.value }))} style={inp} disabled={isEdit} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: daysLeft !== null && daysLeft <= 0 ? "#ef4444" : "#d97706" }}>
              ⏰ วันหมดอายุ (Expiry Date) <span style={{ color: "#ef4444" }}>*</span>
              {daysLeft !== null && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: daysLeft <= 0 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "var(--text-tertiary)" }}>
                  {daysLeft <= 0 ? "⚠️ หมดอายุแล้ว" : `เหลือ ${daysLeft} วัน`}
                </span>
              )}
            </label>
            <input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} style={{ ...inp, borderColor: expiryBorderColor, background: expiryBg }} disabled={isEdit} />
          </div>
        </div>

        {/* Quantity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>จำนวนรับเข้า</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value, remainingQty: e.target.value }))} style={inp} disabled={isEdit} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>คงเหลือ</label>
            <input type="number" value={form.remainingQty} onChange={(e) => setForm((f) => ({ ...f, remainingQty: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>หน่วย</label>
            <input type="text" value={form.unitOfMeasure} onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} placeholder="กก., ลิตร, ชิ้น..." style={inp} disabled={isEdit} />
          </div>
        </div>

        {/* Cost + Notes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>ต้นทุน/หน่วย (฿)</label>
            <input type="number" value={form.costPerUnit} onChange={(e) => setForm((f) => ({ ...f, costPerUnit: e.target.value }))} style={inp} disabled={isEdit} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>หมายเหตุ</label>
            <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="หมายเหตุ..." style={inp} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            {createMut.isPending || updateMut.isPending ? "กำลังบันทึก..." : isEdit ? "อัพเดท" : "บันทึก Lot"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        </div>
      </div>
    </Drawer>
  );
}
