// ============================================
// Requisitions: Branch requests stock/menu from HQ
// ============================================
import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, useToast, Drawer, Modal, Field, Select, Toggle, Tabs, EmptyState, SectionHeader } from "@/components";
import { IconPlus, IconCheck, IconX, IconTruck, IconBox, IconMenu } from "@/icons";

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
  const { data: detail } = trpc.requisitions.getById.useQuery({ id: req.id });

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

  if (!detail) return <Drawer open onClose={onClose} title="Loading..."><div style={{ padding: 20 }}>กำลังโหลด...</div></Drawer>;

  return (
    <Drawer open onClose={onClose} title={`ใบขอ ${detail.requestNumber}`} width={500}>
      <div style={{ padding: 20 }}>
        {/* Header info */}
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
        <SectionHeader title={`รายการ (${detail.items.length})`}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {detail.items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 'var(--r-default)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            }}>
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
          ))}
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
                  onClick={() => approveMutation.mutate({ id: detail.id })}
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
    </Drawer>
  );
};

export default PageRequisitions;
