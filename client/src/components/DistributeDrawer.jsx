// ============================================
// Universal "Distribute to branches" drawer
// ============================================
// Use from anywhere — Menu, Inventory, SOP, or the Distribute Center.
// Asks: what to send, where to send, optional quantity for stock items.
//
// Props:
//   open         — boolean
//   onClose      — () => void
//   entityType   — "menu_items" | "stock_items" | "sops"  (controls UI labels)
//   entityIds    — number[]  (pre-selected entities, optional)
//   pickerEntities — Array of selectable entities {id, name, sub}  (if no entityIds passed)
//   onDone       — () => void  (called after successful send)

import React, { useState, useEffect, useMemo } from "react";
import { IconCheck, IconShare, IconX, IconBox, IconWhisk, IconBookmark } from "@/icons";
import { Drawer, Field, Toggle, Checkbox } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";

const ENTITY_META = {
  menu_items: {
    label: "menu items",
    icon: IconWhisk,
    color: "var(--matcha-600)",
    helper: "Selected menu items will be marked as available at the chosen branches.",
    needsQuantity: false,
  },
  stock_items: {
    label: "stock items",
    icon: IconBox,
    color: "var(--info)",
    helper: "Stock will be deducted from HQ and added to each target branch. Inventory movements are recorded automatically.",
    needsQuantity: true,
  },
  sops: {
    label: "SOPs",
    icon: IconBookmark,
    color: "var(--gold)",
    helper: "Selected SOPs will be marked as required reading for staff at the chosen branches.",
    needsQuantity: false,
  },
};

