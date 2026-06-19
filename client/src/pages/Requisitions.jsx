// ============================================
// Requisitions: Branch requests stock/menu from HQ
// ============================================
import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Modal, Field, Select, Toggle, Tabs, EmptyState, SectionHeader } from "@/components";
import { IconPlus, IconCheck, IconX, IconTruck, IconBox, IconMenu, IconReceipt } from "@/icons";
import { downloadPDF } from "@/lib/export";

const STATUS_COLORS = {
  pending: 'var(--gold)',
  approved: 'var(--matcha-600)',
  partially_approved: 'var(--blue)',
  rejected: 'var(--red)',
  cancelled: 'var(--stone-400)',
  fulfilled: 'var(--matcha-700)',
};

const STATUS_LABELS = {
  pending: 'รอดำเนินการ',
  approved: 'อนุมัติ',
  partially_approved: 'อนุมัติบางส่วน',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก',
  fulfilled: 'จัดส่งแล้ว',
};

const PRIORITY_LABELS = { low: 'ต่ำ', normal: 'ปกติ', urgent: 'เร่งด่วน' };

export const PageRequisitions = () => {
  const { branch, role } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const statusFilter = tab === 'all' ? undefined : tab;
  const branchFilter = role === 'super' ? undefined : branch?.id;

  const { data: requisitions = [], refetch, isLoading } = trpc.requisitions.list.useQuery(
    { branchId: branchFilter, status: statusFilter },
    { staleTime: 10000 }
  );

  const tabs = [
    { id: 'all', label: 'ทั้งหมด', count: requisitions.length },
    { id: 'pending', label: 'รอดำเนินการ' },
    { id: 'approved', label: 'อนุมัติแล้ว' },
    { id: 'fulfilled', label: 'จัดส่งแล้ว' },
  ];

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="t-h2" style={{ fontWeight: 600 }}>ใบขอสั่ง (Requisitions)</h1>
          <p className="muted" style={{ marginTop: 4 }}>สาขาขอสั่ง stock, menu, supplies จาก HQ</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <IconPlus size={16}/> สร้างใบขอ
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-default)', paddingBottom: 8 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--r-default)', fontSize: 13, fontWeight: 500,
              background: tab === t.id ? 'var(--matcha-50)' : 'transparent',
              color: tab === t.id ? 'var(--matcha-700)' : 'var(--text-secondary)',
              border: tab === t.id ? '1px solid var(--matcha-200)' : '1px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 68, borderRadius: 'var(--r-md)', background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : requisitions.length === 0 ? (
        <EmptyState title="ไม่มีใบขอ" desc="กดปุ่ม 'สร้างใบขอ' เพื่อขอสั่งจาก HQ"/>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requisitions.map(req => (
            <button
              key={req.id}
              onClick={() => setSelectedReq(req)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '14px 18px', borderRadius: 'var(--r-md)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'box-shadow 180ms',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: req.type === 'stock' ? 'var(--matcha-50)' : req.type === 'menu' ? 'var(--blue-50, #eff6ff)' : 'var(--stone-100)',
                display: 'grid', placeItems: 'center',
                color: req.type === 'stock' ? 'var(--matcha-600)' : req.type === 'menu' ? 'var(--blue, #3b82f6)' : 'var(--stone-500)',
              }}>
                {req.type === 'stock' ? <IconBox size={18}/> : req.type === 'menu' ? <IconMenu size={18}/> : <IconTruck size={18}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{req.requestNumber}</span>
                  <span className="pill" style={{ background: STATUS_COLORS[req.status] + '20', color: STATUS_COLORS[req.status], fontSize: 11 }}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                  {req.priority === 'urgent' && <span className="pill" style={{ background: 'var(--red-50, #fef2f2)', color: 'var(--red)', fontSize: 11 }}>เร่งด่วน</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {req.requestingBranchName} · {req.type} · {new Date(req.createdAt).toLocaleDateString('th-TH')}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {new Date(req.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Drawer */}
      {showCreate && <CreateRequisitionDrawer onClose={() => { setShowCreate(false); refetch(); }} branchId={branch?.id}/>}

      {/* Detail Drawer */}
      {selectedReq && <RequisitionDetailDrawer req={selectedReq} onClose={() => { setSelectedReq(null); refetch(); }} role={role}/>}
    </div>
  );
};

// ─── Create Requisition Drawer ───────────────────────────────────────────────
const CreateRequisitionDrawer = ({ onClose, branchId }) => {
  const toast = useToast();
  const [type, setType] = useState('stock');
  const [priority, setPriority] = useState('normal');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch inventory items for stock type
  const { data: invItems = [] } = trpc.inventory.listItems.useQuery(
    undefined,
    { enabled: type === 'stock' || type === 'supplies' }
  );

  // Fetch menu items for menu type
  const { data: menuData } = trpc.menu.listAvailable.useQuery({ branchId: branchId || 1 }, { enabled: type === 'menu' });
  const menuItems = menuData?.items ?? [];

  const availableItems = useMemo(() => {
    const source = type === 'menu' ? menuItems : invItems;
    const mapped = source.map(i => ({
      id: i.id,
      name: type === 'menu' ? (i.nameTh || i.nameEn || i.name || '') : (i.nameThai || i.name || ''),
      unit: type === 'menu' ? 'item' : (i.unit || 'piece'),
      itemType: type === 'menu' ? 'menu' : 'inventory',
    }));
    if (!searchTerm) return mapped.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return mapped.filter(i => i.name.toLowerCase().includes(term)).slice(0, 50);
  }, [type, invItems, menuItems, searchTerm]);

  const addItem = (item) => {
    if (items.find(i => i.itemId === item.id && i.itemType === item.itemType)) return;
    setItems([...items, { itemType: item.itemType, itemId: item.id, itemName: item.name, requestedQty: '1', unit: item.unit }]);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateQty = (idx, qty) => {
    const updated = [...items];
    updated[idx].requestedQty = qty;
    setItems(updated);
  };

  const createMutation = trpc.requisitions.create.useMutation({
    onSuccess: (data) => {
      toast.success(`สร้างใบขอ ${data.requestNumber} สำเร็จ`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (items.length === 0) return toast.error('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
    createMutation.mutate({
      requestingBranchId: branchId || 1,
      type,
      priority,
      notes: notes || undefined,
      items,
    });
  };

  return (
    <Drawer open onClose={onClose} title="สร้างใบขอสั่ง" width={560}>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="ประเภท">
            <Select value={type} onChange={setType} options={['stock', 'menu', 'supplies']}/>
          </Field>
          <Field label="ความเร่งด่วน">
            <Select value={priority} onChange={setPriority} options={['low', 'normal', 'urgent']}/>
          </Field>
        </div>

        <Field label="หมายเหตุ">
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..."/>
        </Field>

        {/* Item search & add */}
        <div>
          <SectionHeader title="รายการที่ต้องการ"/>
          <input
            className="input"
            placeholder="ค้นหารายการ..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--r-default)', padding: 4 }}>
            {availableItems.map(item => (
              <button
                key={`${item.itemType}-${item.id}`}
                onClick={() => addItem(item)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: 13, textAlign: 'left',
                  borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: items.find(i => i.itemId === item.id) ? 'var(--matcha-50)' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = items.find(i => i.itemId === item.id) ? 'var(--matcha-50)' : 'transparent'}
              >
                <span>{item.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.unit}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected items */}
        {items.length > 0 && (
          <div>
            <SectionHeader title={`รายการที่เลือก (${items.length})`}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 'var(--r-default)',
                  background: 'var(--bg-muted)', border: '1px solid var(--border-default)',
                }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.itemName}</span>
                  <input
                    type="number"
                    className="input"
                    style={{ width: 70, textAlign: 'center' }}
                    value={item.requestedQty}
                    onChange={e => updateQty(idx, e.target.value)}
                    min="0.01"
                    step="0.01"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 40 }}>{item.unit}</span>
                  <button onClick={() => removeItem(idx)} style={{ color: 'var(--red)', padding: 4 }}>
                    <IconX size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={createMutation.isPending || items.length === 0}
          style={{ marginTop: 8 }}
        >
          {createMutation.isPending ? 'กำลังสร้าง...' : 'ส่งใบขอ'}
        </button>
      </div>
    </Drawer>
  );
};

// ─── Requisition Detail Drawer ───────────────────────────────────────────────
const RequisitionDetailDrawer = ({ req, onClose, role }) => {
  const toast = useToast();
  const { data: detail, refetch: refetchDetail } = trpc.requisitions.getById.useQuery({ id: req.id });
  const [editItems, setEditItems] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);

  useEffect(() => {
    if (detail?.items) {
      setEditItems(
        detail.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName,
          requestedQty: item.requestedQty,
          approvedQty: item.approvedQty ?? item.requestedQty,
          unitPrice: item.unitPrice ?? '',
          unit: item.unit,
          notes: item.notes ?? "",
          status: item.status === "rejected" ? "rejected" : "approved",
        }))
      );
      setInvoiceItems(
        detail.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          approvedQty: item.approvedQty ?? item.requestedQty,
          unitPrice: item.unitPrice ?? '',
          unit: item.unit,
        }))
      );
    }
  }, [detail]);

  const approveMutation = trpc.requisitions.approve.useMutation({
    onSuccess: () => { toast.success('อนุมัติสำเร็จ — stock ถูกโอนแล้ว'); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.requisitions.reject.useMutation({
    onSuccess: () => { toast.success('ปฏิเสธใบขอแล้ว'); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = trpc.requisitions.cancel.useMutation({
    onSuccess: () => { toast.success('ยกเลิกใบขอแล้ว'); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  const setInvoiceMutation = trpc.requisitions.setInvoiceTotal.useMutation({
    onSuccess: () => { toast.success('บันทึกราคาใบแจ้งหนี้แล้ว'); refetchDetail(); setShowInvoiceModal(false); },
    onError: (err) => toast.error(err.message),
  });

  const printInvoiceMutation = trpc.requisitions.printInvoice.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const handlePrintInvoice = async () => {
    const result = await printInvoiceMutation.mutateAsync({ id: req.id });
    if (result?.html) {
      const w = window.open('', '_blank', 'width=420,height=700');
      if (!w) { alert('Popup blocked'); return; }
      w.document.write(result.html);
      w.document.close();
    }
  };

  const calcInvoiceTotal = () =>
    invoiceItems.reduce((sum, item) => {
      return sum + Number(item.approvedQty ?? 0) * Number(item.unitPrice || 0);
    }, 0);

  const handlePrint = () => {
    if (!detail) return;
    const statusText = STATUS_LABELS[detail.status] || detail.status;
    const priorityText = PRIORITY_LABELS[detail.priority] || detail.priority;
    const itemsHtml = detail.items.map((item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.itemName}</td>
        <td class="right">${item.requestedQty}</td>
        <td class="right">${item.approvedQty ?? '—'}</td>
        <td>${item.unit ?? 'ชิ้น'}</td>
        <td>${item.notes || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <h1>ใบขอเบิกสินค้า (Requisition Note)</h1>
      <div class="meta">
        <strong>เลขที่เอกสาร:</strong> ${detail.requestNumber}<br/>
        <strong>สาขาที่ขอเบิก:</strong> ${detail.requestingBranchName}<br/>
        <strong>ขอเบิกจาก:</strong> ${detail.sourceBranchName}<br/>
        <strong>ประเภทสินค้า:</strong> ${detail.type}<br/>
        <strong>สถานะ:</strong> ${statusText}<br/>
        <strong>ความเร่งด่วน:</strong> ${priorityText}<br/>
        <strong>วันที่ขอเบิก:</strong> ${new Date(detail.createdAt).toLocaleString('th-TH')}<br/>
        ${detail.notes ? `<strong>หมายเหตุรวม:</strong> ${detail.notes}<br/>` : ''}
        ${detail.rejectionReason ? `<strong>เหตุผลปฏิเสธ:</strong> ${detail.rejectionReason}<br/>` : ''}
      </div>
      <h2>รายการสินค้า</h2>
      <table>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อสินค้า</th>
            <th class="right">จำนวนขอเบิก</th>
            <th class="right">จำนวนอนุมัติ/จัดส่ง</th>
            <th>หน่วย</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    `;
    downloadPDF(`ใบขอเบิก_${detail.requestNumber}`, html);
  };

  if (!detail) return <Drawer open onClose={onClose} title="Loading..."><div style={{ padding: 20 }}>กำลังโหลด...</div></Drawer>;

  const isFulfilled = ['fulfilled', 'approved', 'partially_approved'].includes(detail.status);
  const isPaid = detail.paymentStatus === 'paid';

  return (
    <Drawer open onClose={onClose} title={`ใบขอ ${detail.requestNumber}`} width={520}>
      <div style={{ padding: 20 }}>
        {/* Header actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>รายละเอียดใบขอ</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isFulfilled && (
              <button className="btn btn-secondary btn-sm" onClick={handlePrintInvoice} disabled={printInvoiceMutation.isPending}>
                <IconReceipt size={14} style={{ marginRight: 4 }}/> ใบแจ้งหนี้
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <IconReceipt size={14} style={{ marginRight: 4 }}/> ใบเบิก
            </button>
          </div>
        </div>

        {/* Invoice / payment banner */}
        {isFulfilled && (
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--r-default)', marginBottom: 16,
            background: isPaid ? 'var(--matcha-50)' : 'var(--gold-50, #fffbeb)',
            border: `1px solid ${isPaid ? 'var(--matcha-200)' : 'var(--gold, #f59e0b)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {isPaid ? 'ชำระแล้ว' : 'ยอดค้างชำระ'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: isPaid ? 'var(--matcha-700)' : 'var(--gold, #92400e)' }}>
                {detail.invoiceTotal ? `฿${Number(detail.invoiceTotal).toFixed(2)}` : 'ยังไม่ได้กำหนดราคา'}
              </div>
              {isPaid && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {detail.paymentMethod} · {detail.paidAt ? new Date(detail.paidAt).toLocaleDateString('th-TH') : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {role === 'super' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowInvoiceModal(true)}
                  style={{ fontSize: 12 }}
                >
                  กำหนดราคา
                </button>
              )}
              {!isPaid && detail.invoiceTotal && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPayModal(true)}
                  style={{ fontSize: 12 }}
                >
                  จ่ายเงิน
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>สาขาที่ขอ</div>
            <div style={{ fontWeight: 500 }}>{detail.requestingBranchName}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>ขอจาก</div>
            <div style={{ fontWeight: 500 }}>{detail.sourceBranchName}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>ประเภท</div>
            <div style={{ fontWeight: 500 }}>{detail.type}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>สถานะ</div>
            <span className="pill" style={{ background: STATUS_COLORS[detail.status] + '20', color: STATUS_COLORS[detail.status] }}>
              {STATUS_LABELS[detail.status]}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>ความเร่งด่วน</div>
            <div style={{ fontWeight: 500 }}>{PRIORITY_LABELS[detail.priority]}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>วันที่สร้าง</div>
            <div style={{ fontWeight: 500 }}>{new Date(detail.createdAt).toLocaleString('th-TH')}</div>
          </div>
        </div>

        {detail.notes && (
          <div style={{ padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', marginBottom: 16, fontSize: 13 }}>
            {detail.notes}
          </div>
        )}

        {/* Items */}
        <SectionHeader title={detail.status === 'pending' && role === 'super' ? `แก้ไขการอนุมัติสินค้า (${detail.items.length})` : `รายการ (${detail.items.length})`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {detail.status === 'pending' && role === 'super' ? (
            editItems.map((item, idx) => (
              <div key={item.id} style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                padding: '12px 14px', borderRadius: 'var(--r-default)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: item.status === 'rejected' ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: item.status === 'rejected' ? 'line-through' : 'none' }}>{item.itemName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(ขอ {item.requestedQty} {item.unit})</span>

                  {item.status === 'approved' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>อนุมัติ:</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 70, textAlign: 'center', height: 32 }}
                        value={item.approvedQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, approvedQty: val } : it));
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 20 }}>{item.unit}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>฿/หน่วย:</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: 70, textAlign: 'center', height: 32 }}
                        value={item.unitPrice}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: val } : it));
                        }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 500 }}>ปฏิเสธแล้ว</span>
                  )}

                  <button
                    onClick={() => {
                      const nextStatus = item.status === 'approved' ? 'rejected' : 'approved';
                      setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, status: nextStatus } : it));
                    }}
                    className="btn btn-xs"
                    style={{
                      background: item.status === 'approved' ? 'var(--red-50, #fef2f2)' : 'var(--matcha-50)',
                      color: item.status === 'approved' ? 'var(--red)' : 'var(--matcha-700)',
                      border: 'none',
                    }}
                  >
                    {item.status === 'approved' ? 'ปฏิเสธ' : 'อนุมัติ'}
                  </button>
                </div>

                <input
                  className="input"
                  style={{ height: 32, fontSize: 12 }}
                  placeholder="หมายเหตุ / เหตุผลจัดส่งไม่ตรงตามขอเบิก"
                  value={item.notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, notes: val } : it));
                  }}
                />
              </div>
            ))
          ) : (
            detail.items.map(item => (
              <div key={item.id} style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '10px 12px', borderRadius: 'var(--r-default)',
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{item.itemName}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.requestedQty} {item.unit}</span>
                  {item.status !== 'pending' && (
                    <span className="pill" style={{
                      background: item.status === 'approved' ? 'var(--matcha-50)' : 'var(--red-50, #fef2f2)',
                      color: item.status === 'approved' ? 'var(--matcha-700)' : 'var(--red)',
                      fontSize: 10,
                    }}>
                      {item.status === 'approved' ? `อนุมัติ ${item.approvedQty}` : 'ปฏิเสธ'}
                    </span>
                  )}
                </div>
                {item.notes && (
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingLeft: 4 }}>
                    หมายเหตุ: {item.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {detail.rejectionReason && (
          <div style={{ padding: '10px 14px', background: 'var(--red-50, #fef2f2)', borderRadius: 'var(--r-default)', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
            เหตุผลที่ปฏิเสธ: {detail.rejectionReason}
          </div>
        )}

        {/* Actions */}
        {detail.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {role === 'super' && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => approveMutation.mutate({
                    id: detail.id,
                    items: editItems.map(it => ({
                      itemId: it.itemId,
                      approvedQty: String(it.approvedQty),
                      status: it.status,
                      notes: it.notes || undefined,
                      unitPrice: it.unitPrice ? String(it.unitPrice) : undefined,
                    }))
                  })}
                  disabled={approveMutation.isPending}
                  style={{ flex: 1 }}
                >
                  <IconCheck size={16}/> {approveMutation.isPending ? 'กำลังอนุมัติ...' : 'อนุมัติ & โอน Stock'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const reason = prompt('เหตุผลที่ปฏิเสธ (ถ้ามี):');
                    rejectMutation.mutate({ id: detail.id, reason: reason || undefined });
                  }}
                  disabled={rejectMutation.isPending}
                  style={{ color: 'var(--red)' }}
                >
                  <IconX size={16}/> ปฏิเสธ
                </button>
              </>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => cancelMutation.mutate({ id: detail.id })}
              disabled={cancelMutation.isPending}
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>

      {/* Set Invoice Modal */}
      {showInvoiceModal && (
        <SetInvoiceModal
          items={invoiceItems}
          onItemChange={(idx, field, val) =>
            setInvoiceItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
          }
          calcTotal={calcInvoiceTotal()}
          onConfirm={() => {
            const total = calcInvoiceTotal();
            setInvoiceMutation.mutate({
              id: detail.id,
              invoiceTotal: total,
              items: invoiceItems.map(it => ({ id: it.id, unitPrice: Number(it.unitPrice || 0) })),
            });
          }}
          isPending={setInvoiceMutation.isPending}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <PaymentModal
          invoiceTotal={Number(detail.invoiceTotal ?? 0)}
          reqId={detail.id}
          onClose={() => { setShowPayModal(false); refetchDetail(); }}
        />
      )}
    </Drawer>
  );
};

// ─── Set Invoice Modal ────────────────────────────────────────────────────────
const SetInvoiceModal = ({ items, onItemChange, calcTotal, onConfirm, isPending, onClose }) => (
  <Modal open onClose={onClose} title="กำหนดราคาใบแจ้งหนี้">
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13 }}>{item.itemName}</span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 60 }}>
              {Number(item.approvedQty).toFixed(2)} {item.unit}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>฿/หน่วย</span>
            <input
              type="number"
              className="input"
              style={{ width: 90, textAlign: 'right', height: 32 }}
              value={item.unitPrice}
              placeholder="0.00"
              onChange={e => onItemChange(idx, 'unitPrice', e.target.value)}
            />
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)',
        marginBottom: 16, fontWeight: 600,
      }}>
        <span>ยอดรวมทั้งหมด</span>
        <span>฿{calcTotal.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={onConfirm} disabled={isPending} style={{ flex: 1 }}>
          {isPending ? 'กำลังบันทึก...' : 'บันทึกราคา'}
        </button>
        <button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
      </div>
    </div>
  </Modal>
);

