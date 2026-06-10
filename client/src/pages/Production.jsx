// ============================================
// Page: Production
// Volume 10: Batch Production System for HibiOS
// ============================================

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Field } from "@/components";
import { IconPlus, IconBox, IconTrash, IconPlay, IconCheckCircle, IconX } from "@/icons";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const STATUS_CONFIG = {
  draft: { label: "ร่าง (Draft)", bg: "#e0f2fe", color: "#0369a1", emoji: "📝" },
  in_production: { label: "กำลังผลิต (In Production)", bg: "#fef3c7", color: "#b45309", emoji: "🥣" },
  completed: { label: "เสร็จสมบูรณ์ (Completed)", bg: "#d1fae5", color: "#047857", emoji: "✅" },
  cancelled: { label: "ยกเลิก (Cancelled)", bg: "#fee2e2", color: "#b91c1c", emoji: "❌" },
};

export default function PageProduction() {
  const { branch, lang } = useApp();
  const toast = useToast();
  const branchId = branch?.id;

  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("board"); // 'board' or 'list'

  const query = trpc.production.list.useQuery(
    { branchId: branchId ?? 0, status: filterStatus },
    { enabled: !!branchId, refetchOnWindowFocus: true }
  );

  const batches = query.data || [];

  const updateStatusMut = trpc.production.updateStatus.useMutation({
    onSuccess: () => {
      query.refetch();
      toast.success("อัปเดตสถานะสำเร็จ");
    },
    onError: (err) => {
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    },
  });

  const deleteMut = trpc.production.delete.useMutation({
    onSuccess: () => {
      query.refetch();
      toast.success("ลบบัตช์การผลิตสำเร็จ");
    },
    onError: (err) => {
      toast.error("ลบไม่สำเร็จ: " + err.message);
    },
  });

  // Group batches for Board View
  const grouped = {
    draft: batches.filter((b) => b.status === "draft"),
    in_production: batches.filter((b) => b.status === "in_production"),
    completed: batches.filter((b) => b.status === "completed"),
    cancelled: batches.filter((b) => b.status === "cancelled"),
  };

  const handleUpdateStatus = (id, newStatus, currentActualQty) => {
    if (newStatus === "completed") {
      const actual = prompt("ระบุจำนวนสินค้าที่ผลิตได้จริง (Actual Quantity):", currentActualQty);
      if (actual === null) return; // cancelled prompt
      const qty = parseFloat(actual);
      if (isNaN(qty) || qty <= 0) {
        toast.error("กรุณากรอกจำนวนที่ถูกต้อง");
        return;
      }
      updateStatusMut.mutate({ id, status: newStatus, actualQty: qty });
    } else {
      if (confirm(`เปลี่ยนสถานะล็อตการผลิตนี้เป็น ${newStatus}?`)) {
        updateStatusMut.mutate({ id, status: newStatus });
      }
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">🥣 ระบบผลิตสินค้า (Batch Production)</h1>
            <p className="page-desc">วางแผน ผลิตเครื่องดื่มกึ่งสำเร็จรูป/เบเกอรี่ล็อตใหญ่ และบันทึกคลังสินค้าอัตโนมัติ</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <IconPlus size={16} /> สร้างบัตช์การผลิต
          </button>
        </div>
      </div>

      {/* Nav Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={activeTab === "board" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} onClick={() => setActiveTab("board")}>
            📊 มุมมอง Kanban Board
          </button>
          <button className={activeTab === "list" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"} onClick={() => setActiveTab("list")}>
            📝 มุมมองตารางประวัติ
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            { v: "all", l: "ทั้งหมด" },
            { v: "draft", l: "📝 ร่าง" },
            { v: "in_production", l: "🥣 กำลังผลิต" },
            { v: "completed", l: "✅ สำเร็จ" },
            { v: "cancelled", l: "❌ ยกเลิก" },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={filterStatus === v ? "btn btn-secondary btn-sm" : "btn btn-ghost btn-sm"}
              style={filterStatus === v ? { border: "1px solid var(--matcha-600)", background: "rgba(22,163,74,0.1)" } : {}}
              onClick={() => setFilterStatus(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board View */}
      {activeTab === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {["draft", "in_production", "completed", "cancelled"].map((statusKey) => {
            const list = grouped[statusKey] || [];
            const cfg = STATUS_CONFIG[statusKey];
            return (
              <div key={statusKey} className="card" style={{ background: "var(--bg-muted)", minHeight: 400, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid var(--border-default)" }}>
                  <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{cfg.emoji}</span>
                    <span>{cfg.label}</span>
                  </div>
                  <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontWeight: "bold" }}>
                    {list.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)", fontSize: 12 }}>
                      ไม่มีรายการ
                    </div>
                  ) : (
                    list.map((b) => (
                      <div key={b.id} className="card" style={{ padding: 12, background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{b.batchNumber}</span>
                          <span>{formatDate(b.createdAt)}</span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                          {b.targetItemNameThai || b.targetItemName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                          จำนวน: {Number(b.actualQty || b.plannedQty).toLocaleString()} {b.unit}
                        </div>

                        {/* Ingredients indicator */}
                        {b.ingredients?.length > 0 && (
                          <div style={{ fontSize: 11, background: "var(--bg-muted)", padding: "4px 8px", borderRadius: 4, marginBottom: 10 }}>
                            <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>ส่วนผสม ({b.ingredients.length}):</div>
                            <div className="muted truncate">
                              {b.ingredients.map((i) => i.itemNameThai || i.itemName).join(", ")}
                            </div>
                          </div>
                        )}

                        {/* Action buttons per state */}
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", borderTop: "1px solid var(--border-default)", paddingTop: 8, marginTop: 4 }}>
                          {b.status === "draft" && (
                            <>
                              <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => deleteMut.mutate({ id: b.id })}>
                                <IconTrash size={12} />
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(b.id, "in_production", b.plannedQty)}>
                                <IconPlay size={12} /> เริ่มผลิต
                              </button>
                            </>
                          )}
                          {b.status === "in_production" && (
                            <>
                              <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444" }} onClick={() => handleUpdateStatus(b.id, "cancelled")}>
                                <IconX size={12} /> ยกเลิก
                              </button>
                              <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(b.id, "completed", b.plannedQty)}>
                                <IconCheckCircle size={12} /> เสร็จสมบูรณ์
                              </button>
                            </>
                          )}
                          {(b.status === "completed" || b.status === "cancelled") && (
                            <span className="muted" style={{ fontSize: 11 }}>
                              ปิดล็อตแล้ว
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid List View */}
      {activeTab === "list" && (
        <div className="card" style={{ overflow: "hidden" }}>
          {batches.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }} className="muted">
              ไม่พบล็อตการผลิต
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-default)" }}>
                  {["เลขบัตช์", "สินค้าผลิตเสร็จ", "แผนผลิต", "ผลิตจริง", "วันหมดอายุล็อต", "สถานะ", "วันที่บันทึก"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 14px", fontWeight: 600, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.draft;
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 600 }}>{b.batchNumber}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700 }}>{b.targetItemNameThai || b.targetItemName}</div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>{Number(b.plannedQty).toLocaleString()} {b.unit}</td>
                      <td style={{ padding: "12px 14px" }}>{b.actualQty ? `${Number(b.actualQty).toLocaleString()} ${b.unit}` : "—"}</td>
                      <td style={{ padding: "12px 14px" }}>{b.expiryDate ? formatDate(b.expiryDate) : "—"}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className="badge" style={{ background: cfg.bg, color: cfg.color, fontSize: 11, padding: "2px 8px" }}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-tertiary)" }}>{formatDate(b.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Creation Drawer Form */}
      {showForm && (
        <ProductionForm
          branchId={branchId}
          onClose={() => setShowForm(false)}
          onSaved={() => query.refetch()}
        />
      )}
    </div>
  );
}

// ─── Creation Drawer Form ───

function ProductionForm({ branchId, onClose, onSaved }) {
  const toast = useToast();
  const createMut = trpc.production.create.useMutation();

  // Load inventory items
  const { data: inventoryItems = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 30000 });

  const [targetId, setTargetId] = useState("");
  const [plannedQty, setPlannedQty] = useState("10");
  const [notes, setNotes] = useState("");
  const [manufactureDate, setManufactureDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");

  // Ingredients selected list
  const [ingredients, setIngredients] = useState([]);

  // Temp ingredient selection values
  const [tempIngId, setTempIngId] = useState("");
  const [tempQty, setTempQty] = useState("1");

  const handleAddIngredient = () => {
    if (!tempIngId) return;
    const match = inventoryItems.find((i) => i.id === parseInt(tempIngId));
    if (!match) return;

    if (ingredients.some((i) => i.inventoryItemId === match.id)) {
      toast.error("มีส่วนผสมนี้ในสูตรแล้ว");
      return;
    }

    setIngredients([
      ...ingredients,
      {
        inventoryItemId: match.id,
        name: match.nameThai || match.name,
        plannedQty: parseFloat(tempQty) || 1,
        actualQty: parseFloat(tempQty) || 1,
        unitOfMeasure: match.unitOfMeasure || "g",
      },
    ]);
    setTempIngId("");
    setTempQty("1");
  };

  const handleRemoveIngredient = (idx) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!targetId) {
      toast.error("กรุณาเลือกสินค้าผลิตเสร็จ");
      return;
    }
    if (ingredients.length === 0) {
      toast.error("กรุณาระบุส่วนผสมอย่างน้อย 1 รายการ");
      return;
    }

    const batchNumber = `BATCH-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await createMut.mutateAsync({
        branchId: branchId || 1,
        inventoryItemId: parseInt(targetId),
        batchNumber,
        plannedQty: parseFloat(plannedQty) || 1,
        notes: notes || undefined,
        manufactureDate: manufactureDate || undefined,
        expiryDate: expiryDate || undefined,
        ingredients: ingredients.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          plannedQty: i.plannedQty,
          actualQty: i.actualQty,
          unitOfMeasure: i.unitOfMeasure,
        })),
      });

      toast.success("สร้างบัตช์การผลิตสำเร็จ");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const inpStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--r-default)",
    fontSize: 13,
    background: "var(--bg-surface)",
    outline: "none",
  };

  return (
    <Drawer open onClose={onClose} title="สร้างบัตช์วางแผนผลิตสินค้าใหม่" width={680}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Target house-made item */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            สินค้าที่ต้องการผลิต (Target Product) *
          </label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={inpStyle}>
            <option value="">เลือกเมนูกึ่งสำเร็จรูป/เบเกอรี่...</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nameThai || item.name} ({item.unitOfMeasure})
              </option>
            ))}
          </select>
        </div>

        {/* Quantities & dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              จำนวนแผนผลิตเป้าหมาย *
            </label>
            <input type="number" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} style={inpStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              หมายเหตุ
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} style={inpStyle} placeholder="เช่น ผลิตสต็อกสำหรับสุดสัปดาห์" />
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              วันที่เริ่มผลิต (MFG)
            </label>
            <input type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} style={inpStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              วันหมดอายุบัตช์นี้ (EXP)
            </label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} style={inpStyle} />
          </div>
        </div>

        {/* Ingredients section */}
        <div style={{ borderTop: "1px dashed var(--border-default)", paddingTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🧪 วัตถุดิบและส่วนประกอบที่ใช้</h3>

          {/* Add Ingredient Line */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>เลือกวัตถุดิบ</label>
              <select value={tempIngId} onChange={(e) => setTempIngId(e.target.value)} style={inpStyle}>
                <option value="">เลือกส่วนประกอบ...</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nameThai || item.name} ({item.unitOfMeasure})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>ปริมาณที่ใช้</label>
              <input type="number" value={tempQty} onChange={(e) => setTempQty(e.target.value)} style={inpStyle} />
            </div>
            <button className="btn btn-secondary" style={{ height: 38 }} onClick={handleAddIngredient}>
              เพิ่ม
            </button>
          </div>

          {/* Selected Ingredients List */}
          {ingredients.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", border: "1px dashed var(--border-default)", color: "var(--text-tertiary)", fontSize: 12 }}>
              ยังไม่มีการเลือกส่วนผสม
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {ingredients.map((ing, idx) => (
                <div key={ing.inventoryItemId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: idx === ingredients.length - 1 ? "none" : "1px solid var(--border-default)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{ing.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13 }}>
                      {ing.plannedQty} {ing.unitOfMeasure}
                    </span>
                    <button className="btn btn-ghost btn-sm" style={{ color: "#ef4444", padding: 4 }} onClick={() => handleRemoveIngredient(idx)}>
                      <IconX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={createMut.isPending}>
            {createMut.isPending ? "กำลังบันทึกแผน..." : "ยืนยันสร้างแผนผลิต"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
        </div>
      </div>
    </Drawer>
  );
}
