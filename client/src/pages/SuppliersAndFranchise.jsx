// ============================================
// Page: suppliers_franchise
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { EmptyShelf,EmptyZen,IconCheck,IconChevRight,IconExport,IconGlobe,IconImport,IconMore,IconMoreV,IconPlus,IconRefresh,IconShare,IconX } from "@/icons";
import { useApp,Drawer,Field,Select,Toggle,Tabs,TopActionBar,EmptyState,Placeholder,SectionHeader } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";


// ----- Supplier Directory -----
export const PageSuppliers = () => {
  const { navigate } = useApp();
  const [search, setSearch] = useState('');
  const [addDrawer, setAddDrawer] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ companyName: '', contactPerson: '', country: '', province: '', email: '', phone: '' });

  const { data: suppliers = [], isLoading, refetch } = trpc.suppliers.list.useQuery(
    { search: search || undefined },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => { refetch(); setAddDrawer(false); setNewSupplier({ companyName: '', contactPerson: '', country: '', province: '', email: '', phone: '' }); },
    onError: (e) => alert(e.message),
  });
  const deleteSupplier = trpc.suppliers.delete.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const handleDeleteSupplier = (s) => { if (window.confirm(`ลบ Supplier "${s.companyName}"? ข้อมูลจะหายถาวร`)) deleteSupplier.mutate({ id: s.id }); };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Suppliers / Directory</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Supplier Directory</h1>
            <p className="page-desc">{suppliers.length} suppliers</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setAddDrawer(true)}><IconPlus size={16}/> New Supplier</button>
          </div>
        </div>
      </div>

      <TopActionBar
        search={search} onSearch={setSearch}
        filters={<>
          <Select value="" onChange={() => {}} options={['Active', 'Inactive', 'All']} placeholder="Active"/>
        </>}
        viewMode="grid" onViewMode={() => {}}
        onExport={() => {}}
      />

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1,2,3].map((i) => <div key={i} className="card" style={{ height: 200, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <EmptyShelf/>
          <p style={{ marginTop: 12, fontWeight: 500 }}>No suppliers yet</p>
          <p style={{ fontSize: 13 }}>Add your first supplier to start creating purchase orders.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAddDrawer(true)}><IconPlus size={14}/> Add Supplier</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {suppliers.map((s, i) => (
            <div key={s.id} className="card" style={{ padding: 20, animation: `slideUp 360ms var(--ease-out-expo) ${i * 50}ms both`, transition: 'transform 240ms, box-shadow 240ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: `oklch(72% 0.08 ${(s.id * 60) % 360})`, color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18 }}>{(s.companyName ?? '?')[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.companyName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{s.contactPerson ?? s.country ?? '—'}</div>
                </div>
                <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={(e) => { e.stopPropagation(); handleDeleteSupplier(s); }} title="Delete"><IconX size={14}/></button>
              </div>
              {(s.province || s.country) && (
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconGlobe size={12}/> {[s.province, s.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/backoffice/purchase-orders')}><IconPlus size={14}/> Order</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={addDrawer} onClose={() => setAddDrawer(false)} title="New Supplier"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddDrawer(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={createSupplier.isPending} onClick={() => createSupplier.mutate(newSupplier)}>
            {createSupplier.isPending ? 'Creating…' : 'Create Supplier'}
          </button>
        </>}>
        <Field label="Company name" required><input className="input" value={newSupplier.companyName} onChange={(e) => setNewSupplier(s => ({ ...s, companyName: e.target.value }))}/></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Contact person"><input className="input" value={newSupplier.contactPerson} onChange={(e) => setNewSupplier(s => ({ ...s, contactPerson: e.target.value }))}/></Field>
          <Field label="Country"><input className="input" placeholder="Thailand, Japan…" value={newSupplier.country} onChange={(e) => setNewSupplier(s => ({ ...s, country: e.target.value }))}/></Field>
          <Field label="Province"><input className="input" value={newSupplier.province} onChange={(e) => setNewSupplier(s => ({ ...s, province: e.target.value }))}/></Field>
          <Field label="Email"><input className="input" type="email" value={newSupplier.email} onChange={(e) => setNewSupplier(s => ({ ...s, email: e.target.value }))}/></Field>
          <Field label="Phone"><input className="input" value={newSupplier.phone} onChange={(e) => setNewSupplier(s => ({ ...s, phone: e.target.value }))}/></Field>
        </div>
      </Drawer>
    </div>
  );
};

// ----- Supplier detail -----
export const PageSupplierDetail = () => {
  const { route, navigate } = useApp();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const supplierId = useMemo(() => {
    const path = (route || '').split('?')[0];
    const m = path.match(/\/suppliers\/(\d+)/) || path.match(/\/backoffice\/suppliers\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [route]);
  const { data: supplier, isLoading, refetch } = trpc.suppliers.getById.useQuery(
    { id: supplierId ?? 0 }, { enabled: !!supplierId }
  );
  const { data: supplierPOs = [] } = trpc.purchaseOrders.list.useQuery(
    { supplierId: supplierId ?? undefined }, { enabled: !!supplierId && tab === 'orders' }
  );
  const updateSupplier = trpc.suppliers.update.useMutation({ onSuccess: () => { refetch(); setEditing(false); } });
  const [form, setForm] = useState({});
  useEffect(() => { if (supplier) setForm(supplier); }, [supplier]);

  if (isLoading) return <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}><div className="muted">Loading...</div></div>;
  if (!supplier) return <div className="page"><EmptyState illustration={<EmptyShelf/>} title="Supplier not found" desc="This supplier may have been deleted." action={<button className="btn btn-primary" onClick={() => navigate('/backoffice/suppliers')}>Back to Suppliers</button>}/></div>;

  return (
    <div className="page">
      <div className="breadcrumb">Suppliers / {supplier.companyName}</div>
      <div className="card" style={{ padding: 28, marginBottom: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 88, height: 88, borderRadius: 14, background: `oklch(72% 0.08 ${((supplierId||1) * 47) % 360})`, color: 'white', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 700 }}>{(supplier.companyName || 'S')[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>{supplier.companyName}</h1>
              <span className={`pill ${supplier.status === 'active' ? 'pill-matcha' : 'pill-neutral'}`}><span className="dot"/> {supplier.status}</span>
            </div>
            <div className="muted" style={{ marginBottom: 12 }}>{supplier.contactPerson || ''} {supplier.country ? `· ${supplier.country}` : ''} {supplier.paymentTerms ? `· ${supplier.paymentTerms}` : ''}</div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
              <Stat label="Total POs" value={String(supplier.stats?.totalOrders ?? 0)}/>
              <Stat label="Total spend" value={`฿${((supplier.stats?.totalSpend ?? 0)/1000).toFixed(0)}k`}/>
              <Stat label="Rating" value={supplier.performanceRating ? `${supplier.performanceRating}/5` : '-'}/>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            <button className="btn btn-primary" onClick={() => navigate('/backoffice/purchase-orders')}><IconPlus size={16}/> New PO</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs items={['Overview', 'Orders', 'Notes'].map((l) => ({ value: l.toLowerCase(), label: l }))} value={tab} onChange={setTab}/>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }} className="inv-grid">
          <div className="card" style={{ padding: 24 }}>
            <SectionHeader title="Company Information" action={editing && <button className="btn btn-primary btn-sm" onClick={() => updateSupplier.mutate({ id: supplierId, data: { companyName: form.companyName, companyNameThai: form.companyNameThai, contactPerson: form.contactPerson, email: form.email, phone: form.phone, lineId: form.lineId, address: form.address, country: form.country, paymentTerms: form.paymentTerms, currency: form.currency, notes: form.notes } })}>{updateSupplier.isPending ? 'Saving…' : 'Save'}</button>}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Company name"><input className="input" value={form.companyName || ''} onChange={e => setForm({...form, companyName: e.target.value})} readOnly={!editing}/></Field>
              <Field label="ชื่อไทย"><input className="input" value={form.companyNameThai || ''} onChange={e => setForm({...form, companyNameThai: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Contact person"><input className="input" value={form.contactPerson || ''} onChange={e => setForm({...form, contactPerson: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Country"><input className="input" value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} readOnly={!editing}/></Field>
            </div>
            <SectionHeader title="Contact"/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Email"><input className="input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Phone"><input className="input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} readOnly={!editing}/></Field>
              <Field label="LINE ID"><input className="input" value={form.lineId || ''} onChange={e => setForm({...form, lineId: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Address"><input className="input" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} readOnly={!editing}/></Field>
            </div>
            <SectionHeader title="Payment terms"/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Terms"><input className="input" value={form.paymentTerms || ''} onChange={e => setForm({...form, paymentTerms: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Currency"><input className="input" value={form.currency || ''} onChange={e => setForm({...form, currency: e.target.value})} readOnly={!editing}/></Field>
              <Field label="Notes"><input className="input" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} readOnly={!editing}/></Field>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader title="Stats"/>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total POs</span><b>{supplier.stats?.totalOrders ?? 0}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Spend</span><b>฿{(supplier.stats?.totalSpend ?? 0).toLocaleString()}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Rating</span><b>{supplier.performanceRating || '-'}</b></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'orders' && (
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Purchase Orders"/>
          {supplierPOs.length === 0 ? <EmptyState illustration={<EmptyShelf/>} title="No POs yet" desc="Create a Purchase Order for this supplier."/> : (
            <table className="table">
              <thead><tr><th>PO #</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>{supplierPOs.map(po => <tr key={po.id}><td>{po.poNumber}</td><td>{new Date(po.createdAt).toLocaleDateString()}</td><td><span className={`pill ${po.status === 'approved' ? 'pill-matcha' : 'pill-neutral'}`}>{po.status}</span></td><td>฿{Number(po.totalAmount ?? 0).toLocaleString()}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'notes' && (
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Notes"/>
          <p className="muted">{supplier.notes || 'No notes yet.'}</p>
        </div>
      )}
    </div>
  );
};

// ----- New PO Form -----
const NewPOForm = ({ branchId, onCreated }) => {
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const { data: invItems = [] } = trpc.inventory.listItems.useQuery();
  const createPO = trpc.purchaseOrders.create.useMutation({ onSuccess: () => onCreated() });

  const [supplierId, setSupplierId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [requiredDate, setRequiredDate] = useState('');
  const [notesToSupplier, setNotesToSupplier] = useState('');
  const [items, setItems] = useState([{ inventoryItemId: '', qty: '1', unitCost: '', unit: '' }]);
  const [searchTerm, setSearchTerm] = useState('');

  const addItem = () => setItems([...items, { inventoryItemId: '', qty: '1', unitCost: '', unit: '' }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    if (field === 'inventoryItemId') {
      const found = invItems.find(i => String(i.id) === val);
      if (found) next[idx].unit = found.unit || 'piece';
    }
    setItems(next);
  };

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) * Number(it.unitCost || 0)), 0);
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const handleSubmit = () => {
    if (!supplierId) return alert('กรุณาเลือก Supplier');
    const validItems = items.filter(it => it.inventoryItemId && Number(it.qty) > 0);
    if (validItems.length === 0) return alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
    createPO.mutate({
      supplierId: Number(supplierId),
      branchId: branchId || 1,
      orderDate: new Date().toISOString().split('T')[0],
      requiredDate: requiredDate || undefined,
      priority,
      notesToSupplier: notesToSupplier || undefined,
      items: validItems.map(it => ({
        inventoryItemId: Number(it.inventoryItemId),
        quantityOrdered: it.qty,
        unitOfMeasure: it.unit || 'piece',
        unitCost: it.unitCost || '0',
      })),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <SectionHeader title="Supplier & Details"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Supplier *">
            <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">-- เลือก Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}{s.companyNameThai ? ` (${s.companyNameThai})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Required by">
            <input type="date" className="input" value={requiredDate} onChange={e => setRequiredDate(e.target.value)}/>
          </Field>
          <Field label="Notes to supplier">
            <input className="input" value={notesToSupplier} onChange={e => setNotesToSupplier(e.target.value)} placeholder="หมายเหตุ..."/>
          </Field>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <SectionHeader title="Items"/>
        <div style={{ marginBottom: 12 }}>
          <input className="input" placeholder="ค้นหา item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ maxWidth: 300 }}/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((it, idx) => {
            const filteredItems = searchTerm
              ? invItems.filter(i => (i.name + (i.nameThai || '')).toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 30)
              : invItems.slice(0, 50);
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 32px', gap: 8, alignItems: 'center' }}>
                <select className="input" value={it.inventoryItemId} onChange={e => updateItem(idx, 'inventoryItemId', e.target.value)}>
                  <option value="">-- เลือก item --</option>
                  {filteredItems.map(i => <option key={i.id} value={i.id}>{i.name}{i.nameThai ? ` (${i.nameThai})` : ''}</option>)}
                </select>
                <input className="input" type="number" min="1" value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} placeholder="Qty"/>
                <input className="input" type="number" min="0" step="0.01" value={it.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)} placeholder="ราคา/หน่วย"/>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{it.unit || '-'}</span>
                {items.length > 1 && <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => removeItem(idx)}><IconX size={14}/></button>}
              </div>
            );
          })}
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={addItem}><IconPlus size={14}/> เพิ่มรายการ</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <div className="muted">Subtotal: <span className="tabular">฿{subtotal.toLocaleString()}</span></div>
          <div className="muted">VAT 7%: <span className="tabular">฿{tax.toFixed(2)}</span></div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Total: <span className="tabular">฿{total.toFixed(2)}</span></div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={createPO.isPending}>
          {createPO.isPending ? 'Creating...' : 'สร้าง PO'}
        </button>
      </div>
    </div>
  );
};

// ----- Purchase Orders -----
export const PagePurchaseOrders = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const [tab, setTab] = useState('all');
  const [openPOId, setOpenPOId] = useState(null);

  const { data: pos = [], isLoading, refetch } = trpc.purchaseOrders.list.useQuery(
    { branchId: branchId ?? undefined, status: tab === 'all' ? undefined : tab },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: openPO, refetch: refetchPO } = trpc.purchaseOrders.getById.useQuery(
    { id: openPOId ?? 0 },
    { enabled: !!openPOId && openPOId !== 'new' }
  );
  const poSuccess = (msg) => () => { refetch(); refetchPO(); if(window.__toast) window.__toast(msg); };
  const poError = (e) => { if(window.__toast) window.__toast('Error: ' + (e?.message || 'Failed'), 'error'); };

  const submit = trpc.purchaseOrders.submitForApproval.useMutation({ onSuccess: poSuccess('Submitted for approval'), onError: poError });
  const approve = trpc.purchaseOrders.approve.useMutation({ onSuccess: poSuccess('PO Approved'), onError: poError });
  const reject = trpc.purchaseOrders.reject.useMutation({ onSuccess: poSuccess('PO Rejected'), onError: poError });
  const markSent = trpc.purchaseOrders.markSent.useMutation({ onSuccess: poSuccess('Marked as Sent'), onError: poError });
  const receiveItems = trpc.purchaseOrders.receiveItems.useMutation({ onSuccess: poSuccess('Items Received'), onError: poError });
  const closePO = trpc.purchaseOrders.close.useMutation({ onSuccess: poSuccess('PO Closed'), onError: poError });
  const cancelPO = trpc.purchaseOrders.cancel.useMutation({ onSuccess: poSuccess('PO Cancelled'), onError: poError });
  const deletePO = trpc.purchaseOrders.delete.useMutation({ onSuccess: () => { refetch(); setOpenPOId(null); if(window.__toast) window.__toast('PO Deleted'); }, onError: poError });
  const handleDeletePO = (e, po) => { e.stopPropagation(); if (window.confirm(`ลบ PO "${po.poNumber}"? ข้อมูลจะหายถาวร`)) deletePO.mutate({ id: po.id }); };

  const counts = pos.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc; }, {});

  const statusColor = {
    'draft': '', 'pending_approval': 'pill-warning', 'approved': 'pill-matcha',
    'sent': 'pill-info', 'partial': 'pill-warning', 'received': 'pill-matcha', 'closed': '', 'cancelled': '',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Suppliers / Purchase Orders</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Purchase Orders</h1>
            <p className="page-desc">{pos.length} POs</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => {
              if (pos.length === 0) return alert('No POs to export');
              const headers = ['PO #','Date','Supplier','Status','Subtotal','Tax','Total'];
              const rows = pos.map(p => [p.poNumber, p.orderDate ? new Date(p.orderDate).toLocaleDateString() : '', p.supplier?.companyName ?? '', p.status, p.subtotal, p.taxAmount, p.totalAmount]);
              const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}><IconExport size={16}/> Export</button>
            <button className="btn btn-primary" onClick={() => setOpenPOId('new')}><IconPlus size={16}/> New PO</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs items={[
          { value: 'all', label: 'All', count: pos.length },
          { value: 'draft', label: 'Draft', count: counts.draft ?? 0 },
          { value: 'pending_approval', label: 'Pending', count: counts.pending_approval ?? 0 },
          { value: 'approved', label: 'Approved', count: counts.approved ?? 0 },
          { value: 'sent', label: 'Sent', count: counts.sent ?? 0 },
          { value: 'received', label: 'Received', count: counts.received ?? 0 },
          { value: 'closed', label: 'Closed', count: counts.closed ?? 0 },
        ]} value={tab} onChange={setTab}/>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading POs…</div>
        ) : pos.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <p>No purchase orders yet.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['PO #', 'Date', 'Supplier', 'Total', 'Status', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => {
                const date = po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—';
                return (
                  <tr key={po.id} onClick={() => setOpenPOId(po.id)} style={{ borderTop: '1px solid var(--border-default)', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{po.poNumber}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{date}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{po.supplier?.companyName ?? `Supplier #${po.supplierId}`}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }} className="tabular">฿{Number(po.totalAmount ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}><span className={'pill ' + (statusColor[po.status] ?? '')}><span className="dot"/> {po.status}</span></td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={(e) => handleDeletePO(e, po)} title="Delete"><IconX size={14}/></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Drawer
        open={!!openPOId}
        onClose={() => setOpenPOId(null)}
        title={openPOId === 'new' ? 'New Purchase Order' : openPO?.poNumber ?? 'Purchase Order'}
        subtitle={openPOId === 'new' ? 'Draft' : openPO?.supplier?.companyName}
        width={760}
        footer={openPO ? <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={() => setOpenPOId(null)}>Close</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {openPO.status === 'draft' && <>
              <button className="btn btn-ghost" style={{ color: 'var(--red-500)' }} onClick={() => { if(confirm('Cancel this PO?')) cancelPO.mutate({ id: openPO.id }); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => submit.mutate({ id: openPO.id })}><IconCheck size={16}/> Submit for Approval</button>
            </>}
            {openPO.status === 'pending_approval' && <>
              <button className="btn btn-ghost" style={{ color: 'var(--red-500)' }} onClick={() => { if(confirm('Reject this PO?')) reject.mutate({ id: openPO.id, reason: 'Rejected by admin' }); }}>Reject</button>
              <button className="btn btn-primary" onClick={() => approve.mutate({ id: openPO.id })}><IconCheck size={16}/> Approve</button>
            </>}
            {openPO.status === 'approved' && <>
              <button className="btn btn-secondary" onClick={() => markSent.mutate({ id: openPO.id })}>Mark as Sent</button>
            </>}
            {(openPO.status === 'sent' || openPO.status === 'partial') && <>
              <button className="btn btn-primary" onClick={() => {
                const items = (openPO.items ?? []).map(it => ({ itemId: it.inventoryItemId, quantityReceived: String(it.quantityOrdered) }));
                receiveItems.mutate({ id: openPO.id, items });
              }}>Receive All Items</button>
            </>}
            {openPO.status === 'received' && <>
              <button className="btn btn-primary" onClick={() => closePO.mutate({ id: openPO.id })}>Close PO</button>
            </>}
          </div>
        </div> : <button className="btn btn-ghost" onClick={() => setOpenPOId(null)}>Close</button>}
      >
        {openPOId === 'new' ? (
          <NewPOForm branchId={branchId} onCreated={() => { setOpenPOId(null); refetch(); }}/>
        ) : openPO ? (
          <>
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <SectionHeader title="Order details"/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                <div><div className="t-caption">Status</div><span className={'pill ' + (statusColor[openPO.status] ?? '')} style={{ marginTop: 4 }}><span className="dot"/> {openPO.status}</span></div>
                <div><div className="t-caption">Priority</div><div style={{ marginTop: 4, fontWeight: 500 }}>{openPO.priority}</div></div>
                <div><div className="t-caption">Order date</div><div style={{ marginTop: 4 }}>{openPO.orderDate ? new Date(openPO.orderDate).toLocaleDateString() : '—'}</div></div>
                <div><div className="t-caption">Required by</div><div style={{ marginTop: 4 }}>{openPO.requiredDate ? new Date(openPO.requiredDate).toLocaleDateString() : '—'}</div></div>
              </div>
            </div>

            <SectionHeader title="Items"/>
            <div className="card" style={{ padding: 12 }}>
              {(openPO.items ?? []).map((it, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 100px', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'center', fontSize: 13 }}>
                  <span>{it.item?.name ?? `Item #${it.inventoryItemId}`}</span>
                  <span className="tabular">{it.quantityOrdered} {it.unitOfMeasure}</span>
                  <span className="muted tabular">recv {it.quantityReceived ?? 0}</span>
                  <span className="tabular">฿{Number(it.unitCost ?? 0).toLocaleString()}</span>
                  <span className="tabular" style={{ fontWeight: 500, textAlign: 'right' }}>฿{Number(it.totalCost ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ width: 280, fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Subtotal</span><span className="tabular">฿{Number(openPO.subtotal ?? 0).toLocaleString()}</span></div>
                {Number(openPO.shippingCost) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Shipping</span><span className="tabular">฿{Number(openPO.shippingCost).toLocaleString()}</span></div>}
                {Number(openPO.taxAmount) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Tax</span><span className="tabular">฿{Number(openPO.taxAmount).toLocaleString()}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 600, paddingTop: 8, borderTop: '1px solid var(--border-default)', marginTop: 4 }}><span>Total</span><span className="tabular">฿{Number(openPO.totalAmount ?? 0).toLocaleString()}</span></div>
              </div>
            </div>

            {openPO.notesToSupplier && (
              <div style={{ marginTop: 16 }}>
                <div className="t-caption" style={{ marginBottom: 4 }}>Notes to supplier</div>
                <div className="muted" style={{ fontSize: 13 }}>{openPO.notesToSupplier}</div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }} className="muted">Loading…</div>
        )}
      </Drawer>
    </div>
  );
};

// ----- Franchise: Branch directory -----
export const PageFranchise = () => {
  const [view, setView] = useState('grid');
  const { navigate } = useApp();
  const { data: branches = [], isLoading, refetch: refetchBranches } = trpc.branches.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const deleteBranch = trpc.branches.delete.useMutation({ onSuccess: () => refetchBranches(), onError: (e) => alert(e.message) });
  const handleDeleteBranch = (b) => { if (window.confirm(`ลบสาขา "${b.name}"? ข้อมูลจะหายถาวร`)) deleteBranch.mutate({ id: b.id }); };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Franchise / Branches</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">All Branches</h1>
            <p className="page-desc">{branches.length} branches</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/backoffice/franchise/new')}><IconPlus size={16}/> Open New Branch</button>
        </div>
      </div>

      <TopActionBar
        search="" onSearch={() => {}}
        filters={<>
          <Select value="" onChange={() => {}} options={['All status', 'Active', 'Pre-launch', 'Closed']} placeholder="All status"/>
          <Select value="" onChange={() => {}} options={['All types', 'hq', 'company-owned', 'franchise']} placeholder="All types"/>
        </>}
        viewMode={view} onViewMode={setView}
        onExport={() => {}}
      />

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading branches…</div>
      ) : branches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <EmptyZen/>
          <p style={{ marginTop: 12, fontWeight: 500 }}>No branches yet</p>
          <p style={{ fontSize: 13 }}>Add your first branch to start tracking.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {branches.map((b, i) => (
            <div key={b.id} className="card" style={{ overflow: 'hidden', animation: `slideUp 360ms var(--ease-out-expo) ${i * 60}ms both` }}>
              <Placeholder h={140} radius={0} label={b.branchType === 'hq' ? 'HQ' : 'Branch'}/>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={'pill ' + (b.branchType === 'hq' ? 'pill-matcha' : '')}>{b.branchType}</span>
                      <span className="pill"><span className="dot" style={{ background: b.status === 'active' ? 'var(--matcha-500)' : 'var(--text-quaternary)' }}/> {b.status}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{b.province ?? b.country ?? '—'}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={(e) => { e.stopPropagation(); handleDeleteBranch(b); }} title="Delete"><IconX size={14}/></button>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Code: <span className="mono">{b.branchCode}</span></div>
                <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/backoffice/franchise/${b.id}`)}>View →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----- Open new branch wizard -----
export const PageFranchiseNew = () => {
  const { navigate } = useApp();
  const [step, setStep] = useState(1);
  const steps = ['Basics', 'Location', 'Ownership', 'System', 'Inventory', 'Staffing', 'Review'];

  const [form, setForm] = useState({
    name: '',
    branchCode: '',
    branchType: 'company-owned',
    businessModel: 'cafe',
    status: 'inactive', // รออนุมัติตั้งสาขา
    country: 'Thailand',
    province: '',
    district: '',
    address: '',
    postalCode: '',
    phone: '',
    email: '',
    currency: 'THB',
    taxRate: '7.00',
    openingDate: '',
    posStations: '2',
    kitchenDisplay: true,
    customerDisplay: false,
    mobileOrdering: true,
    menuInheritance: 'master',
    accessCode: '',
    ownershipType: 'company',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    ownerAddress: '',
    ownerTaxId: '',
    ownerCitizenId: '',
    contractType: 'standard',
    royaltyPercent: '5',
    contractStart: '',
  });

  const utils = trpc.useUtils();
  const createBranch = trpc.branches.create.useMutation({
    onSuccess: (b) => {
      utils.branches.list.invalidate();
      utils.branches.listPublic.invalidate();
      utils.branches.getMyBranches.invalidate();
      navigate(`/backoffice/franchise/${b.id}`);
    },
    onError: (e) => alert(e.message),
  });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    createBranch.mutate({
      name: form.name,
      branchCode: form.branchCode,
      branchType: form.branchType,
      businessModel: form.businessModel,
      status: form.status,
      country: form.country || undefined,
      province: form.province || undefined,
      district: form.district || undefined,
      address: form.address || undefined,
      postalCode: form.postalCode || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      taxRate: form.taxRate,
      openingDate: form.openingDate || undefined,
      accessCode: form.accessCode || undefined,
      ownershipType: form.ownershipType,
      ownerName: form.ownershipType === 'company' ? 'Hibi House' : form.ownerName,
      ownerPhone: form.ownerPhone || undefined,
      ownerEmail: form.ownerEmail || undefined,
      ownerAddress: form.ownerAddress || undefined,
      ownerTaxId: form.ownerTaxId || undefined,
      ownerCitizenId: form.ownerCitizenId || undefined,
      royaltyType: form.ownershipType === 'company' ? 'none' : 'percentage',
      royaltyValue: form.ownershipType === 'company' ? '0.00' : form.royaltyPercent,
      contractStartDate: form.contractStart || undefined,
    });
  };

  const businessModelOptions = [
    { value: 'cafe', label: 'Cafe (คาเฟ่)' },
    { value: 'mall', label: 'Mall (ห้างสรรพสินค้า)' },
    { value: 'delivery_only', label: 'Delivery Only (เปิดรับ Delivery เท่านั้น)' },
    { value: 'event', label: 'Event (ออกบูธ)' },
  ];

  const ownershipTypeOptions = [
    { value: 'company', label: 'ร้านของ Hibi (Company-owned / เราเปิดสาขาเอง)' },
    { value: 'individual', label: 'บุคคลธรรมดา (Individual Franchise)' },
    { value: 'corporate', label: 'นิติบุคคล (Corporate Franchise)' }
  ];

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-header">
        <div className="breadcrumb">Franchise / Open new branch</div>
        <h1 className="page-title">Open a new branch</h1>
        <p className="page-desc">7 steps · about 15 minutes</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflow: 'auto', padding: '4px 0' }}>
        {steps.map((s, i) => {
          const active = i + 1 === step;
          const done = i + 1 < step;
          return (
            <React.Fragment key={s}>
              <button onClick={() => setStep(i + 1)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 999,
                background: active ? 'var(--matcha-50)' : 'transparent',
                color: active ? 'var(--matcha-700)' : done ? 'var(--matcha-600)' : 'var(--text-tertiary)',
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                border: '1px solid ' + (active ? 'var(--matcha-600)' : 'transparent'),
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: done ? 'var(--matcha-600)' : active ? 'white' : 'var(--bg-muted)',
                  border: active ? '1.5px solid var(--matcha-600)' : 'none',
                  color: done ? 'white' : active ? 'var(--matcha-700)' : 'var(--text-tertiary)',
                  display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
                }}>{done ? <IconCheck size={12} stroke={2.5}/> : i + 1}</span>
                {s}
              </button>
              {i < steps.length - 1 && <span style={{ width: 16, height: 1, background: 'var(--border-emphasis)', alignSelf: 'center', flex: 'none' }}/>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {step === 1 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Branch basics</div>
            <p className="muted" style={{ marginBottom: 24 }}>Tell us about the new location.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Branch type" required>
                <Select value={form.branchType} onChange={(v) => setField('branchType', v)} options={['hq', 'company-owned', 'franchise']}/>
              </Field>
              <Field label="รูปแบบธุรกิจ (Business Model)" required>
                <Select value={form.businessModel} onChange={(v) => setField('businessModel', v)} options={businessModelOptions}/>
              </Field>
              <Field label="Branch code" required><input className="input" value={form.branchCode} onChange={(e) => setField('branchCode', e.target.value)} placeholder="HB06"/></Field>
              <Field label="Display name" required><input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Hibi Matcha Asok"/></Field>
              <Field label="สถานะร้านค้า (Shop Status)">
                <input className="input" value="รออนุมัติตั้งสาขา" disabled style={{ background: 'var(--bg-muted)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}/>
              </Field>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Location</div>
            <p className="muted" style={{ marginBottom: 24 }}>Branch address and contact information.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Country"><Select value={form.country} onChange={(v) => setField('country', v)} options={['Thailand', 'Japan', 'Singapore', 'Malaysia']}/></Field>
              <Field label="Province"><input className="input" value={form.province} onChange={(e) => setField('province', e.target.value)} placeholder="Bangkok"/></Field>
              <Field label="Address" style={{ gridColumn: 'span 2' }}><input className="input" value={form.address} onChange={(e) => setField('address', e.target.value)}/></Field>
              <Field label="District"><input className="input" value={form.district} onChange={(e) => setField('district', e.target.value)}/></Field>
              <Field label="Postal code"><input className="input" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)}/></Field>
              <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setField('phone', e.target.value)}/></Field>
              <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}/></Field>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>System configuration</div>
            <p className="muted" style={{ marginBottom: 24 }}>POS, payment, and menu inheritance.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Currency"><Select value={form.currency} onChange={(v) => setField('currency', v)} options={['THB', 'JPY', 'USD', 'SGD']}/></Field>
              <Field label="Tax rate (%)"><input className="input" value={form.taxRate} onChange={(e) => setField('taxRate', e.target.value)}/></Field>
            </div>
            <SectionHeader title="POS configuration"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>POS stations</div>
                  <div className="muted" style={{ fontSize: 12 }}>Number of cashier terminals</div>
                </div>
                <input className="input" value={form.posStations} onChange={(e) => setField('posStations', e.target.value)} style={{ width: 80 }}/>
              </div>
              <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Kitchen display</div>
                  <div className="muted" style={{ fontSize: 12 }}>Show queue on monitor</div>
                </div>
                <Toggle checked={form.kitchenDisplay} onChange={(v) => setField('kitchenDisplay', v)}/>
              </div>
              <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Customer display</div>
                  <div className="muted" style={{ fontSize: 12 }}>Customer-facing screen</div>
                </div>
                <Toggle checked={form.customerDisplay} onChange={(v) => setField('customerDisplay', v)}/>
              </div>
              <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Mobile ordering</div>
                  <div className="muted" style={{ fontSize: 12 }}>QR code ordering at table</div>
                </div>
                <Toggle checked={form.mobileOrdering} onChange={(v) => setField('mobileOrdering', v)}/>
              </div>
            </div>
            <SectionHeader title="Menu inheritance"/>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { k: 'master', l: 'HQ master menu', sub: 'No changes' },
                { k: 'overrides', l: 'With overrides', sub: 'Custom prices/availability' },
                { k: 'custom', l: 'Fully custom', sub: 'Build from scratch' },
              ].map((m) => (
                <button key={m.k} type="button" className="card" onClick={() => setField('menuInheritance', m.k)} style={{ padding: 14, textAlign: 'left', border: '1.5px solid ' + (form.menuInheritance === m.k ? 'var(--matcha-600)' : 'var(--border-default)'), background: form.menuInheritance === m.k ? 'var(--matcha-50)' : undefined, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.l}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.sub}</div>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 7 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Review</div>
            <p className="muted" style={{ marginBottom: 24 }}>Confirm and create the branch.</p>
            <div className="card" style={{ padding: 20, background: 'var(--bg-muted)' }}>
              {Object.entries(form).map(([k, v]) => v ? (
                <div key={k} style={{ display: 'flex', padding: '4px 0', fontSize: 13 }}>
                  <span className="muted" style={{ width: 140 }}>{k}</span>
                  <span>{String(v)}</span>
                </div>
              ) : null)}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Ownership</div>
            <p className="muted" style={{ marginBottom: 24 }}>Franchise owner or company-operated details.</p>

            <div style={{ marginBottom: 20 }}>
              <Field label="ประเภทการสมัคร / เจ้าของ (Ownership Type)">
                <Select value={form.ownershipType} onChange={(v) => setField('ownershipType', v)} options={ownershipTypeOptions}/>
              </Field>
            </div>

            {form.ownershipType === 'company' && (
              <div style={{ padding: 18, background: 'var(--matcha-50)', border: '1px solid var(--matcha-200)', borderRadius: 'var(--r-md)', color: 'var(--matcha-800)', fontSize: 14, lineHeight: 1.6 }}>
                <strong>🏪 ร้านของ Hibi (Company-owned / เราเปิดสาขาเอง)</strong>
                <p style={{ marginTop: 8 }}>สาขาประเภทนี้จะบริหารงานโดยตรงโดยสำนักงานใหญ่ (HQ) สิทธิ์การทำรายการ ระบบการเงิน สัญญา และคลังสินค้าจะอยู่ภายใต้การดูแลหลักของ Hibi House</p>
              </div>
            )}

            {form.ownershipType === 'individual' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="ชื่อผู้จดทะเบียน (Owner Name)" required>
                  <input className="input" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} placeholder="ชื่อ-นามสกุล"/>
                </Field>
                <Field label="เลขบัตรประชาชน (Citizen ID)" required>
                  <input className="input" value={form.ownerCitizenId} onChange={(e) => setField('ownerCitizenId', e.target.value)} placeholder="x-xxxx-xxxxx-xx-x"/>
                </Field>
                <Field label="เบอร์โทรศัพท์ (Phone)" required>
                  <input className="input" value={form.ownerPhone} onChange={(e) => setField('ownerPhone', e.target.value)} placeholder="08x-xxx-xxxx"/>
                </Field>
                <Field label="อีเมล (Email)" required>
                  <input className="input" type="email" value={form.ownerEmail} onChange={(e) => setField('ownerEmail', e.target.value)} placeholder="email@example.com"/>
                </Field>
                <Field label="ที่อยู่ตามบัตรประชาชน (Address)" style={{ gridColumn: 'span 2' }}>
                  <input className="input" value={form.ownerAddress} onChange={(e) => setField('ownerAddress', e.target.value)} placeholder="บ้านเลขที่, ถนน, ตำบล, อำเภอ..."/>
                </Field>
                <Field label="Contract type">
                  <Select value={form.contractType} onChange={(v) => setField('contractType', v)} options={['standard', 'premium', 'master']}/>
                </Field>
                <Field label="Royalty (%)">
                  <input className="input" value={form.royaltyPercent} onChange={(e) => setField('royaltyPercent', e.target.value)} placeholder="5"/>
                </Field>
                <Field label="Contract start" style={{ gridColumn: 'span 2' }}>
                  <input className="input" type="date" value={form.contractStart} onChange={(e) => setField('contractStart', e.target.value)}/>
                </Field>
              </div>
            )}

            {form.ownershipType === 'corporate' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="ชื่อบริษัท/นิติบุคคล (Company Name)" required>
                  <input className="input" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} placeholder="บริษัท จำกัด"/>
                </Field>
                <Field label="เลขประจำตัวผู้เสียภาษี (Tax ID)" required>
                  <input className="input" value={form.ownerTaxId} onChange={(e) => setField('ownerTaxId', e.target.value)} placeholder="เลขทะเบียน 13 หลัก"/>
                </Field>
                <Field label="ชื่อกรรมการผู้มีอำนาจลงนาม (Authorized Director)" required>
                  <input className="input" value={form.ownerCitizenId} onChange={(e) => setField('ownerCitizenId', e.target.value)} placeholder="ชื่อกรรมการผู้ลงนาม"/>
                </Field>
                <Field label="เบอร์โทรติดต่อ (Phone)" required>
                  <input className="input" value={form.ownerPhone} onChange={(e) => setField('ownerPhone', e.target.value)} placeholder="08x-xxx-xxxx"/>
                </Field>
                <Field label="อีเมลติดต่อ (Email)" required>
                  <input className="input" type="email" value={form.ownerEmail} onChange={(e) => setField('ownerEmail', e.target.value)} placeholder="info@company.com"/>
                </Field>
                <Field label="ที่ตั้งสำนักงานใหญ่ (Company Address)" style={{ gridColumn: 'span 2' }}>
                  <input className="input" value={form.ownerAddress} onChange={(e) => setField('ownerAddress', e.target.value)} placeholder="ที่ตั้งจดทะเบียนบริษัท..."/>
                </Field>
                <Field label="Contract type">
                  <Select value={form.contractType} onChange={(v) => setField('contractType', v)} options={['standard', 'premium', 'master']}/>
                </Field>
                <Field label="Royalty (%)">
                  <input className="input" value={form.royaltyPercent} onChange={(e) => setField('royaltyPercent', e.target.value)} placeholder="5"/>
                </Field>
                <Field label="Contract start" style={{ gridColumn: 'span 2' }}>
                  <input className="input" type="date" value={form.contractStart} onChange={(e) => setField('contractStart', e.target.value)}/>
                </Field>
              </div>
            )}
          </>
        )}
        {step === 5 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Inventory</div>
            <p className="muted" style={{ marginBottom: 24 }}>Initial inventory allocation for this branch.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Inventory mode">
                <Select value={form.inventoryMode || 'shared'} onChange={(v) => setField('inventoryMode', v)} options={['shared', 'independent']}/>
              </Field>
              <Field label="Auto-reorder">
                <div style={{ paddingTop: 8 }}><Toggle checked={form.autoReorder || false} onChange={(v) => setField('autoReorder', v)}/></div>
              </Field>
              <Field label="Reorder from">
                <Select value={form.reorderFrom || 'hq'} onChange={(v) => setField('reorderFrom', v)} options={['hq', 'supplier-direct']}/>
              </Field>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>Stock can be transferred from HQ after branch creation via the Distribute Center.</div>
          </>
        )}
        {step === 6 && (
          <>
            <div className="t-h2" style={{ fontWeight: 600, marginBottom: 6 }}>Staffing & Access</div>
            <p className="muted" style={{ marginBottom: 24 }}>Initial staff configuration and branch access code.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Branch manager name">
                <input className="input" value={form.managerName || ''} onChange={(e) => setField('managerName', e.target.value)} placeholder="Full name"/>
              </Field>
              <Field label="Manager phone">
                <input className="input" value={form.managerPhone || ''} onChange={(e) => setField('managerPhone', e.target.value)} placeholder="08x-xxx-xxxx"/>
              </Field>
              <Field label="Initial staff count">
                <input className="input" type="number" value={form.initialStaffCount || '3'} onChange={(e) => setField('initialStaffCount', e.target.value)}/>
              </Field>
              <Field label="Operating hours">
                <input className="input" value={form.operatingHours || '08:00-20:00'} onChange={(e) => setField('operatingHours', e.target.value)} placeholder="08:00-20:00"/>
              </Field>
              <Field label="Branch access code" style={{ gridColumn: 'span 2' }}>
                <input className="input" value={form.accessCode || ''} onChange={(e) => setField('accessCode', e.target.value)} placeholder="e.g. HIBI-2026" maxLength={20}/>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Staff can use this code to quickly identify and access this branch.</div>
              </Field>
            </div>
            <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Invite staff to this branch</div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>After creating the branch, go to Staff page → Bulk Invite to add staff and assign them to this branch.</p>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
          <button className="btn btn-secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>← Back</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {step < steps.length ? (
              <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Next: {steps[step]} →</button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={createBranch.isPending || !form.name || !form.branchCode}
                onClick={submit}
              >
                <IconCheck size={16}/> {createBranch.isPending ? 'Creating…' : 'Open Branch'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
  </div>
);

// ----- Franchise detail -----
export const PageFranchiseDetail = () => {
  const { route } = useApp();
  const [tab, setTab] = useState('overview');

  const branchId = useMemo(() => {
    const path = (route || '').split('?')[0];
    const m = path.match(/\/franchise\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [route]);

  const { data: b, isLoading } = trpc.branches.getById.useQuery(
    { id: branchId ?? 0 },
    { enabled: !!branchId }
  );

  if (!branchId) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">No branch specified</div>;
  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading branch…</div>;
  if (!b) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">Branch not found</div>;

  const isHQ = b.branchType === 'hq';
  const isActive = b.status === 'active';

  // Pick a unique hue per branch for the gradient accent
  const hue = ((b.id ?? 1) * 47 + 140) % 360;
  const heroGradient = isHQ
    ? 'linear-gradient(135deg, oklch(0.28 0.06 150) 0%, oklch(0.20 0.04 150) 60%, oklch(0.16 0.03 95) 100%)'
    : `linear-gradient(135deg, oklch(0.22 0.05 ${hue}) 0%, oklch(0.18 0.04 150) 60%, oklch(0.14 0.03 95) 100%)`;

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      <div style={{ marginBottom: 8, paddingTop: 16 }}>
        <div className="breadcrumb">Franchise / {b.name}</div>
      </div>

      {/* ── Hero Banner ── */}
      <div style={{
        borderRadius: 'var(--r-lg, 16px)', overflow: 'hidden', marginBottom: 20,
        background: heroGradient, position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: 280, height: 280, borderRadius: '50%',
            background: `radial-gradient(circle, oklch(0.65 0.12 ${hue} / 0.25) 0%, transparent 70%)`,
          }}/>
          <div style={{
            position: 'absolute', bottom: '-40px', left: '30%',
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, oklch(0.65 0.12 150 / 0.18) 0%, transparent 70%)',
          }}/>
          {/* Subtle dot grid pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(oklch(1 0 0 / 0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}/>
        </div>

        {/* Content */}
        <div style={{ position: 'relative', padding: '32px 32px 28px', color: 'white' }}>
          {/* Top row: badges + actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                background: isHQ ? 'oklch(0.65 0.15 150 / 0.35)' : 'oklch(1 0 0 / 0.12)',
                border: `1px solid ${isHQ ? 'oklch(0.65 0.15 150 / 0.5)' : 'oklch(1 0 0 / 0.2)'}`,
                color: isHQ ? 'oklch(0.9 0.1 150)' : 'oklch(0.9 0 0)',
              }}>
                {isHQ ? '⭐ HQ' : b.branchType}
              </span>
              <span style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: isActive ? 'oklch(0.55 0.15 145 / 0.3)' : 'oklch(1 0 0 / 0.1)',
                border: `1px solid ${isActive ? 'oklch(0.65 0.12 145 / 0.5)' : 'oklch(1 0 0 / 0.15)'}`,
                color: isActive ? 'oklch(0.88 0.1 145)' : 'oklch(0.75 0 0)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isActive ? 'oklch(0.7 0.2 145)' : 'oklch(0.6 0 0)',
                  boxShadow: isActive ? '0 0 6px oklch(0.7 0.2 145)' : 'none',
                  display: 'inline-block',
                }}/>
                {b.status}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" style={{
                background: 'oklch(1 0 0 / 0.12)', border: '1px solid oklch(1 0 0 / 0.2)',
                color: 'white', backdropFilter: 'blur(8px)',
              }}>
                ✏️ Edit
              </button>
              <button className="btn btn-sm" style={{
                background: 'oklch(1 0 0 / 0.12)', border: '1px solid oklch(1 0 0 / 0.2)',
                color: 'white', backdropFilter: 'blur(8px)',
              }}>
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Branch name + location */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em',
              margin: 0, marginBottom: 8, color: 'white',
              textShadow: '0 1px 12px rgba(0,0,0,0.3)',
            }}>
              {b.name}
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              fontSize: 13, color: 'oklch(0.85 0.02 150)',
            }}>
              {b.branchCode && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ opacity: 0.6 }}>CODE</span>
                  <code style={{ fontFamily: 'monospace', fontWeight: 600, color: 'white' }}>{b.branchCode}</code>
                </span>
              )}
              {b.province && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {b.province}{b.country && b.country !== 'Thailand' ? `, ${b.country}` : ''}
                </span>
              )}
              {b.openingDate && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  🗓️ Opened {new Date(b.openingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {b.phone && <span>📞 {b.phone}</span>}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
            background: 'oklch(1 0 0 / 0.08)',
            borderRadius: 12, overflow: 'hidden', border: '1px solid oklch(1 0 0 / 0.1)',
          }}>
            {[
              { label: 'Tax Rate', value: `${b.taxRate ?? '7.00'}%`, icon: '🧾' },
              { label: 'Currency', value: b.currency ?? 'THB', icon: '💱' },
              { label: 'Timezone', value: (b.timezone ?? 'Asia/Bangkok').replace('Asia/', ''), icon: '🕐' },
              { label: 'Type', value: b.branchType, icon: '🏪' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '14px 20px',
                background: 'oklch(1 0 0 / 0.06)',
                borderRight: i < 3 ? '1px solid oklch(1 0 0 / 0.08)' : 'none',
              }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'oklch(0.75 0.02 150)', marginBottom: 4 }}>{s.icon} {s.label}</div>
                <div style={{ fontWeight: 600, fontSize: 16, color: 'white' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ marginBottom: 20 }}>
        <Tabs items={['Overview', 'Staff', 'Inventory', 'Menu', 'Contract'].map((l) => ({ value: l.toLowerCase(), label: l }))} value={tab} onChange={setTab}/>
      </div>

      {/* ── Tab content ── */}
      {tab === 'overview' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="inv-grid">
          {/* Location card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
                background: 'var(--matcha-50)', fontSize: 18,
              }}>📍</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Location & Contact</div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-secondary)' }}>
              {b.address && <div>{b.address}</div>}
              {b.district && <div>{b.district}</div>}
              {b.province && <div>{b.province} {b.postalCode}</div>}
              {b.country && <div style={{ color: 'var(--text-tertiary)' }}>{b.country}</div>}
            </div>
            {(b.phone || b.email) && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                {b.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--text-tertiary)' }}>📞</span> {b.phone}</div>}
                {b.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--text-tertiary)' }}>✉️</span> {b.email}</div>}
              </div>
            )}
          </div>

          {/* Settings card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--matcha-50)', fontSize: 18 }}>⚙️</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>System Settings</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Currency', value: b.currency ?? 'THB' },
                { label: 'Tax Rate', value: `${b.taxRate ?? '7.00'}%` },
                { label: 'Timezone', value: b.timezone ?? 'Asia/Bangkok' },
                { label: 'Tax Inclusive', value: b.taxInclusive ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Loyalty card */}
          {b.loyaltyEnabled && (
            <div className="card" style={{ padding: 24, borderTop: '3px solid var(--matcha-400)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--matcha-50)', fontSize: 18 }}>⭐</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Loyalty Program</div>
                <span className="pill pill-matcha" style={{ fontSize: 10 }}>Enabled</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginBottom: 2 }}>EARN RATE</div><strong>{b.loyaltyPointsPerBaht ?? 0.04} pts/฿</strong></div>
                <div><div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginBottom: 2 }}>REDEEM RATE</div><strong>฿{b.loyaltyRedeemRate ?? 1}/pt</strong></div>
                <div><div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginBottom: 2 }}>POINT EXPIRY</div><strong>{b.loyaltyPointExpireDays ?? 365} days</strong></div>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'menu' ? (
        <BranchMenuTab branchId={b.id} branchName={b.name}/>
      ) : tab === 'staff' ? (
        <BranchStaffTab branchId={b.id}/>
      ) : tab === 'inventory' ? (
        <BranchInventoryTab branchId={b.id}/>
      ) : tab === 'contract' ? (
        <BranchContractTab branch={b}/>
      ) : (
        <EmptyState illustration={<EmptyZen/>} title={`${tab.charAt(0).toUpperCase() + tab.slice(1)} view`} desc={`Tab content for ${tab} will be displayed here.`}/>
      )}
    </div>
  );
};

// ----- Branch Staff Tab -----
const BranchStaffTab = ({ branchId }) => {
  const { data: staffList = [], isLoading } = trpc.staff.list.useQuery({ branchId });
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading staff...</div>;
  if (staffList.length === 0) return <EmptyState illustration={<EmptyZen/>} title="No staff assigned" desc="Assign staff to this branch from the Staff page."/>;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
            {['Name', 'Role', 'Status', 'Phone'].map((h) => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staffList.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border-default)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.firstName} {s.lastName}</td>
              <td style={{ padding: '12px 16px' }}><span className="pill pill-neutral">{s.role}</span></td>
              <td style={{ padding: '12px 16px' }}><span className={`pill ${s.status === 'active' ? 'pill-matcha' : ''}`}><span className="dot"/> {s.status}</span></td>
              <td style={{ padding: '12px 16px' }} className="muted">{s.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ----- Branch Inventory Tab -----
const BranchInventoryTab = ({ branchId }) => {
  const { data: items = [], isLoading } = trpc.inventory.listItems.useQuery({ branchId });
  if (isLoading) return <div className="muted" style={{ padding: 24 }}>Loading inventory...</div>;
  if (items.length === 0) return <EmptyState illustration={<EmptyShelf/>} title="No inventory items" desc="Transfer or assign inventory items to this branch."/>;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total Items', value: items.length, icon: '📦', color: 'var(--matcha-600)' },
          { label: 'Low Stock', value: items.filter(i => (i.currentStock ?? 0) <= (i.minStock ?? 5) && (i.currentStock ?? 0) > 0).length, icon: '⚠️', color: '#d97706' },
          { label: 'Out of Stock', value: items.filter(i => (i.currentStock ?? 0) <= 0).length, icon: '🔴', color: '#dc2626' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
              {['Item', 'SKU', 'Category', 'Stock', 'Unit', 'Status'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i > 2 ? 'center' : 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const stock = it.currentStock ?? 0;
              const min   = it.minStock ?? 5;
              const isOut = stock <= 0;
              const isLow = !isOut && stock <= min;
              const stockBg    = isOut ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4';
              const stockColor = isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a';
              const statusLabel = isOut ? 'Out' : isLow ? 'Low' : 'OK';

              return (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--border-default)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    {it.nameThai || it.name}
                    {it.nameThai && it.name !== it.nameThai && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{it.name}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--text-tertiary)', fontSize: 12 }}>{it.sku || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {it.category?.name
                      ? <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--matcha-50)', color: 'var(--matcha-700)' }}>{it.category.name}</span>
                      : <span style={{ color: 'var(--text-quaternary)' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontFamily: 'monospace', color: stockColor, fontSize: 15 }}>{stock}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{it.unitOfMeasure || it.unit || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: stockBg, color: stockColor }}>
                      {statusLabel}
                    </span>
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

// ----- Branch Contract Tab -----
const BranchContractTab = ({ branch: b }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="inv-grid">
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Contract Details"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
          <div><div className="t-caption">Royalty Type</div><div style={{ marginTop: 4, fontWeight: 500 }}>{b.royaltyType || 'none'}</div></div>
          <div><div className="t-caption">Royalty Value</div><div style={{ marginTop: 4, fontWeight: 500 }}>{b.royaltyValue ? `${b.royaltyValue}%` : '—'}</div></div>
          <div><div className="t-caption">Contract Start</div><div style={{ marginTop: 4 }}>{b.contractStartDate ? new Date(b.contractStartDate).toLocaleDateString() : '—'}</div></div>
          <div><div className="t-caption">Contract End</div><div style={{ marginTop: 4 }}>{b.contractEndDate ? new Date(b.contractEndDate).toLocaleDateString() : '—'}</div></div>
          <div><div className="t-caption">Status</div><div style={{ marginTop: 4 }}><span className={`pill ${b.status === 'active' ? 'pill-matcha' : 'pill-neutral'}`}><span className="dot"/> {b.status}</span></div></div>
          <div><div className="t-caption">Branch Code</div><div style={{ marginTop: 4 }}>{b.code || '—'}</div></div>
        </div>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Branch Info"/>
        <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
          <div><div className="t-caption">Phone</div><div style={{ marginTop: 4 }}>{b.phone || '—'}</div></div>
          <div><div className="t-caption">Email</div><div style={{ marginTop: 4 }}>{b.email || '—'}</div></div>
          <div><div className="t-caption">Created</div><div style={{ marginTop: 4 }}>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}</div></div>
        </div>
      </div>
    </div>
  );
};

// ----- Branch Menu Tab -----
const BranchMenuTab = ({ branchId, branchName }) => {
  const session = getSession();
  const isSuper = session?.role === 'super_admin';
  const [showAssign, setShowAssign] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');

  // All menu items (for the assign drawer)
  const { data: allMenu = [] } = trpc.menu.list.useQuery({});
  // Items explicitly assigned to this branch (only those with a row in pos_branch_menu_items)
  const { data: assignedItems = [], refetch } = trpc.menu.listAssignedToBranch.useQuery({ branchId });

  const distribute = trpc.branches.distribute.useMutation({
    onSuccess: () => { refetch(); setShowAssign(false); setSelectedIds([]); },
  });

  const setBranchAvail = trpc.menu.setBranchAvailability.useMutation({
    onSuccess: () => { refetch(); },
  });

  const filteredAssigned = assignedItems.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.nameThai || '').toLowerCase().includes(q);
  });

  // Items not yet assigned to this branch (for the assign modal)
  const assignedIds = new Set(assignedItems.map(i => i.id));
  const unassignedItems = allMenu.filter(m => !assignedIds.has(m.id) && !m.isArchived);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{assignedItems.length} menu items assigned</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Items available at this branch</div>
        </div>
        {isSuper && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}>
            <IconPlus size={14}/> Assign Menu Items
          </button>
        )}
      </div>

      {assignedItems.length > 8 && (
        <input
          type="text" className="input" placeholder="Search assigned items…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12, maxWidth: 300 }}
        />
      )}

      {filteredAssigned.length === 0 ? (
        <EmptyState illustration={<EmptyZen/>} title="No menu items" desc={isSuper ? 'Click "Assign Menu Items" to add items to this branch.' : 'No menu items have been assigned to this branch yet.'}/>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredAssigned.map(item => (
            <div key={item.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {item.nameThai || ''} · ฿{Number(item.displayPrice || item.basePrice).toLocaleString()}
                </div>
              </div>
              {isSuper && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--red-600)', fontSize: 12 }}
                  onClick={() => {
                    if (confirm(`Remove "${item.name}" from this branch?`)) {
                      setBranchAvail.mutate({ menuItemId: item.id, branchId, isAvailable: false });
                    }
                  }}
                >
                  <IconX size={12}/> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Menu Items Drawer */}
      {showAssign && (
        <Drawer title="Assign Menu Items" onClose={() => { setShowAssign(false); setSelectedIds([]); }}>
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Select items to assign to <strong>{branchName}</strong>
            </div>
            {unassignedItems.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>All menu items are already assigned.</div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(selectedIds.length === unassignedItems.length ? [] : unassignedItems.map(i => i.id))}>
                    {selectedIds.length === unassignedItems.length ? 'Deselect All' : `Select All (${unassignedItems.length})`}
                  </button>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'grid', gap: 6 }}>
                  {unassignedItems.map(item => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer', border: selectedIds.includes(item.id) ? '2px solid var(--matcha-500)' : '2px solid var(--border)' }}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}/>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.nameThai || ''} · ฿{Number(item.basePrice).toLocaleString()}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}
                  disabled={selectedIds.length === 0 || distribute.isPending}
                  onClick={() => distribute.mutate({ entityType: 'menu_items', entityIds: selectedIds, branchIds: [branchId] })}
                >
                  {distribute.isPending ? 'Assigning…' : `Assign ${selectedIds.length} item(s)`}
                </button>
              </>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
};