// ─── Payment Modal ────────────────────────────────────────────────────────────
const PaymentModal = ({ invoiceTotal, reqId, onClose }) => {
  const toast = useToast();
  const [method, setMethod] = useState('เงินโอน');
  const [amount, setAmount] = useState(String(invoiceTotal));
  const [ref, setRef] = useState('');

  const payMutation = trpc.requisitions.recordPayment.useMutation({
    onSuccess: () => { toast.success('บันทึกการชำระเงินสำเร็จ'); onClose(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal open onClose={onClose} title="บันทึกการชำระเงิน">
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '10px 14px', background: 'var(--matcha-50)', borderRadius: 'var(--r-default)',
          fontWeight: 600, fontSize: 15, textAlign: 'center',
        }}>
          ยอดที่ต้องชำระ: ฿{invoiceTotal.toFixed(2)}
        </div>
        <Field label="วิธีชำระเงิน">
          <Select
            value={method}
            onChange={setMethod}
            options={['เงินสด', 'เงินโอน', 'PromptPay', 'เช็ค', 'อื่นๆ']}
          />
        </Field>
        <Field label="ยอดชำระ (฿)">
          <input
            type="number"
            className="input"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.01"
          />
        </Field>
        <Field label="เลขอ้างอิง / หมายเหตุ">
          <input
            className="input"
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="เลขที่โอน, เลขเช็ค, ฯลฯ"
          />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={payMutation.isPending || !amount}
            onClick={() => payMutation.mutate({
              id: reqId,
              paymentMethod: method,
              paidAmount: Number(amount),
              paidRef: ref || undefined,
            })}
          >
            <IconCheck size={16}/> {payMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยันชำระเงิน'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>ยกเลิก</button>
        </div>
      </div>
    </Modal>
  );
};

export default PageRequisitions;
