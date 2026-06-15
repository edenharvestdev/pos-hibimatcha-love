import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { IconPlus, IconTrash, IconX } from "@/icons";

export const OptionStockEffectsModal = ({ isOpen, onClose, option, onSave }) => {
  const { data: inventoryItems = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 50000, enabled: isOpen });
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    if (isOpen && option) {
      setEffects(
        Array.isArray(option.stockEffects)
          ? option.stockEffects.map((ef) => ({
              type: ef.type,
              targetRole: ef.targetRole || "",
              targetInventoryItemId: ef.targetInventoryItemId || null,
              inventoryItemId: ef.inventoryItemId || null,
              role: ef.role || "",
              quantity: ef.quantity !== null && ef.quantity !== undefined ? String(ef.quantity) : "",
              unit: ef.unit || "pcs",
            }))
          : []
      );
    }
  }, [isOpen, option]);

  if (!isOpen) return null;

  const addEffect = (type) => {
    setEffects([
      ...effects,
      {
        type,
        targetRole: "",
        targetInventoryItemId: null,
        inventoryItemId: null,
        role: "",
        quantity: "",
        unit: "pcs",
      },
    ]);
  };

  const updateEffect = (index, field, value) => {
    const copy = [...effects];
    copy[index][field] = value;
    setEffects(copy);
  };

  const removeEffect = (index) => {
    setEffects(effects.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 'var(--r-md)', width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Advanced Stock Effects: {option?.name}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><IconX size={20}/></button>
        </div>
        <p className="muted" style={{ marginBottom: 20 }}>Configure how this option affects branch inventory when selected.</p>

        {effects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-md)', color: 'var(--text-tertiary)' }}>
            No stock effects configured for this option.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {effects.map((ef, idx) => (
              <div key={idx} style={{ padding: 16, background: 'var(--bg-muted)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Effect #{idx + 1}</span>
                    <select className="input" style={{ width: 140, height: 32, padding: '0 8px', fontSize: 13 }} value={ef.type} onChange={(e) => updateEffect(idx, 'type', e.target.value)}>
                      <option value="ADD">➕ ADD</option>
                      <option value="REMOVE">➖ REMOVE</option>
                      <option value="REPLACE">🔄 REPLACE</option>
                      <option value="SET_QUANTITY">⚖️ SET QUANTITY</option>
                    </select>
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)', width: 28, height: 28 }} onClick={() => removeEffect(idx)}><IconTrash size={16}/></button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Target Role & Target Item for REMOVE, REPLACE, SET_QUANTITY */}
                  {(ef.type === 'REMOVE' || ef.type === 'REPLACE' || ef.type === 'SET_QUANTITY') && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 500 }}>Target Role</label>
                        <select className="input" value={ef.targetRole || ''} onChange={(e) => updateEffect(idx, 'targetRole', e.target.value)}>
                          <option value="">— Select Target Role —</option>
                          {['MILK', 'SWEETENER', 'MATCHA', 'ICE', 'CUP', 'LID', 'STRAW', 'PACKAGING', 'TOPPING'].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 500 }}>OR Target Item</label>
                        <select className="input" value={ef.targetInventoryItemId || ''} onChange={(e) => updateEffect(idx, 'targetInventoryItemId', e.target.value ? Number(e.target.value) : null)}>
                          <option value="">— Select Target Item —</option>
                          {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Replacement/Addition inventory item */}
                  {(ef.type === 'ADD' || ef.type === 'REPLACE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>{ef.type === 'REPLACE' ? 'Replacement Item' : 'Item to Add'}</label>
                      <select className="input" value={ef.inventoryItemId || ''} onChange={(e) => updateEffect(idx, 'inventoryItemId', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— Select Inventory Item —</option>
                        {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Quantity */}
                  {(ef.type === 'ADD' || ef.type === 'REPLACE' || ef.type === 'SET_QUANTITY') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Quantity</label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        placeholder={ef.type === 'REPLACE' ? 'Inherited if empty' : 'Qty'}
                        value={ef.quantity}
                        onChange={(e) => updateEffect(idx, 'quantity', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Always require unit */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 500 }}>Unit</label>
                    <select className="input" value={ef.unit || 'pcs'} onChange={(e) => updateEffect(idx, 'unit', e.target.value)}>
                      {['g', 'ml', 'pcs', 'portion', 'piece', 'pack', 'box', 'bottle', 'can', 'bag'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  {/* For ADD and REPLACE: Optionally assign a role to the newly added item */}
                  {(ef.type === 'ADD' || ef.type === 'REPLACE') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 500 }}>Role for New Item (Optional)</label>
                      <select className="input" value={ef.role || ''} onChange={(e) => updateEffect(idx, 'role', e.target.value)}>
                        <option value="">— No role —</option>
                        {['MILK', 'SWEETENER', 'MATCHA', 'ICE', 'CUP', 'LID', 'STRAW', 'PACKAGING', 'TOPPING'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => addEffect('ADD')}>+ Add (Topping/Pack)</button>
          <button className="btn btn-secondary btn-sm" onClick={() => addEffect('REPLACE')}>+ Replace (Oat milk)</button>
          <button className="btn btn-secondary btn-sm" onClick={() => addEffect('SET_QUANTITY')}>+ Set Quantity (Sweetness)</button>
          <button className="btn btn-secondary btn-sm" onClick={() => addEffect('REMOVE')}>+ Remove (No ice)</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            const cleaned = effects.map(ef => {
              const copy = { ...ef };
              if (copy.quantity !== undefined && copy.quantity !== '' && copy.quantity !== null) {
                copy.quantity = Number(copy.quantity);
              } else {
                copy.quantity = null;
              }
              if (!copy.targetRole) {
                delete copy.targetRole;
              }
              if (!copy.role) {
                delete copy.role;
              }
              return copy;
            }).filter(ef => {
              if (ef.type === 'ADD' && !ef.inventoryItemId) return false;
              if (ef.type === 'REMOVE' && !ef.targetRole && !ef.targetInventoryItemId) return false;
              if (ef.type === 'REPLACE' && (!ef.targetRole && !ef.targetInventoryItemId) && !ef.inventoryItemId) return false;
              if (ef.type === 'SET_QUANTITY' && !ef.targetRole && !ef.targetInventoryItemId) return false;
              return true;
            });
            onSave(cleaned);
          }}>Save Effects</button>
        </div>
      </div>
    </div>
  );
};
