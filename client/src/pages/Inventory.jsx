// ============================================
// Page: inventory
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { EmptyShelf,IconBox,IconCart,IconCheck,IconCheckList,IconChevDown,IconChevRight,IconEdit,IconExport,IconFlag,IconImport,IconLeaf,IconMore,IconPhone,IconPlus,IconScale,IconScanner,IconSearch,IconShare,IconTruck,IconX } from "@/icons";
import { useApp,Drawer,Field,Select,Checkbox,Tabs,TopActionBar,EmptyState,StatCard,SectionHeader } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { DistributeDrawer } from "@/components/DistributeDrawer";
import DynamicAttributeField from "@/components/DynamicAttributeField";
import AddOptionModal from "@/components/AddOptionModal";
import { displayName } from "@/lib/i18n";

// Dynamic Attributes Section for item drawer
const DynamicAttributesSection = ({ categoryId, attributes, onChange, onAddOption }) => {
  const { data: attrs = [], isLoading } = trpc.inventoryAttributes.listByCategory.useQuery(
    { categoryId: categoryId ?? 0 },
    { enabled: !!categoryId, staleTime: 5000, refetchOnWindowFocus: true }
  );

  if (!categoryId) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
      <p style={{ fontSize: 13 }}>Select a category first to see dynamic attributes.</p>
    </div>
  );

  if (isLoading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading attributes...</div>;

  if (attrs.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
      <p style={{ fontSize: 13 }}>No attributes defined for this category yet.</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {attrs.map((attr) => (
        <DynamicAttributeField
          key={attr.id}
          attribute={attr}
          value={attributes[attr.attributeKey] ?? ''}
          onChange={(val) => onChange({ ...attributes, [attr.attributeKey]: val })}
          onAddOption={() => onAddOption(attr.id, attr.labelTh || attr.labelEn)}
        />
      ))}
    </div>
  );
};