export const DistributeDrawer = ({
  open, onClose,
  entityType = "menu_items",
  entityIds = [],
  pickerEntities = null,    // [{id, name, sub}]
  onDone,
}) => {
  const meta = ENTITY_META[entityType] ?? ENTITY_META.menu_items;
  const session = getSession();
  const isSuper = session?.role === "super_admin";

  const { data: branches = [] } = trpc.branches.list.useQuery({}, { staleTime: 60000, enabled: open });
  const distribute = trpc.branches.distribute.useMutation({
    onSuccess: (res) => {
      alert(`Successfully distributed to ${res.rowsAffected} target(s).`);
      onDone?.();
      onClose();
    },
    onError: (e) => alert(`Distribute failed: ${e.message || "Unknown error"}`),
  });

  const [selectedBranchIds, setSelectedBranchIds] = useState(new Set());
  const [selectedEntityIds, setSelectedEntityIds] = useState(new Set(entityIds));
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("piece");
  const [note, setNote] = useState("");

  // Reset when drawer opens
  useEffect(() => {
    if (open) {
      setSelectedBranchIds(new Set());
      setSelectedEntityIds(new Set(entityIds));
      setQty("");
      setUnit("piece");
      setNote("");
    }
  }, [open, entityIds.join(",")]);

  const hq = branches.find((b) => b.branchType === "hq");
  const targets = branches.filter((b) => b.branchType !== "hq" && b.status === "active");
  const finalEntityIds = pickerEntities ? Array.from(selectedEntityIds) : entityIds;
  const canSubmit =
    isSuper &&
    selectedBranchIds.size > 0 &&
    finalEntityIds.length > 0 &&
    (!meta.needsQuantity || Number(qty) > 0);

  const submit = () => {
    distribute.mutate({
      entityType,
      entityIds: finalEntityIds,
      branchIds: Array.from(selectedBranchIds),
      transferQuantity: meta.needsQuantity ? qty : undefined,
      transferUnit: meta.needsQuantity ? unit : undefined,
      note: note || undefined,
    });
  };

  const Icon = meta.icon;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Distribute ${meta.label}`}
      subtitle={hq ? `From ${hq.name} → selected branches` : "From HQ → selected branches"}
      width={560}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={!canSubmit || distribute.isPending}
        >
          {distribute.isPending
            ? "Distributing…"
            : `Send ${finalEntityIds.length} ${meta.label} to ${selectedBranchIds.size} branch${selectedBranchIds.size === 1 ? "" : "es"}`}
        </button>
      </>}
    >
      {!isSuper && (
        <div style={{
          padding: 14, marginBottom: 16,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--danger)", borderRadius: "var(--r-default)", fontSize: 13,
        }}>
          ⚠ Only the Super Admin (Hibi House) can distribute to other branches.
        </div>
      )}

      <div style={{ padding: 14, background: "var(--matcha-50)", borderRadius: "var(--r-default)", fontSize: 13, color: "var(--matcha-700)", marginBottom: 12, display: "flex", gap: 10 }}>
        <Icon size={18} style={{ flex: "none", marginTop: 1 }}/>
        <div>{meta.helper}</div>
      </div>
      <div style={{
        padding: 10, marginBottom: 16,
        background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)",
        borderRadius: "var(--r-default)", fontSize: 12, color: "var(--text-secondary)",
      }}>
        ⚠ Each branch is independent. You must explicitly select every branch that should receive this — branches not picked here will <strong>not</strong> get the update.
      </div>

      {/* Entity picker — only when entityIds is empty (caller asked us to pick) */}
      {pickerEntities && (
        <>
          <div className="t-caption" style={{ marginBottom: 10 }}>What to send</div>
          <div className="card" style={{ padding: 0, overflow: "auto", maxHeight: 220, marginBottom: 16 }}>
            {pickerEntities.length === 0 ? (
              <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>No items available.</div>
            ) : pickerEntities.map((e, i) => {
              const on = selectedEntityIds.has(e.id);
              return (
                <div
                  key={e.id}
                  onClick={() => {
                    const next = new Set(selectedEntityIds);
                    next.has(e.id) ? next.delete(e.id) : next.add(e.id);
                    setSelectedEntityIds(next);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", cursor: "pointer",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-default)",
                    background: on ? "var(--matcha-50)" : "transparent",
                  }}
                >
                  <Checkbox checked={on} onChange={() => {}}/>
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <div style={{ fontWeight: 500 }}>{e.name}</div>
                    {e.sub && <div className="muted" style={{ fontSize: 11 }}>{e.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pre-selected entity summary */}
      {!pickerEntities && entityIds.length > 0 && (
        <div style={{
          padding: 12, marginBottom: 16,
          background: "var(--bg-muted)", borderRadius: "var(--r-default)",
          fontSize: 13,
        }}>
          <strong>{entityIds.length}</strong> {meta.label} selected for distribution.
        </div>
      )}

      {/* Quantity (stock only) */}
      {meta.needsQuantity && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
          <Field label="Quantity per item per branch" required>
            <input className="input" type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 50"/>
          </Field>
          <Field label="Unit">
            <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {["g", "kg", "ml", "l", "piece", "pack", "box", "bottle", "can", "bag"].map((u) =>
                <option key={u} value={u}>{u}</option>
              )}
            </select>
          </Field>
        </div>
      )}

      {/* Target branches */}
      <div className="t-caption" style={{ marginBottom: 10 }}>Send to branches</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {targets.length === 0 ? (
          <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
            No other active branches. Add one in Franchise → All Branches.
          </div>
        ) : (
          <>
            <div
              onClick={() => {
                if (selectedBranchIds.size === targets.length) setSelectedBranchIds(new Set());
                else setSelectedBranchIds(new Set(targets.map((b) => b.id)));
              }}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                cursor: "pointer", borderBottom: "1px solid var(--border-default)",
                background: "var(--bg-muted)", fontWeight: 500, fontSize: 13,
              }}
            >
              <Checkbox
                checked={selectedBranchIds.size === targets.length && targets.length > 0}
                indeterminate={selectedBranchIds.size > 0 && selectedBranchIds.size < targets.length}
                onChange={() => {}}
              />
              <span>Select all ({targets.length})</span>
            </div>
            {targets.map((b, i) => {
              const on = selectedBranchIds.has(b.id);
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    const next = new Set(selectedBranchIds);
                    next.has(b.id) ? next.delete(b.id) : next.add(b.id);
                    setSelectedBranchIds(next);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", cursor: "pointer",
                    borderTop: i === 0 ? "none" : "1px solid var(--border-default)",
                    background: on ? "var(--matcha-50)" : "transparent",
                  }}
                >
                  <Checkbox checked={on} onChange={() => {}}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{b.branchCode} · {b.province || b.district || "—"}</div>
                  </div>
                  <span className="pill" style={{ fontSize: 10, height: 18 }}>{b.branchType}</span>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Note (optional)">
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Restocking weekly delivery, July promo, etc."/>
        </Field>
      </div>
    </Drawer>
  );
};

export default DistributeDrawer;