// ----- Overview -----
export const PageInvOverview = () => {
  const { navigate, branch, lang } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const { data: stockItems = [] } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, staleTime: 15000, refetchOnWindowFocus: true }
  );
  const { data: movements = [] } = trpc.inventory.listMovements.useQuery(
    branchId ? { branchId } : undefined,
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: valueSummary } = trpc.inventory.stockValueSummary.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, staleTime: 5000, refetchOnWindowFocus: true }
  );

  const totalItems = stockItems.length;
  const lowStockItems = stockItems.filter((s) => {
    const reorderPt = Number(s.item?.reorderPoint ?? 0);
    return reorderPt > 0 && s.availableStock <= reorderPt;
  });
  const totalValue = valueSummary?.totalValue ?? stockItems.reduce((sum, s) => sum + Number(s.currentStock ?? 0) * Number(s.item?.costPerUnit ?? 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Overview</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Inventory Overview</h1>
            <p className="page-desc">All stock{branchId ? ' at this branch' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/backoffice/inventory/receiving')}><IconTruck size={16}/> Receive</button>
            <button className="btn btn-secondary" onClick={() => navigate('/backoffice/inventory/count')}><IconCheckList size={16}/> Count</button>
            <button className="btn btn-secondary" onClick={() => navigate('/backoffice/inventory/transfer')}><IconShare size={16}/> Transfer</button>
            <button className="btn btn-primary" onClick={() => navigate('/backoffice/inventory/items')}><IconEdit size={16}/> Items</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total items" value={String(totalItems)}/>
        <StatCard label="Low stock" value={String(lowStockItems.length)} sub="needs attention"/>
        <StatCard label="Total value" value={`฿${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} glow/>
      </div>

      {/* Stock Value by Source */}
      {valueSummary?.bySource && valueSummary.bySource.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Stock Value by Source</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {valueSummary.bySource.map((s) => {
              const label = s.source === 'hq_supply' ? 'HQ Supply (นำเข้าเอง)' : s.source === 'customer_supplied' ? 'External (ซื้อนอก)' : 'Mixed (ผสม)';
              return (
                <div key={s.source} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>฿{s.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.count} items · {s.qty.toLocaleString()} units</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="inv-grid">
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Low stock alerts" action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/backoffice/inventory/items')}>View all →</button>}/>
          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)' }}>
              <IconCheck size={24} style={{ opacity: 0.4 }}/>
              <p style={{ fontSize: 13, marginTop: 8 }}>All stock levels are healthy</p>
            </div>
          ) : lowStockItems.slice(0, 6).map((s, i) => (
            <div key={s.itemId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.item?.name ?? `Item ${s.itemId}`}</div>
                <div className="muted" style={{ fontSize: 11 }}>{s.availableStock} {s.item?.unit} remaining</div>
              </div>
              <button className="btn btn-secondary btn-xs" onClick={() => navigate('/backoffice/purchase-orders')}>Reorder</button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Recent stock movements" desc="Latest activity"/>
          {movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No movements recorded yet</div>
          ) : movements.slice(0, 5).map((m, i) => {
            const isPositive = Number(m.quantity) > 0;
            const color = isPositive ? 'var(--matcha-700)' : 'var(--text-secondary)';
            const at = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'center', fontSize: 13 }}>
                <span className="pill" style={{ color }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/> {m.movementType}</span>
                <span className="muted">{m.notes ?? `Item ${m.inventoryItemId}`}</span>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="tabular" style={{ color, fontWeight: 500 }}>{isPositive ? '+' : ''}{m.quantity}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{at}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@media (max-width: 1000px) { .inv-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

// ----- Items & Materials -----
export const PageInvItems = () => {
  const { lang } = useApp();
  const session = getSession();
  const isSuper = session?.role === 'super_admin';
  const [tab, setTab] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null = new, object = editing
  const [itemTab, setItemTab] = useState('basic');
  const [itemForm, setItemForm] = useState({ name: '', nameThai: '', sku: '', barcode: '', categoryId: null, unitOfMeasure: 'g', sourceFlag: 'hq_supply', description: '', brand: '', costPerUnit: '', sellingPricePerUnit: '', minStockLevel: '', reorderPoint: '', reorderQuantity: '', leadTimeDays: '', shelfLifeDays: '', storageRequirements: '', allergens: [], attributes: {} });
  const [addOptionModal, setAddOptionModal] = useState({ open: false, attributeId: null, label: '' });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [distributeOpen, setDistributeOpen] = useState(false);

  // States for dynamic category input creation
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const { data: items = [], isLoading } = trpc.inventory.listItems.useQuery(
    { search: search || undefined },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: categories = [] } = trpc.inventory.listCategories.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Dynamic attributes query
  const { data: dynAttrs = [] } = trpc.inventoryAttributes.listByCategory.useQuery(
    { categoryId: itemForm.categoryId ?? 0 },
    { enabled: !!itemForm.categoryId, staleTime: 5000, refetchOnWindowFocus: true }
  );

  // Mutations
  const utils = trpc.useUtils();
  const createItemMut = trpc.inventory.createItem.useMutation();
  const updateItemMut = trpc.inventory.updateItem.useMutation();
  const deleteItemMut = trpc.inventory.deleteItem.useMutation({ onSuccess: () => utils.inventory.listItems.invalidate() });
  const hardDeleteItemMut = trpc.inventory.hardDeleteItem.useMutation({
    onSuccess: () => {
      utils.inventory.listItems.invalidate();
      utils.inventory.listCategories.invalidate();
    },
  });
  const addOptionMut = trpc.inventoryAttributes.addOption.useMutation();
  const createCategoryMut = trpc.inventory.createCategory.useMutation();
  const [savingItem, setSavingItem] = useState(false);

  const handleDeleteItem = (item) => {
    const confirmed = window.confirm(
      `ลบ "${item.name}" ออกจากระบบถาวร?\n\nข้อมูลสต็อกทุกสาขาของรายการนี้จะถูกลบออกด้วย และไม่สามารถกู้คืนได้`
    );
    if (confirmed) {
      hardDeleteItemMut.mutate({ id: item.id });
    }
  };

  // Reset attributes when category changes
  const handleCategoryChange = (newCategoryId) => {
    setItemForm(f => ({ ...f, categoryId: newCategoryId, attributes: {} }));
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }
    setCreatingCategory(true);
    try {
      const newCat = await createCategoryMut.mutateAsync({
        name: newCategoryName.trim(),
      });
      await utils.inventory.listCategories.invalidate();
      setItemForm(f => ({ ...f, categoryId: newCat.id }));
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    } catch (err) {
      alert('Failed to create category: ' + (err.message || 'Unknown error'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const openItemDrawer = (item) => {
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name || '', nameThai: item.nameThai || '', sku: item.sku || '',
        barcode: item.barcode || '', categoryId: item.categoryId || null,
        unitOfMeasure: item.unitOfMeasure || 'g', sourceFlag: item.sourceFlag || 'hq_supply',
        description: item.description || '', brand: item.brand || '',
        costPerUnit: item.costPerUnit || '', sellingPricePerUnit: item.sellingPricePerUnit || '',
        minStockLevel: item.minStockLevel || '', reorderPoint: item.reorderPoint || '',
        reorderQuantity: item.reorderQuantity || '', leadTimeDays: item.leadTimeDays || '',
        shelfLifeDays: item.shelfLifeDays || '', storageRequirements: item.storageRequirements || '',
        allergens: item.allergens || [], attributes: item.attributes || {},
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', nameThai: '', sku: '', barcode: '', categoryId: null, unitOfMeasure: 'g', sourceFlag: 'hq_supply', description: '', brand: '', costPerUnit: '', sellingPricePerUnit: '', minStockLevel: '', reorderPoint: '', reorderQuantity: '', leadTimeDays: '', shelfLifeDays: '', storageRequirements: '', allergens: [], attributes: {} });
    }
    setItemTab('basic');
    setDrawerOpen(true);
  };

  const closeItemDrawer = () => {
    setDrawerOpen(false);
    setEditingItem(null);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { alert('Name is required'); return; }
    setSavingItem(true);
    try {
      const payload = {
        ...itemForm,
        categoryId: itemForm.categoryId || undefined,
        costPerUnit: itemForm.costPerUnit || undefined,
        sellingPricePerUnit: itemForm.sellingPricePerUnit || undefined,
        minStockLevel: itemForm.minStockLevel || undefined,
        reorderPoint: itemForm.reorderPoint || undefined,
        reorderQuantity: itemForm.reorderQuantity || undefined,
        leadTimeDays: itemForm.leadTimeDays ? Number(itemForm.leadTimeDays) : undefined,
        shelfLifeDays: itemForm.shelfLifeDays ? Number(itemForm.shelfLifeDays) : undefined,
        attributes: Object.keys(itemForm.attributes).length > 0 ? itemForm.attributes : undefined,
      };
      if (editingItem) {
        await updateItemMut.mutateAsync({ id: editingItem.id, ...payload });
      } else {
        await createItemMut.mutateAsync(payload);
      }
      utils.inventory.listItems.invalidate();
      closeItemDrawer();
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingItem(false);
    }
  };

  const handleAddOption = async (data) => {
    const result = await addOptionMut.mutateAsync(data);
    utils.inventoryAttributes.listByCategory.invalidate();
    // Auto-select the newly added option
    if (result && result.value && addOptionModal.attributeId) {
      // Find the attribute key for this attributeId from dynAttrs
      const attr = dynAttrs.find(a => a.id === addOptionModal.attributeId);
      if (attr) {
        setItemForm(f => ({ ...f, attributes: { ...f.attributes, [attr.attributeKey]: result.value } }));
      }
    }
  };

  const filtered = tab === 'all' ? items : items.filter((it) => catMap.get(it.categoryId) === tab);

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Items</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Items & Materials</h1>
            <p className="page-desc">{items.length} items · {categories.length} categories</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isSuper && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (selected.size === 0) { alert('Select items first (use the checkboxes below).'); return; }
                  setDistributeOpen(true);
                }}
                title="Send selected stock items to other branches"
              ><IconShare size={16}/> Distribute to branches</button>
            )}
            <button className="btn btn-secondary" onClick={() => {
              const rows = items.map((it) => ({
                sku: it.sku, name: it.name, category: catMap.get(it.categoryId) || '',
                unit: it.unitOfMeasure, reorderPoint: it.reorderPoint || 0,
                costPerUnit: it.costPerUnit || 0, sellingPrice: it.sellingPricePerUnit || 0,
              }));
              import('@/lib/export').then(({ downloadCSV }) => downloadCSV('inventory-items', rows));
            }}><IconExport size={16}/> Export</button>
            <button className="btn btn-primary" onClick={() => openItemDrawer(null)}><IconPlus size={16}/> New Item</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16, position: 'relative', zIndex: 200 }}>
        <CategoryDropdown
          categories={categories}
          items={items}
          catMap={catMap}
          value={tab}
          onChange={setTab}
        />
      </div>

      <TopActionBar
        search={search} onSearch={setSearch}
        filters={<>
          <Select value="" onChange={() => {}} options={['All status', 'Active', 'Low stock', 'Out of stock', 'Archived']} placeholder="All status"/>
        </>}
        onExport={() => {}}
      />

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)' }}>
              <th style={{ padding: '12px 12px', width: 40 }}>
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  indeterminate={selected.size > 0 && selected.size < filtered.length}
                  onChange={() => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((it) => it.id)))}
                />
              </th>
              {['', 'Name', 'Category', 'Unit', 'Cost/Unit', 'Min Level', 'Status', ''].map((h, i) => (
                <th key={i} style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center' }} className="muted">Loading items…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <IconBox size={32} style={{ opacity: 0.3 }}/>
                <p style={{ marginTop: 12 }}>No inventory items yet.</p>
              </td></tr>
            ) : filtered.map((it) => (
              <tr key={it.id} style={{ borderTop: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '8px 12px', width: 40 }}>
                  <Checkbox
                    checked={selected.has(it.id)}
                    onChange={() => {
                      const s = new Set(selected);
                      s.has(it.id) ? s.delete(it.id) : s.add(it.id);
                      setSelected(s);
                    }}
                  />
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--matcha-50)', display: 'grid', placeItems: 'center', color: 'var(--matcha-700)' }}><IconLeaf size={18}/></div>
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 500, cursor: 'pointer' }} onClick={() => openItemDrawer(it)}>{displayName(it, lang)}</td>
                <td style={{ padding: '10px 12px' }}><span className="pill">{catMap.get(it.categoryId) ?? '—'}</span></td>
                <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>{it.unit}</td>
                <td style={{ padding: '10px 12px' }} className="tabular">{it.unitCost ? `฿${Number(it.unitCost).toLocaleString()}` : '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }} className="tabular">{it.minStockLevel ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={'pill ' + (it.isActive ? '' : 'pill-warning')} style={{ fontSize: 11 }}>
                    <span className="dot"/> {it.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => openItemDrawer(it)} title="Edit"><IconEdit size={14}/></button>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={() => handleDeleteItem(it)} title="Delete"><IconX size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={closeItemDrawer} title={editingItem ? 'Edit Item' : 'New Item'} subtitle={editingItem?.sku || ''}
        footer={<><button className="btn btn-ghost" onClick={closeItemDrawer}>Cancel</button><button className="btn btn-primary" onClick={handleSaveItem} disabled={savingItem}>{savingItem ? 'Saving...' : 'Save'}</button></>}>
        <Tabs items={[
          { value: 'basic', label: 'Basic' },
          { value: 'attributes', label: 'Attributes' },
          { value: 'stock', label: 'Stock' },
          { value: 'pricing', label: 'Pricing' },
        ]} value={itemTab} onChange={setItemTab}/>
        <div style={{ paddingTop: 20 }}>
          {itemTab === 'basic' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Name (EN)" required><input className="input" value={itemForm.name} onChange={(e) => setItemForm(f => ({ ...f, name: e.target.value }))}/></Field>
                <Field label="Name (TH)"><input className="input" value={itemForm.nameThai} onChange={(e) => setItemForm(f => ({ ...f, nameThai: e.target.value }))}/></Field>
                <Field label="SKU"><input className="input" value={itemForm.sku} onChange={(e) => setItemForm(f => ({ ...f, sku: e.target.value }))}/></Field>
                <Field label="Barcode"><input className="input" value={itemForm.barcode} onChange={(e) => setItemForm(f => ({ ...f, barcode: e.target.value }))}/></Field>
                <Field label="Category" required>
                  {showNewCategoryInput ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                      <input
                        className="input"
                        placeholder="New category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ height: 38, padding: '0 12px', minWidth: 50 }}
                        onClick={handleSaveNewCategory}
                        disabled={creatingCategory}
                      >
                        {creatingCategory ? '...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ height: 38, padding: '0 12px' }}
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                          setItemForm(f => ({ ...f, categoryId: null }));
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                      <select
                        className="input"
                        style={{ flex: 1 }}
                        value={itemForm.categoryId || ''}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setShowNewCategoryInput(true);
                          } else {
                            handleCategoryChange(e.target.value ? Number(e.target.value) : null);
                          }
                        }}
                      >
                        <option value="">— Select —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="new" style={{ fontWeight: 'bold', color: 'var(--matcha-700)' }}>+ Create New Category...</option>
                      </select>
                    </div>
                  )}
                </Field>
                <Field label="Unit">
                  <select className="input" value={itemForm.unitOfMeasure} onChange={(e) => setItemForm(f => ({ ...f, unitOfMeasure: e.target.value }))}>
                    {['g','kg','ml','l','piece','pack','box','bottle','can','bag'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Source">
                  <select className="input" value={itemForm.sourceFlag} onChange={(e) => setItemForm(f => ({ ...f, sourceFlag: e.target.value }))}>
                    <option value="hq_supply">HQ Supply</option>
                    <option value="customer_supplied">Customer-supplied</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </Field>
              </div>
              <Field label="Description"><textarea className="input" rows={3} value={itemForm.description} onChange={(e) => setItemForm(f => ({ ...f, description: e.target.value }))}/></Field>
            </>
          )}
          {itemTab === 'attributes' && (
            <DynamicAttributesSection
              categoryId={itemForm.categoryId}
              attributes={itemForm.attributes}
              onChange={(attrs) => setItemForm(f => ({ ...f, attributes: attrs }))}
              onAddOption={(attrId, label) => setAddOptionModal({ open: true, attributeId: attrId, label })}
            />
          )}
          {itemTab === 'stock' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Cost/Unit"><input className="input" type="number" step="0.01" value={itemForm.costPerUnit} onChange={(e) => setItemForm(f => ({ ...f, costPerUnit: e.target.value }))}/></Field>
                <Field label="Selling Price"><input className="input" type="number" step="0.01" value={itemForm.sellingPricePerUnit} onChange={(e) => setItemForm(f => ({ ...f, sellingPricePerUnit: e.target.value }))}/></Field>
                <Field label="Min Stock Level"><input className="input" type="number" value={itemForm.minStockLevel} onChange={(e) => setItemForm(f => ({ ...f, minStockLevel: e.target.value }))}/></Field>
                <Field label="Reorder Point"><input className="input" type="number" value={itemForm.reorderPoint} onChange={(e) => setItemForm(f => ({ ...f, reorderPoint: e.target.value }))}/></Field>
                <Field label="Reorder Qty"><input className="input" type="number" value={itemForm.reorderQuantity} onChange={(e) => setItemForm(f => ({ ...f, reorderQuantity: e.target.value }))}/></Field>
                <Field label="Lead Time (days)"><input className="input" type="number" value={itemForm.leadTimeDays} onChange={(e) => setItemForm(f => ({ ...f, leadTimeDays: e.target.value }))}/></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Shelf Life (days)"><input className="input" type="number" value={itemForm.shelfLifeDays} onChange={(e) => setItemForm(f => ({ ...f, shelfLifeDays: e.target.value }))}/></Field>
                <Field label="Storage">
                  <select className="input" value={itemForm.storageRequirements} onChange={(e) => setItemForm(f => ({ ...f, storageRequirements: e.target.value }))}>
                    <option value="">— Select —</option>
                    <option value="Room temp">Room temp</option>
                    <option value="Refrigerated">Refrigerated</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Cool & dry">Cool & dry</option>
                  </select>
                </Field>
              </div>
            </>
          )}
          {itemTab === 'pricing' && (
            <EmptyState illustration={<EmptyShelf/>} title="Pricing" desc="Pricing details will be managed here." action={<button className="btn btn-secondary btn-sm">Configure</button>}/>
          )}
        </div>
      </Drawer>

      {/* Add Option Modal */}
      <AddOptionModal
        isOpen={addOptionModal.open}
        onClose={() => setAddOptionModal({ open: false, attributeId: null, label: '' })}
        attributeId={addOptionModal.attributeId}
        attributeLabel={addOptionModal.label}
        onSubmit={handleAddOption}
      />

      {/* Universal Distribute Drawer */}
      <DistributeDrawer
        open={distributeOpen}
        onClose={() => { setDistributeOpen(false); }}
        entityType="stock_items"
        entityIds={Array.from(selected)}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
};

// ----- Receiving -----
export const PageInvReceiving = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const { data: items = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const receiveMut = trpc.inventory.receiveStock.useMutation({
    onSuccess: () => { alert('Stock received successfully'); setLines([{ itemId: '', quantity: 0, costPerUnit: '', notes: '' }]); },
    onError: (e) => alert(e.message),
  });

  const [lines, setLines] = useState([{ itemId: '', quantity: 0, costPerUnit: '', notes: '' }]);
  const [notes, setNotes] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { itemId: '', quantity: 0, costPerUnit: '', notes: '' }]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const submit = () => {
    if (!branchId) { alert('No branch selected'); return; }
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0);
    if (validLines.length === 0) { alert('Add at least one item'); return; }
    receiveMut.mutate({
      branchId,
      referenceType: 'manual',
      items: validLines.map((l) => ({
        inventoryItemId: Number(l.itemId),
        quantity: Number(l.quantity),
        costPerUnit: l.costPerUnit ? Number(l.costPerUnit) : undefined,
        notes: l.notes || notes || undefined,
      })),
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Receiving</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Receiving</h1>
            <p className="page-desc">Record incoming stock · auto-adds to inventory</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => {
              const { captureImageFromCamera, runOCR, parseInvoiceText } = await import('@/lib/ocr');
              const img = await captureImageFromCamera();
              if (!img) return;
              setOcrBusy(true);
              try {
                const { text } = await runOCR(img, { onProgress: setOcrProgress });
                const parsed = parseInvoiceText(text);
                if (parsed.items.length === 0) {
                  alert('No items detected. You can still enter manually.\n\nOCR raw text:\n' + text.slice(0, 500));
                  setOcrBusy(false);
                  return;
                }
                // Map parsed items to inventory items by name fuzzy-match
                const newLines = parsed.items.map((it) => {
                  const match = items.find((iv) => it.description.toLowerCase().includes(iv.name.toLowerCase()));
                  return {
                    itemId: match ? String(match.id) : '',
                    quantity: it.quantity || 1,
                    notes: it.description + (it.unitPrice ? ` @ ฿${it.unitPrice}` : ''),
                  };
                });
                setLines(newLines);
                alert(`OCR found ${parsed.items.length} item(s). Review and adjust before confirming.`);
              } catch (err) {
                alert('OCR failed: ' + err.message);
              } finally {
                setOcrBusy(false);
                setOcrProgress(0);
              }
            }} disabled={ocrBusy} className="btn btn-secondary" title="Snap a photo of an invoice/PO to auto-populate">
              <IconScanner size={16}/> {ocrBusy ? `OCR ${ocrProgress}%…` : 'Scan invoice'}
            </button>
            <button onClick={submit} disabled={receiveMut.isPending} className="btn btn-primary">
              <IconCheck size={16}/> {receiveMut.isPending ? 'Saving…' : 'Confirm & Add to Stock'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SectionHeader title="Items received"/>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
              {['Item', 'Qty', 'Cost/Unit (฿)', 'Notes', ''].map((h) => (
                <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((row, i) => (
              <tr key={i}>
                <td style={{ padding: '8px' }}>
                  <Select
                    value={row.itemId}
                    onChange={(v) => updateLine(i, { itemId: v })}
                    options={items.map((it) => ({ value: String(it.id), label: `${it.sku ?? ''} ${it.name}`.trim() }))}
                    placeholder="Choose item…"
                  />
                </td>
                <td style={{ padding: '8px', width: 100 }}>
                  <input className="input" type="number" value={row.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}/>
                </td>
                <td style={{ padding: '8px', width: 120 }}>
                  <input className="input" type="number" step="0.01" value={row.costPerUnit} placeholder="ต้นทุน/หน่วย"
                    onChange={(e) => updateLine(i, { costPerUnit: e.target.value })}/>
                </td>
                <td style={{ padding: '8px' }}>
                  <input className="input" value={row.notes} placeholder="Lot, batch, exp date…"
                    onChange={(e) => updateLine(i, { notes: e.target.value })}/>
                </td>
                <td style={{ padding: '8px', width: 28 }}>
                  <button onClick={() => removeLine(i)} className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }}><IconX size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}><IconPlus size={14}/> Add Item Line</button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <Field label="Notes (applies to all lines without a specific note)">
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Driver was late, packages intact…"/>
        </Field>
      </div>
    </div>
  );
};

// ----- Stock Count -----
export const PageInvCount = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const { data: stockItems = [], refetch } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, staleTime: 5000, refetchOnWindowFocus: true }
  );
  const countMut = trpc.inventory.countStock.useMutation({
    onSuccess: () => { alert('Count submitted — adjustments recorded'); setCounts({}); refetch(); },
    onError: (e) => alert(e.message),
  });

  const [counts, setCounts] = useState({}); // { itemId: countedQty }
  const [search, setSearch] = useState('');

  const filtered = stockItems.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.item?.name ?? '').toLowerCase().includes(q) || (s.item?.sku ?? '').toLowerCase().includes(q);
  });

  const submit = () => {
    if (!branchId) { alert('No branch selected'); return; }
    const entries = Object.entries(counts).filter(([, v]) => v !== '' && !isNaN(Number(v)));
    if (entries.length === 0) { alert('Enter at least one count'); return; }
    countMut.mutate({
      branchId,
      counts: entries.map(([itemId, counted]) => ({
        inventoryItemId: Number(itemId),
        countedQuantity: Number(counted),
      })),
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Stock Count</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Stock Count</h1>
            <p className="page-desc">Reconcile expected vs. physical stock · variances logged as adjustments</p>
          </div>
          <button className="btn btn-primary" disabled={countMut.isPending} onClick={submit}>
            <IconCheck size={16}/> {countMut.isPending ? 'Submitting…' : 'Submit Count'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <input className="input" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)}/>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)' }}>
              {['Item', 'Unit', 'Expected', 'Counted', 'Variance'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center' }} className="muted">No stock records — add items in Inventory → Items.</td></tr>
            ) : filtered.map((s) => {
              const expected = Number(s.currentStock ?? 0);
              const countedRaw = counts[s.inventoryItemId];
              const counted = countedRaw !== undefined ? Number(countedRaw) : null;
              const variance = counted !== null ? counted - expected : null;
              return (
                <tr key={s.inventoryItemId} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{s.item?.name}</div>
                    {s.item?.sku && <div className="muted mono" style={{ fontSize: 11 }}>{s.item.sku}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{s.item?.unitOfMeasure ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }} className="tabular">{expected}</td>
                  <td style={{ padding: '12px 16px', width: 120 }}>
                    <input className="input" type="number" value={countedRaw ?? ''}
                      onChange={(e) => setCounts((c) => ({ ...c, [s.inventoryItemId]: e.target.value }))}/>
                  </td>
                  <td style={{ padding: '12px 16px' }} className="tabular">
                    {variance === null ? '—' : (
                      <span style={{ color: variance === 0 ? 'var(--matcha-700)' : variance > 0 ? 'var(--info)' : 'var(--danger)', fontWeight: 500 }}>
                        {variance > 0 ? '+' : ''}{variance}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ----- Transfers -----
export const PageInvTransfer = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const [tab, setTab] = useState('outgoing');
  const [transferDrawer, setTransferDrawer] = useState(false);
  const [transferForm, setTransferForm] = useState({ toBranchId: '', items: [], note: '' });

  const { data: outgoingData, isLoading: outLoading } = trpc.inventory.listMovements.useQuery(
    { branchId, type: 'transferred_out', limit: 50 },
    { enabled: !!branchId, staleTime: 15000, refetchOnWindowFocus: true }
  );
  const { data: incomingData, isLoading: inLoading } = trpc.inventory.listMovements.useQuery(
    { branchId, type: 'transferred_in', limit: 50 },
    { enabled: !!branchId, staleTime: 15000, refetchOnWindowFocus: true }
  );
  const { data: items = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: branches = [] } = trpc.branches.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: stockHere = [] } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, staleTime: 5000, refetchOnWindowFocus: true }
  );

  // Is this branch HQ?
  const myBranch = branches.find((b) => b.id === branchId);
  const isHQ = myBranch?.branchType === 'hq';
  const targetBranches = branches.filter((b) => b.id !== branchId && b.status === 'active');

  const transferStock = trpc.inventory.transferStock.useMutation({
    onSuccess: () => {
      setTransferDrawer(false);
      setTransferForm({ toBranchId: '', items: [], note: '' });
    },
    onError: (e) => alert('Transfer failed: ' + (e.message || 'Unknown')),
  });

  const addTransferItem = () => setTransferForm((f) => ({ ...f, items: [...f.items, { inventoryItemId: '', quantity: '', unitOfMeasure: 'piece' }] }));
  const updateTransferItem = (idx, patch) => setTransferForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const removeTransferItem = (idx) => setTransferForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const submitTransfer = () => {
    if (!transferForm.toBranchId) { alert('Pick a destination branch'); return; }
    const validItems = transferForm.items.filter((it) => it.inventoryItemId && it.quantity && Number(it.quantity) > 0);
    if (validItems.length === 0) { alert('Add at least one item with a quantity'); return; }
    transferStock.mutate({
      fromBranchId: branchId,
      toBranchId: Number(transferForm.toBranchId),
      items: validItems.map((it) => ({
        inventoryItemId: Number(it.inventoryItemId),
        quantity: it.quantity,
        unitOfMeasure: it.unitOfMeasure || 'piece',
      })),
      transferNote: transferForm.note || undefined,
    });
  };

  const outgoing = Array.isArray(outgoingData) ? outgoingData : (outgoingData?.movements ?? []);
  const incoming = Array.isArray(incomingData) ? incomingData : (incomingData?.movements ?? []);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const isLoading = outLoading || inLoading;
  const current = tab === 'outgoing' ? outgoing : incoming;

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Transfers</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Stock Transfers</h1>
            <p className="page-desc">Move inventory between branches · {outgoing.length} outgoing · {incoming.length} incoming</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setTransferDrawer(true)}
            disabled={!isHQ}
            title={isHQ ? 'Send stock to another branch' : 'Only Hibi House (HQ) can create transfers'}
          ><IconPlus size={16}/> New Transfer</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs items={[
          { value: 'outgoing', label: 'Outgoing', count: outgoing.length },
          { value: 'incoming', label: 'Incoming', count: incoming.length },
        ]} value={tab} onChange={setTab}/>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <SectionHeader title="Transfer workflow" desc="Standard lifecycle for inter-branch stock movement"/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'auto', padding: '4px 0' }}>
          {['Draft', 'Requested', 'Approved', 'Picking', 'In Transit', 'Delivered', 'Received'].map((s, i) => (
            <React.Fragment key={s}>
              <div style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'var(--bg-muted)',
                color: 'var(--text-tertiary)',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
              }}>{s}</div>
              {i < 6 && <IconChevRight size={14} style={{ color: 'var(--text-quaternary)', flex: 'none' }}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="muted" style={{ textAlign: 'center', padding: 40 }}>Loading transfers…</div>
      ) : current.length === 0 ? (
        <EmptyState
          icon={<IconTruck size={48}/>}
          title={`No ${tab} transfers`}
          desc={tab === 'outgoing'
            ? "No stock has been transferred out from this branch yet."
            : "No incoming stock transfers received yet."}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {current.map((m) => {
            const item = itemMap.get(m.itemId);
            const fromBranch = branchMap.get(m.branchId);
            return (
              <div key={m.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>#{m.id}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontWeight: 500 }}>{fromBranch?.name || 'Branch'}</span>
                      <IconChevRight size={14} style={{ color: 'var(--text-tertiary)' }}/>
                      <span style={{ fontWeight: 500 }}>{m.referenceType || (tab === 'outgoing' ? 'Destination' : 'Source')}</span>
                    </div>
                  </div>
                  <span className={'pill ' + (tab === 'outgoing' ? 'pill-warning' : 'pill-matcha')}><span className="dot"/> {tab === 'outgoing' ? 'Transferred Out' : 'Transferred In'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', paddingTop: 10, paddingBottom: 10 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item?.name || `Item #${m.itemId}`}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{item?.itemCode || ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', paddingTop: 10, borderTop: '1px solid var(--border-default)' }}>
                  <span className="tabular">{Math.abs(Number(m.quantity ?? 0))} {m.unitOfMeasure || ''}</span>
                  {m.costValue != null && <><span>·</span><span className="tabular">฿{Number(m.costValue).toLocaleString()}</span></>}
                  <span style={{ flex: 1 }}/>
                  <span className="muted" style={{ fontSize: 11 }}>{fmtDate(m.createdAt)}</span>
                </div>
                {m.notes && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8, padding: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-subtle)' }}>{m.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HQ Distribution Drawer */}
      <Drawer
        open={transferDrawer}
        onClose={() => setTransferDrawer(false)}
        title="Distribute stock"
        subtitle={`From ${myBranch?.name || 'this branch'} to another branch`}
        width={560}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setTransferDrawer(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={submitTransfer}
            disabled={transferStock.isPending || !transferForm.toBranchId || transferForm.items.length === 0}
          >{transferStock.isPending ? 'Transferring…' : 'Send Transfer'}</button>
        </>}
      >
        {!isHQ && (
          <div style={{ padding: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-default)', color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
            ⚠ Only the HQ branch (Hibi House) is allowed to distribute stock to other branches.
          </div>
        )}
        <Field label="Destination branch" required>
          <select className="input" value={transferForm.toBranchId} onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}>
            <option value="">— Select branch —</option>
            {targetBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.branchCode}) · {b.province || '—'}</option>
            ))}
          </select>
        </Field>

        <div className="t-caption" style={{ marginBottom: 8, marginTop: 12 }}>Items to send</div>
        <div className="card" style={{ padding: 12 }}>
          {transferForm.items.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 13 }}>No items added.</div>
          ) : transferForm.items.map((it, i) => {
            const stockRow = stockHere.find((s) => s.itemId === Number(it.inventoryItemId) || s.item?.id === Number(it.inventoryItemId));
            const available = stockRow?.currentStock ?? 0;
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 100px 28px', gap: 8, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'flex-start' }}>
                <div>
                  <select className="input" value={it.inventoryItemId} onChange={(e) => updateTransferItem(i, { inventoryItemId: e.target.value })}>
                    <option value="">— Pick item —</option>
                    {items.map((iv) => <option key={iv.id} value={iv.id}>{iv.name}{iv.itemCode ? ` (${iv.itemCode})` : ''}</option>)}
                  </select>
                  {it.inventoryItemId && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Available here: {available}</div>
                  )}
                </div>
                <input className="input" type="number" step="0.01" value={it.quantity} onChange={(e) => updateTransferItem(i, { quantity: e.target.value })} placeholder="Qty"/>
                <select className="input" value={it.unitOfMeasure} onChange={(e) => updateTransferItem(i, { unitOfMeasure: e.target.value })}>
                  {['g', 'kg', 'ml', 'l', 'piece', 'pack', 'box', 'bottle', 'can', 'bag'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeTransferItem(i)}><IconX size={12}/></button>
              </div>
            );
          })}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={addTransferItem}><IconPlus size={14}/> Add item</button>
        </div>

        <Field label="Transfer note (optional)">
          <textarea className="input" rows={2} value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} placeholder="Why is this being transferred…"/>
        </Field>
      </Drawer>
    </div>
  );
};

// ----- Movements log -----
export const PageInvMovements = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const [typeFilter, setTypeFilter] = useState('');

  const { data: movements = [], isLoading } = trpc.inventory.listMovements.useQuery(
    branchId ? { branchId, type: typeFilter || undefined } : undefined,
    { staleTime: 15000, refetchOnWindowFocus: true }
  );
  const { data: items = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const itemMap = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);

  const typeColor = {
    received: 'var(--matcha-700)',
    used: 'var(--text-secondary)',
    transferred_in: 'var(--info)',
    transferred_out: 'var(--info)',
    adjusted: 'var(--warning)',
    wasted: 'var(--danger)',
    expired: 'var(--danger)',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Inventory / Movement Log</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Movement Log</h1>
            <p className="page-desc">Full audit trail of stock changes · {movements.length} entries</p>
          </div>
          <button className="btn btn-secondary"><IconExport size={16}/> Export</button>
        </div>
      </div>

      <TopActionBar
        search="" onSearch={() => {}}
        filters={<>
          <Select value={typeFilter} onChange={setTypeFilter} options={['', 'received', 'used', 'transferred_in', 'transferred_out', 'adjusted', 'wasted', 'expired']} placeholder="All types"/>
        </>}
        onExport={() => {}}
      />

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 800 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)' }}>
              {['Time', 'Type', 'Item', 'Quantity', 'Reference', 'Notes'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }} className="muted">Loading movements…</td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>No movements recorded yet.</td></tr>
            ) : movements.map((m) => {
              const item = itemMap.get(m.inventoryItemId);
              const time = m.createdAt ? new Date(m.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—';
              const color = typeColor[m.movementType] ?? 'var(--text-secondary)';
              const isPositive = Number(m.quantity) > 0;
              return (
                <tr key={m.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }} className="tabular">{time}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>{m.movementType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item?.name ?? `Item #${m.inventoryItemId}`}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color }} className="tabular">
                    {isPositive ? '+' : ''}{m.quantity} {m.unitOfMeasure ?? ''}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {m.referenceType ? `${m.referenceType}${m.referenceId ? ` #${m.referenceId}` : ''}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{m.notes ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ─── Category Dropdown (replaces overflow tabs) ───────────────────────────────
const CategoryDropdown = ({ categories, items, catMap, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // TRPC utils and mutations for Category management
  const utils = trpc.useUtils();
  const createCategoryMut = trpc.inventory.createCategory.useMutation();
  const deleteCategoryMut = trpc.inventory.deleteCategory.useMutation();
  const [newCatText, setNewCatText] = useState('');
  const [creating, setCreating] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Count items per category
  const countMap = useMemo(() => {
    const m = new Map();
    items.forEach((it) => {
      const catName = catMap.get(it.categoryId) || 'Uncategorized';
      m.set(catName, (m.get(catName) || 0) + 1);
    });
    return m;
  }, [items, catMap]);

  const filteredCats = categories.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNewCategory = async () => {
    if (!newCatText.trim()) return;
    setCreating(true);
    try {
      await createCategoryMut.mutateAsync({
        name: newCatText.trim(),
      });
      await utils.inventory.listCategories.invalidate();
      setNewCatText('');
    } catch (err) {
      alert('Failed to create category: ' + (err.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCategory = async (e, id, name) => {
    e.stopPropagation(); // Prevent dropdown item selection click
    if (window.confirm(`ลบหมวดหมู่ "${name}"? ไอเทมที่อยู่ในหมวดหมู่นี้จะกลายเป็นไม่มีหมวดหมู่`)) {
      try {
        await deleteCategoryMut.mutateAsync({ id });
        await utils.inventory.listCategories.invalidate();
        if (value === name) {
          onChange('all');
        }
      } catch (err) {
        alert('Failed to delete category: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const currentLabel = value === 'all' ? 'All Categories' : value;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', zIndex: 200 }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, padding: '8px 14px' }}
      >
        <IconBox size={15}/>
        <span>{currentLabel}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({value === 'all' ? items.length : (countMap.get(value) || 0)})</span>
        <IconChevDown size={14} style={{ marginLeft: 4, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}/>
      </button>

      {open && (
        <>
        {/* Backdrop to block clicks on content behind */}
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent',
        }}/>
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 9999,
          background: '#ffffff', border: '1px solid rgba(20,30,20,0.1)', borderRadius: 12,
          boxShadow: '0 16px 40px rgba(20,30,20,0.12), 0 6px 12px rgba(20,30,20,0.08)', width: 280, maxHeight: 380, display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 120ms ease-out', overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-subtle)', padding: '6px 10px' }}>
              <IconSearch size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
            {/* All option */}
            <button
              onClick={() => { onChange('all'); setOpen(false); setSearch(''); }}
              style={{
                width: '100%', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
                background: value === 'all' ? 'var(--matcha-50)' : 'transparent',
                color: value === 'all' ? 'var(--matcha-700)' : 'var(--text-primary)',
                fontSize: 13, fontWeight: value === 'all' ? 500 : 400, textAlign: 'left',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (value !== 'all') e.currentTarget.style.background = 'var(--bg-muted)'; }}
              onMouseLeave={(e) => { if (value !== 'all') e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ flex: 1 }}>All Categories</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{items.length}</span>
              {value === 'all' && <IconCheck size={14} style={{ color: 'var(--matcha-600)' }}/>}
            </button>

            {/* Separator */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 12px' }}/>

            {/* Category list */}
            {filteredCats.length === 0 && (
              <div style={{ padding: '16px 14px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                No categories found
              </div>
            )}
            {filteredCats.map((c) => {
              const isActive = value === c.name;
              const count = countMap.get(c.name) || 0;
              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: isActive ? 'var(--matcha-50)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <button
                    onClick={() => { onChange(c.name); setOpen(false); setSearch(''); }}
                    style={{
                      flex: 1, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
                      color: isActive ? 'var(--matcha-700)' : 'var(--text-primary)',
                      fontSize: 13, fontWeight: isActive ? 500 : 400, textAlign: 'left',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{count}</span>
                    {isActive && <IconCheck size={14} style={{ color: 'var(--matcha-600)', flexShrink: 0 }}/>}
                  </button>
                  <button
                    onClick={(e) => handleDeleteCategory(e, c.id, c.name)}
                    style={{
                      padding: '4px 10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--red-500)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.6,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                    title="Delete Category"
                  >
                    <IconX size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Category Input */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-muted)', alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1, height: 32, fontSize: 12, padding: '0 8px', background: '#ffffff' }}
              placeholder="New category..."
              value={newCatText}
              onChange={(e) => setNewCatText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewCategory(); }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: 32, width: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              onClick={handleAddNewCategory}
              disabled={creating}
            >
              <IconPlus size={14}/>
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
