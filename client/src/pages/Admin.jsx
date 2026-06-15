// ============================================
// Page: admin
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { EmptyShelf,IconBowl,IconBox,IconCake,IconCheck,IconCopy,IconCupHot,IconCupIced,IconEdit,IconExport,IconImport,IconLeaf,IconMore,IconMoreV,IconPayment,IconPlus,IconShare,IconTrash,IconUser,IconWhisk,IconX,IconInventory } from "@/icons";
import { useApp, Drawer,Field,Select,Toggle,Checkbox,Tabs,TopActionBar,BulkActionBar,EmptyState,StatCard,Avatar } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { exportAs, downloadCSV, downloadXLSX, downloadPDF, downloadPNG, tableHTMLFromRows } from "@/lib/export";
import { DistributeDrawer } from "@/components/DistributeDrawer";
import { StaffDetailDrawer } from "@/components/StaffDetailDrawer";
import BulkInviteModal from "@/components/BulkInviteModal";
import { ImageUploader } from "@/components/ImageUploader";
import { OptionStockEffectsModal } from "@/components/OptionStockEffectsModal";

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
  </div>
);

// ----- Admin Dashboard -----
export const PageAdminDash = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const { data: stats } = trpc.reports.getDashboardStats.useQuery({ branchId: branchId || undefined }, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: branches = [] } = trpc.branches.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });

  const s = stats ?? {};
  const fmtCurrency = (n) => {
    if (n == null || n === 0) return '฿0';
    if (n >= 1000000) return `฿${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `฿${(n / 1000).toFixed(1)}k`;
    return `฿${Math.round(n).toLocaleString()}`;
  };
  const pctChange = s.revenueChange != null
    ? `${s.revenueChange > 0 ? '+' : ''}${Number(s.revenueChange).toFixed(1)}%`
    : undefined;
  const branchColors = ['var(--matcha-600)', 'var(--gold)', 'var(--info)', 'var(--text-quaternary)'];

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('inv.overview')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'ภาพรวมการดำเนินงาน' : 'Operations Overview'}</h1>
            <p className="page-desc">{lang === 'th' ? 'มุมมองภาพรวมทุกสาขา · สรุปวันนี้' : 'Executive view across all branches · today\'s snapshot'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value="" onChange={() => {}} options={['Today', 'This week', 'This month', 'Quarter']} placeholder="Today"/>
            <button className="btn btn-secondary"><IconExport size={16}/> Export</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label={t('admin.todaySales')} value={fmtCurrency(s.todayRevenue)} delta={pctChange} sub={lang === 'th' ? 'เทียบกับเมื่อวาน' : 'vs. yesterday'} glow accent/>
        <StatCard label={t('admin.todayOrders')} value={(s.todayOrders ?? 0).toLocaleString()} sub={`${s.pendingOrders ?? 0} ${lang === 'th' ? 'รอดำเนินการ' : 'pending'}`}/>
        <StatCard label={t('admin.avgOrderValue')} value={fmtCurrency(s.averageOrderValue)} sub={lang === 'th' ? 'ต่อออเดอร์' : 'per order'}/>
        <StatCard label={t('inv.lowStock')} value={String(s.lowStockCount ?? 0)} sub={lang === 'th' ? 'รายการต้องเติม' : 'items need restock'}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }} className="admin-grid">
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div className="t-h4" style={{ fontWeight: 600 }}>{lang === 'th' ? 'แนวโน้มรายได้' : 'Revenue trend'}</div>
              <div className="muted" style={{ fontSize: 13 }}>{lang === 'th' ? 'รายวัน 30 วันล่าสุด · ทุกสาขา' : 'Daily, last 30 days · all branches'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {branches.slice(0, 4).map((b, i) => (
                <Legend key={b.id} color={branchColors[i]} label={b.name}/>
              ))}
            </div>
          </div>
          <MultiAreaChart/>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 12 }}>{t('settings.branches')}</div>
            {branches.length === 0 ? (
              <div className="muted" style={{ fontSize: 13, padding: '12px 0' }}>{lang === 'th' ? 'ยังไม่มีสาขา เพิ่มสาขาในหน้า Franchise' : 'No branches yet. Add a branch in Franchise.'}</div>
            ) : (
              branches.slice(0, 6).map((b, i) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: branchColors[i % branchColors.length] }}/>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{b.branchCode} · {b.province || b.district || '—'}</div>
                  </div>
                  <span className={'pill ' + (b.status === 'active' ? 'pill-matcha' : '')} style={{ fontSize: 10, height: 18 }}>{b.status}</span>
                </div>
              ))
            )}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 12 }}>{lang === 'th' ? 'สถานะระบบ' : 'System health'}</div>
            {[
              { l: 'POS sync', s: 'Connected', c: 'var(--matcha-600)' },
              { l: 'Pending orders', s: `${s.pendingOrders ?? 0} awaiting`, c: (s.pendingOrders ?? 0) > 5 ? 'var(--warning)' : 'var(--matcha-600)' },
              { l: 'Low stock alert', s: `${s.lowStockCount ?? 0} items`, c: (s.lowStockCount ?? 0) > 0 ? 'var(--warning)' : 'var(--matcha-600)' },
            ].map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: h.c }}/>
                <div style={{ flex: 1, fontSize: 13 }}>
                  <div>{h.l}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{h.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) { .admin-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

const Legend = ({ color, label }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
  <span style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>{label}
</span>;

const MultiAreaChart = ({ h = 260 }) => {
  const series = [
    { c: 'var(--matcha-600)', d: [4,5,6,7,5,6,8,7,9,8,7,9,10,11,9,10,12,11,13,12,11,10,12,13,14,12,11,13,14,15] },
    { c: 'var(--gold)', d: [3,4,4,5,4,5,6,5,7,6,5,7,8,9,7,8,10,9,11,10,9,8,10,11,12,10,9,11,12,13] },
    { c: 'var(--info)', d: [2,3,3,4,3,4,5,4,6,5,4,6,7,8,6,7,9,8,10,9,8,7,9,10,11,9,8,10,11,12] },
    { c: 'var(--text-quaternary)', d: [1,2,2,3,2,3,4,3,5,4,3,5,6,7,5,6,8,7,9,8,7,6,8,9,10,8,7,9,10,11] },
  ];
  const w = 800;
  const max = 16;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={0} y1={h * g} x2={w} y2={h * g} stroke="var(--border-default)" strokeDasharray="2 4"/>
      ))}
      {series.map((s, idx) => {
        const step = w / (s.d.length - 1);
        const pts = s.d.map((v, i) => [i * step, h - (v / max) * (h - 20) - 10]);
        const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
        return (
          <g key={idx}>
            <defs>
              <linearGradient id={`mg-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.c} stopOpacity="0.18"/>
                <stop offset="100%" stopColor={s.c} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#mg-${idx})`}/>
            <path d={d} stroke={s.c} strokeWidth="1.5" fill="none"/>
          </g>
        );
      })}
    </svg>
  );
};

// ----- Menu Management -----
export const PageAdminMenu = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [tab, setTab] = useState('basic');
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [distributeOpen, setDistributeOpen] = useState(false);

  // Form state for the drawer
  const [form, setForm] = useState({
    name: '', nameThai: '', description: '', sku: '',
    categoryId: null, basePrice: '', costPrice: '', memberPrice: '',
    imageUrl: '', tags: [], isActive: true, isFeatured: false,
    prepTimeMinutes: '', recipeNotes: '', sopId: null,
  });
  // Selected option group IDs (Size, Sweetness, etc.) attached to this item
  const [linkedGroupIds, setLinkedGroupIds] = useState(new Set());
  // Recipe ingredients: [{ inventoryItemId, quantity, unitOfMeasure, notes }]
  const [recipeIngredients, setRecipeIngredients] = useState([]);

  const { data: menuData, isLoading: menuLoading, refetch: refetchMenu } = trpc.menu.list.useQuery(
    { search: search || undefined, branchId: branchId || undefined },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: categories = [] } = trpc.categories.list.useQuery({ branchId: branchId || undefined }, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: optionGroupsAll = [] } = trpc.options.listGroups.useQuery();
  const { data: inventoryItems = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: sops = [] } = trpc.sop.list.useQuery({ status: 'published' }, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: itemDetail } = trpc.menu.getById.useQuery(
    { id: editItem?.id ?? 0 },
    { enabled: !!editItem?.id }
  );

  const updateItem = trpc.menu.update.useMutation();
  const createItem = trpc.menu.create.useMutation();
  const linkOptionGroups = trpc.menu.linkOptionGroups.useMutation();
  const setRecipe = trpc.menu.setRecipe.useMutation();
  const archiveItem = trpc.menu.archive.useMutation({ onSuccess: () => refetchMenu() });
  const quickToggle = trpc.menu.update.useMutation({ onSuccess: () => refetchMenu() });
  const bulkArchiveItems = trpc.menu.bulkArchive.useMutation({ onSuccess: () => { setSelected(new Set()); refetchMenu(); } });

  const items = menuData ?? [];
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Hydrate form when loading existing item
  useEffect(() => {
    if (editItem && itemDetail) {
      setForm({
        name: itemDetail.name || '',
        nameThai: itemDetail.nameThai || '',
        description: itemDetail.description || '',
        sku: itemDetail.sku || '',
        categoryId: itemDetail.categoryId ?? null,
        basePrice: String(itemDetail.basePrice ?? ''),
        costPrice: String(itemDetail.costPrice ?? ''),
        memberPrice: String(itemDetail.memberPrice ?? ''),
        imageUrl: itemDetail.imageUrl || '',
        tags: itemDetail.tags ?? [],
        isActive: itemDetail.isActive !== false,
        isFeatured: !!itemDetail.isFeatured,
        prepTimeMinutes: itemDetail.prepTimeMinutes ? String(itemDetail.prepTimeMinutes) : '',
        recipeNotes: itemDetail.recipeNotes || '',
        sopId: itemDetail.sopId ?? null,
      });
      setLinkedGroupIds(new Set((itemDetail.optionGroups ?? []).map((g) => g.optionGroupId).filter(Boolean)));
      setRecipeIngredients((itemDetail.recipe ?? []).map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantity: String(r.quantity),
        unitOfMeasure: r.unitOfMeasure,
        role: r.role || '',
        notes: r.notes || '',
      })));
    }
  }, [itemDetail?.id]);

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', nameThai: '', description: '', sku: '', categoryId: null, basePrice: '', costPrice: '', memberPrice: '', imageUrl: '', tags: [], isActive: true, isFeatured: false, prepTimeMinutes: '', recipeNotes: '', sopId: null });
    setLinkedGroupIds(new Set());
    setRecipeIngredients([]);
    setTab('basic');
    setDrawerOpen(true);
  };
  const openEdit = (it) => { setEditItem(it); setTab('basic'); setDrawerOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Please enter a name'); return; }
    if (!form.basePrice) { alert('Please enter a base price'); return; }
    try {
      const payload = {
        name: form.name.trim(),
        nameThai: form.nameThai.trim() || undefined,
        description: form.description.trim() || undefined,
        sku: form.sku.trim() || undefined,
        categoryId: form.categoryId,
        basePrice: form.basePrice,
        costPrice: form.costPrice || undefined,
        memberPrice: form.memberPrice || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        prepTimeMinutes: form.prepTimeMinutes ? Number(form.prepTimeMinutes) : undefined,
        recipeNotes: form.recipeNotes.trim() || undefined,
        sopId: form.sopId,
      };
      let itemId = editItem?.id;
      if (editItem) {
        await updateItem.mutateAsync({ id: editItem.id, ...payload });
      } else {
        const created = await createItem.mutateAsync(payload);
        itemId = created?.id;
      }
      if (itemId) {
        // Save option group links
        await linkOptionGroups.mutateAsync({
          menuItemId: itemId,
          optionGroupIds: Array.from(linkedGroupIds),
        });
        // Save recipe
        await setRecipe.mutateAsync({
          menuItemId: itemId,
          ingredients: recipeIngredients.filter((r) => r.inventoryItemId && r.quantity).map((r) => ({
            inventoryItemId: Number(r.inventoryItemId),
            quantity: r.quantity,
            unitOfMeasure: r.unitOfMeasure || 'piece',
            role: r.role || undefined,
            notes: r.notes || undefined,
          })),
        });
      }
      refetchMenu();
      setDrawerOpen(false);
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  };

  const toggleGroup = (gid) => setLinkedGroupIds((s) => {
    const next = new Set(s);
    next.has(gid) ? next.delete(gid) : next.add(gid);
    return next;
  });
  const addIngredient = () => setRecipeIngredients((r) => [...r, { inventoryItemId: '', quantity: '', unitOfMeasure: 'piece', role: '', notes: '' }]);
  const updateIngredient = (idx, patch) => setRecipeIngredients((r) => r.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeIngredient = (idx) => setRecipeIngredients((r) => r.filter((_, i) => i !== idx));

  const isSaving = createItem.isPending || updateItem.isPending || linkOptionGroups.isPending || setRecipe.isPending;

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.menu')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{t('admin.menu')}</h1>
            <p className="page-desc">{items.length} {lang === 'th' ? 'รายการ' : 'items'} · {categories?.length ?? 0} {t('admin.categories')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (selected.size === 0) { alert('Select menu items first (checkboxes in the table) before distributing.'); return; }
                setDistributeOpen(true);
              }}
              title="Send selected menu items to other branches"
            ><IconShare size={16}/> Distribute to branches</button>
            <button className="btn btn-primary" onClick={openNew}><IconPlus size={16}/> New Item</button>
          </div>
        </div>
      </div>

      <TopActionBar
        search={search} onSearch={setSearch}
        filters={<>
          <Select value="" onChange={() => {}} options={['All status', 'Available', 'Hidden', 'Out of stock']} placeholder="All status"/>
        </>}
        viewMode="grid"
        onViewMode={() => {}}
        onAdd={openNew}
        onExport={() => {
          const rows = items.map((it) => ({
            sku: it.sku || '',
            name: it.name,
            nameThai: it.nameThai || '',
            category: catMap.get(it.categoryId) || '',
            basePrice: it.basePrice,
            costPrice: it.costPrice,
            isActive: it.isActive !== false ? 'Yes' : 'No',
            isFeatured: it.isFeatured ? 'Yes' : 'No',
          }));
          downloadCSV('menu-items', rows);
        }}
      />

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())} actions={<>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (selected.size === 1) {
            const id = Array.from(selected)[0];
            const it = items.find((x) => x.id === id);
            if (it) openEdit(it);
          } else {
            alert('Select exactly one item to edit.');
          }
        }}><IconEdit size={14}/> Edit</button>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (selected.size === 0) return;
          if (!window.confirm(`Archive ${selected.size} item(s)?`)) return;
          bulkArchiveItems.mutate({ ids: Array.from(selected) });
        }}><IconBox size={14}/> Archive selected</button>
      </>}/>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
              <th style={{ width: 40, padding: '12px 8px 12px 16px' }}><Checkbox checked={selected.size === items.length} indeterminate={selected.size > 0 && selected.size < items.length} onChange={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map(i => i.id)))}/></th>
              {['Photo', 'Name', 'Category', 'Price', 'Cost', 'Margin', 'Stock', 'Available', 'Modified', ''].map((h) => (
                <th key={h} style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuLoading ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center' }} className="muted">Loading menu items…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <IconWhisk size={32} style={{ opacity: 0.3 }}/>
                <p style={{ marginTop: 12 }}>No menu items yet. Add your first item.</p>
              </td></tr>
            ) : items.map((it) => {
              const price = Number(it.basePrice ?? 0);
              const cost = Number(it.costPrice ?? 0);
              const margin = cost > 0 && price > 0 ? ((price - cost) / price * 100).toFixed(0) : '—';
              const modAt = it.updatedAt ? new Date(it.updatedAt).toLocaleDateString() : '—';
              return (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--border-default)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 8px 12px 16px' }}><Checkbox checked={selected.has(it.id)} onChange={() => {
                    const s = new Set(selected); s.has(it.id) ? s.delete(it.id) : s.add(it.id); setSelected(s);
                  }}/></td>
                  <td style={{ padding: '8px 12px' }}>
                    {it.imageUrl
                      ? <img src={it.imageUrl} alt={it.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}/>
                      : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))', display: 'grid', placeItems: 'center', color: 'var(--matcha-700)' }}><IconWhisk size={20}/></div>
                    }
                  </td>
                  <td style={{ padding: '12px', fontWeight: 500, cursor: 'pointer' }} onClick={() => openEdit(it)}>
                    {it.name}
                    {it.nameThai && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{it.nameThai}</div>}
                  </td>
                  <td style={{ padding: '12px' }}><span className="pill">{catMap.get(it.categoryId) ?? '—'}</span></td>
                  <td style={{ padding: '12px' }} className="tabular">฿{price}</td>
                  <td style={{ padding: '12px', color: 'var(--text-tertiary)' }} className="tabular">{cost > 0 ? `฿${cost}` : '—'}</td>
                  <td style={{ padding: '12px', color: 'var(--matcha-700)', fontWeight: 500 }} className="tabular">{margin}{margin !== '—' ? '%' : ''}</td>
                  <td style={{ padding: '12px' }}><span className={'pill ' + (it.isActive !== false ? 'pill-matcha' : '')} style={{ fontSize: 11 }}><span className="dot"/> {it.isActive !== false ? 'Available' : 'Hidden'}</span></td>
                  <td style={{ padding: '12px' }}>
                    <Toggle checked={it.isActive !== false} onChange={(v) => quickToggle.mutate({ id: it.id, isActive: v })}/>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-tertiary)', fontSize: 12 }}>{modAt}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => openEdit(it)} title="Edit"><IconEdit size={14}/></button>
                      <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => { if (window.confirm(`Archive "${it.name}"?`)) archiveItem.mutate({ id: it.id }); }} title="Archive"><IconTrash size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        title={editItem ? 'Edit menu item' : 'New menu item'} subtitle={editItem?.name ?? ''}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save & Close'}</button>
        </>}>
        <Tabs items={[
          { value: 'basic', label: 'Basic' },
          { value: 'pricing', label: 'Pricing' },
          { value: 'options', label: `Options${linkedGroupIds.size > 0 ? ` · ${linkedGroupIds.size}` : ''}` },
          { value: 'recipe', label: `Recipe${recipeIngredients.length > 0 ? ` · ${recipeIngredients.length}` : ''}` },
          { value: 'sop', label: `SOP${form.sopId ? ' ·' : ''}` },
        ]} value={tab} onChange={setTab}/>

        <div style={{ paddingTop: 20 }}>
          {tab === 'basic' && (
            <>
              <ImageUploader
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                label="Menu Photo"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Name (English)" required>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Iced Matcha Latte"/>
                </Field>
                <Field label="Name (Thai)">
                  <input className="input" value={form.nameThai} onChange={(e) => setForm({ ...form, nameThai: e.target.value })} placeholder="มัทฉะลาเต้เย็น"/>
                </Field>
              </div>
              <Field label="Description">
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A calm, balanced matcha latte over ice…"/>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Category">
                  <select className="input" value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="SKU">
                  <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="HBM-001"/>
                </Field>
              </div>
              <Field label="Tags" hint="Press Enter to add">
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {form.tags.map((t) => (
                      <span key={t} className="pill pill-matcha" style={{ cursor: 'pointer' }} onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}>{t} <IconX size={11}/></span>
                    ))}
                  </div>
                  <input className="input" placeholder="popular, signature, vegan…" onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = e.target.value.trim();
                      if (v && !form.tags.includes(v)) setForm({ ...form, tags: [...form.tags, v] });
                      e.target.value = '';
                    }
                  }}/>
                </div>
              </Field>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: 12, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)' }}>
                <span style={{ fontWeight: 500 }}>Available for sale</span>
                <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, padding: 12, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)' }}>
                <span style={{ fontWeight: 500 }}>Featured (POS first row)</span>
                <Toggle checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })}/>
              </div>
            </>
          )}

          {tab === 'pricing' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Base price" required>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>฿</span>
                    <input className="input" type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} style={{ paddingLeft: 24 }}/>
                  </div>
                </Field>
                <Field label="Cost">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>฿</span>
                    <input className="input" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} style={{ paddingLeft: 24 }}/>
                  </div>
                </Field>
                <Field label="Member price">
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>฿</span>
                    <input className="input" type="number" value={form.memberPrice} onChange={(e) => setForm({ ...form, memberPrice: e.target.value })} style={{ paddingLeft: 24 }}/>
                  </div>
                </Field>
                <Field label="Prep time (min)">
                  <input className="input" type="number" value={form.prepTimeMinutes} onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })} placeholder="3"/>
                </Field>
              </div>
              {(() => {
                const p = Number(form.basePrice) || 0;
                const c = Number(form.costPrice) || 0;
                const margin = p > 0 && c > 0 ? ((p - c) / p * 100) : null;
                const markup = c > 0 && p > 0 ? (p / c) : null;
                return (
                  <div style={{ padding: 14, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
                    <Stat label="Margin" value={margin != null ? `${margin.toFixed(1)}%` : '—'} color={margin && margin > 50 ? 'var(--matcha-700)' : undefined}/>
                    <Stat label="Markup" value={markup != null ? `${markup.toFixed(1)}×` : '—'}/>
                    <Stat label="Tax inc." value={p > 0 ? `฿${(p * 1.07).toFixed(2)}` : '—'}/>
                  </div>
                );
              })()}
            </>
          )}

          {tab === 'options' && (
            <>
              <div style={{ marginBottom: 12, padding: 12, background: 'var(--matcha-50)', borderRadius: 'var(--r-default)', fontSize: 13, color: 'var(--matcha-700)' }}>
                Pick the option groups that apply to <strong>this</strong> menu item. Customers will see them on POS when ordering.
              </div>
              {optionGroupsAll.length === 0 ? (
                <EmptyState
                  illustration={<EmptyShelf/>}
                  title="No option groups defined"
                  desc="Create option groups first under Administration → Options & Modifiers."
                />
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {optionGroupsAll.map((g, i) => {
                    const on = linkedGroupIds.has(g.id);
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', cursor: 'pointer', background: on ? 'var(--matcha-50)' : 'transparent' }} onClick={() => toggleGroup(g.id)}>
                        <Checkbox checked={on} onChange={() => toggleGroup(g.id)}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500 }}>{g.name}{g.nameThai && <span className="muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: 12 }}>· {g.nameThai}</span>}</div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                            {{ single: 'Single choice', multi: 'Multi-select', quantity: 'Quantity' }[g.selectionType] || g.selectionType}
                            {g.isRequired && ' · Required'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'recipe' && (
            <>
              <div style={{ marginBottom: 12, padding: 12, background: 'var(--matcha-50)', borderRadius: 'var(--r-default)', fontSize: 13, color: 'var(--matcha-700)' }}>
                Ingredients are deducted from inventory when this item is sold (if Track Inventory is on).
              </div>
              {inventoryItems.length === 0 ? (
                <EmptyState
                  illustration={<EmptyShelf/>}
                  title="No inventory items"
                  desc="Add inventory items under Inventory → Items & Materials first."
                />
              ) : (
                <>
                  <div className="card" style={{ padding: 12, marginBottom: 12 }}>
                    {recipeIngredients.length === 0 ? (
                      <div className="muted" style={{ textAlign: 'center', padding: 16, fontSize: 13 }}>No ingredients yet.</div>
                    ) : recipeIngredients.map((ing, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 130px 1fr 28px', gap: 8, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'center' }}>
                        <select className="input" value={ing.inventoryItemId} onChange={(e) => updateIngredient(i, { inventoryItemId: e.target.value })}>
                          <option value="">— Pick ingredient —</option>
                          {inventoryItems.map((iv) => <option key={iv.id} value={iv.id}>{iv.name}{iv.itemCode ? ` (${iv.itemCode})` : ''}</option>)}
                        </select>
                        <input className="input" type="number" step="0.01" value={ing.quantity} onChange={(e) => updateIngredient(i, { quantity: e.target.value })} placeholder="Qty"/>
                        <select className="input" value={ing.unitOfMeasure} onChange={(e) => updateIngredient(i, { unitOfMeasure: e.target.value })}>
                          {['g', 'kg', 'ml', 'l', 'piece', 'pack', 'box', 'bottle', 'can', 'bag'].map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select className="input" value={ing.role || ''} onChange={(e) => updateIngredient(i, { role: e.target.value })}>
                          <option value="">— No role —</option>
                          {['MILK', 'SWEETENER', 'MATCHA', 'ICE', 'CUP', 'LID', 'STRAW', 'PACKAGING', 'TOPPING'].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <input className="input" value={ing.notes} onChange={(e) => updateIngredient(i, { notes: e.target.value })} placeholder="Notes…"/>
                        <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeIngredient(i)}><IconX size={12}/></button>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={addIngredient}><IconPlus size={14}/> Add Ingredient</button>
                  </div>
                </>
              )}
              <Field label="Preparation notes" hint="What's important for staff to know?">
                <textarea className="input" rows={4} value={form.recipeNotes} onChange={(e) => setForm({ ...form, recipeNotes: e.target.value })} placeholder="Step 1: sieve matcha. Step 2: whisk with 30ml water…"/>
              </Field>
            </>
          )}

          {tab === 'sop' && (
            <>
              <div style={{ marginBottom: 12, padding: 12, background: 'var(--matcha-50)', borderRadius: 'var(--r-default)', fontSize: 13, color: 'var(--matcha-700)' }}>
                Link an SOP that explains how to prepare this item. Staff can tap it from the POS to read step-by-step instructions.
              </div>
              {sops.length === 0 ? (
                <EmptyState
                  illustration={<EmptyShelf/>}
                  title="No published SOPs"
                  desc="Write and publish an SOP first under Knowledge → SOP Library."
                />
              ) : (
                <>
                  <Field label="Linked SOP">
                    <select className="input" value={form.sopId ?? ''} onChange={(e) => setForm({ ...form, sopId: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— No SOP linked —</option>
                      {sops.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </Field>
                  {form.sopId && (
                    <div className="card" style={{ padding: 16, marginTop: 12 }}>
                      {(() => {
                        const sop = sops.find((s) => s.id === form.sopId);
                        if (!sop) return null;
                        return (
                          <>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{sop.title}</div>
                            {sop.subtitle && <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{sop.subtitle}</div>}
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Status: {sop.status} · v{sop.version ?? 1}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Drawer>

      {/* Distribute selected menu items — uses unified DistributeDrawer */}
      <DistributeDrawer
        open={distributeOpen}
        onClose={() => { setDistributeOpen(false); setSelected(new Set()); }}
        entityType="menu_items"
        entityIds={Array.from(selected)}
        onDone={() => { setSelected(new Set()); refetchMenu(); }}
      />
    </div>
  );
};

// ----- Categories -----
const CAT_ICON_MAP = { IconWhisk, IconCupHot, IconCupIced, IconLeaf, IconCake, IconBowl, IconBox };
const CAT_COLORS = ['var(--matcha-600)', 'var(--warning)', 'var(--info)', 'var(--matcha-700)', '#d97706', '#a16207', 'var(--text-secondary)'];

export const PageAdminCategories = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const [addDrawer, setAddDrawer] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', nameThai: '', iconName: 'IconWhisk', colorHex: '#4caf50' });

  const { data: cats = [], isLoading, refetch } = trpc.categories.list.useQuery({ branchId: branchId || undefined }, { staleTime: 5000, refetchOnWindowFocus: true });
  const createCat = trpc.categories.create.useMutation({ onSuccess: () => { refetch(); setAddDrawer(false); }, onError: (e) => alert(e.message) });
  const deleteCat = trpc.categories.delete.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const handleDeleteCat = (cat) => { if (window.confirm(`ลบหมวดหมู่ "${cat.name}"? ข้อมูลจะหายถาวร`)) deleteCat.mutate({ id: cat.id }); };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.categories')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{t('admin.categories')}</h1>
            <p className="page-desc">{cats.length} {t('admin.categories')} · {lang === 'th' ? 'ลากเพื่อเรียงลำดับ · กดเพื่อแก้ไข' : 'drag to reorder · click to edit'}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setAddDrawer(true)}><IconPlus size={16}/> New Category</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[1,2,3,4].map((i) => <div key={i} className="card" style={{ height: 132, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {cats.map((c, i) => {
            const I = CAT_ICON_MAP[c.iconName] || IconWhisk;
            const color = c.colorHex || CAT_COLORS[i % CAT_COLORS.length];
            return (
              <div key={c.id} className="card" style={{ padding: 22, cursor: 'grab', animation: `slideUp 360ms var(--ease-out-expo) ${i * 50}ms both` }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '20', color, display: 'grid', placeItems: 'center' }}>
                    <I size={24}/>
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={() => handleDeleteCat(c)} title="Delete"><IconX size={14}/></button>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
                {c.nameThai && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{c.nameThai}</div>}
              </div>
            );
          })}
          {cats.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
              <IconBox size={36} style={{ opacity: 0.3 }}/>
              <p style={{ marginTop: 12 }}>No categories yet. Add your first category.</p>
            </div>
          )}
          <button className="card" onClick={() => setAddDrawer(true)} style={{ padding: 22, border: '1.5px dashed var(--border-emphasis)', background: 'transparent', display: 'grid', placeItems: 'center', minHeight: 132, color: 'var(--text-tertiary)' }}>
            <div style={{ textAlign: 'center' }}>
              <IconPlus size={24}/>
              <div style={{ marginTop: 6, fontSize: 14 }}>New category</div>
            </div>
          </button>
        </div>
      )}

      <Drawer open={addDrawer} onClose={() => setAddDrawer(false)} title="New Category"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddDrawer(false)}>Cancel</button>
          <button className="btn btn-primary" disabled={createCat.isPending} onClick={() => createCat.mutate(newCat)}>
            {createCat.isPending ? 'Creating…' : 'Create'}
          </button>
        </>}>
        <Field label="Name (English)" required><input className="input" value={newCat.name} onChange={(e) => setNewCat(s => ({ ...s, name: e.target.value }))}/></Field>
        <Field label="Name (Thai)"><input className="input" value={newCat.nameThai} onChange={(e) => setNewCat(s => ({ ...s, nameThai: e.target.value }))}/></Field>
        <Field label="Icon">
          <Select value={newCat.iconName} onChange={(v) => setNewCat(s => ({ ...s, iconName: v }))} options={Object.keys(CAT_ICON_MAP)}/>
        </Field>
      </Drawer>
    </div>
  );
};

// ----- Options & Modifiers -----
export const PageAdminOptions = () => {
  const { t, lang } = useApp();
  const { data: groups = [], isLoading: groupsLoading, refetch: refetchGroups } = trpc.options.listGroups.useQuery();
  const [activeId, setActiveId] = useState(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '', nameThai: '', selectionType: 'single', isRequired: false });
  const [newOption, setNewOption] = useState({ name: '', priceAdjustment: '0', costAdjustment: '0' });
  const [effectsModalOpen, setEffectsModalOpen] = useState(false);
  const [selectedOptionForEffects, setSelectedOptionForEffects] = useState(null);

  useEffect(() => {
    if (groups.length > 0 && !activeId) setActiveId(groups[0].id);
  }, [groups, activeId]);

  const { data: activeGroup, refetch: refetchGroup } = trpc.options.getGroupById.useQuery(
    { id: activeId },
    { enabled: !!activeId }
  );

  const createGroup = trpc.options.createGroup.useMutation({
    onSuccess: (g) => {
      refetchGroups();
      setNewGroupOpen(false);
      setNewGroupForm({ name: '', nameThai: '', selectionType: 'single', isRequired: false });
      if (g?.id) setActiveId(g.id);
    },
  });
  const updateGroup = trpc.options.updateGroup.useMutation({
    onSuccess: () => { refetchGroups(); refetchGroup(); },
  });
  const createOption = trpc.options.createOption.useMutation({
    onSuccess: () => { refetchGroup(); refetchGroups(); setNewOption({ name: '', priceAdjustment: '0', costAdjustment: '0' }); },
  });
  const updateOption = trpc.options.updateOption.useMutation({
    onSuccess: () => refetchGroup(),
  });
  const deleteOption = trpc.options.deleteOption.useMutation({
    onSuccess: () => { refetchGroup(); refetchGroups(); },
  });

  const handleSaveStockEffects = (effects) => {
    if (selectedOptionForEffects) {
      updateOption.mutate({ id: selectedOptionForEffects.id, stockEffects: effects });
    }
    setEffectsModalOpen(false);
    setSelectedOptionForEffects(null);
  };

  const typeLabel = (t) => ({ single: 'Single', multi: 'Multi', quantity: 'Quantity' }[t] || t);

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.options')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'ตัวเลือกและตัวปรับ' : 'Options & Modifiers'}</h1>
            <p className="page-desc">{groups.length} {lang === 'th' ? 'กลุ่มตัวเลือก' : `option group${groups.length !== 1 ? 's' : ''}`}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" disabled><IconImport size={16}/> Import CSV</button>
            <button className="btn btn-primary" onClick={() => setNewGroupOpen(true)}><IconPlus size={16}/> New Group</button>
          </div>
        </div>
      </div>

      {groupsLoading ? (
        <div className="card muted" style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<IconLeaf size={48}/>}
          title="No option groups yet"
          desc="Create groups like Size, Sweetness, or Toppings to attach to menu items."
          action={<button className="btn btn-primary" onClick={() => setNewGroupOpen(true)}><IconPlus size={16}/> Create first group</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }} className="opt-grid">
          <div className="card" style={{ padding: 8, height: 'fit-content' }}>
            {groups.map((gr) => (
              <button key={gr.id} onClick={() => setActiveId(gr.id)} style={{
                width: '100%', padding: '12px 14px', borderRadius: 'var(--r-subtle)',
                display: 'flex', alignItems: 'center', gap: 12,
                background: gr.id === activeId ? 'var(--matcha-50)' : 'transparent',
                color: gr.id === activeId ? 'var(--matcha-700)' : 'var(--text-primary)',
                textAlign: 'left',
                transition: 'background 180ms',
                marginBottom: 2,
              }}
                onMouseEnter={(e) => { if (gr.id !== activeId) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                onMouseLeave={(e) => { if (gr.id !== activeId) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{gr.name}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{typeLabel(gr.selectionType)}{gr.nameThai ? ` · ${gr.nameThai}` : ''}</div>
                </span>
                {gr.isRequired && <span className="pill" style={{ height: 18, fontSize: 10 }}>Required</span>}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setNewGroupOpen(true)}><IconPlus size={14}/> Add group</button>
          </div>

          {activeGroup && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div className="t-h3" style={{ fontWeight: 600 }}>{activeGroup.name}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{typeLabel(activeGroup.selectionType)} selection · {activeGroup.options?.length ?? 0} options</div>
                </div>
                <button className="btn btn-secondary btn-sm"><IconMoreV size={14}/></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
                <Field label="Selection type">
                  <Select
                    value={typeLabel(activeGroup.selectionType)}
                    onChange={(v) => {
                      const mapped = { Single: 'single', Multi: 'multi', Quantity: 'quantity' }[v] || 'single';
                      updateGroup.mutate({ id: activeGroup.id, selectionType: mapped });
                    }}
                    options={['Single', 'Multi', 'Quantity']}
                  />
                </Field>
                <Field label="Required">
                  <Toggle
                    checked={!!activeGroup.isRequired}
                    onChange={(v) => updateGroup.mutate({ id: activeGroup.id, isRequired: v })}
                    label="Required to select"
                  />
                </Field>
              </div>

              <div className="t-caption" style={{ marginBottom: 8 }}>{lang === 'th' ? 'รายการตัวเลือก' : 'Options'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 100px 100px 80px 80px 28px', gap: 12, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border-default)', color: 'var(--text-tertiary)', fontSize: 12, fontWeight: 500 }}>
                <div></div>
                <div>{lang === 'th' ? 'ชื่อตัวเลือก' : 'Option Name'}</div>
                <div>{lang === 'th' ? 'ราคาเพิ่ม' : 'Price Adj.'}</div>
                <div>{lang === 'th' ? 'ต้นทุน' : 'Cost'}</div>
                <div style={{ textAlign: 'center' }}>{lang === 'th' ? 'ผลสต๊อก' : 'Stock'}</div>
                <div>{lang === 'th' ? 'ใช้งาน' : 'Active'}</div>
                <div></div>
              </div>

              <div>
                {(activeGroup.options ?? []).length === 0 ? (
                  <div className="muted" style={{ fontSize: 13, padding: '12px 0' }}>{lang === 'th' ? 'ไม่มีตัวเลือกในกลุ่มนี้ เพิ่มตัวเลือกด้านล่าง' : 'No options yet. Add one below.'}</div>
                ) : (
                  (activeGroup.options ?? []).map((opt, i) => (
                    <div key={opt.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 100px 100px 80px 80px 28px', gap: 12, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'center' }}>
                      <span style={{ cursor: 'grab', color: 'var(--text-quaternary)' }}>::</span>
                      <input
                        className="input"
                        defaultValue={opt.name}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== opt.name) updateOption.mutate({ id: opt.id, name: v });
                        }}
                      />
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>+฿</span>
                        <input
                          className="input"
                          type="number"
                          defaultValue={opt.priceAdjustment ?? 0}
                          style={{ paddingLeft: 32 }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== String(opt.priceAdjustment)) updateOption.mutate({ id: opt.id, priceAdjustment: v });
                          }}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>฿</span>
                        <input
                          className="input"
                          type="number"
                          placeholder={lang === 'th' ? 'ต้นทุน' : 'Cost'}
                          defaultValue={opt.costAdjustment ?? 0}
                          style={{ paddingLeft: 24 }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            if (v !== String(opt.costAdjustment)) updateOption.mutate({ id: opt.id, costAdjustment: v });
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{
                            width: 32,
                            height: 32,
                            position: 'relative',
                            color: opt.stockEffects && Array.isArray(opt.stockEffects) && opt.stockEffects.length > 0 ? 'var(--matcha-600)' : 'var(--text-tertiary)'
                          }}
                          onClick={() => {
                            setSelectedOptionForEffects(opt);
                            setEffectsModalOpen(true);
                          }}
                          title={lang === 'th' ? 'ตั้งค่าผลต่อสต๊อก' : 'Stock Effects'}
                        >
                          <IconInventory size={16} />
                          {opt.stockEffects && Array.isArray(opt.stockEffects) && opt.stockEffects.length > 0 && (
                            <span style={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              fontSize: 9,
                              fontWeight: 'bold',
                              padding: '2px 4px',
                              background: 'var(--matcha-500)',
                              color: 'white',
                              borderRadius: 10,
                              lineHeight: 1
                            }}>
                              {opt.stockEffects.length}
                            </span>
                          )}
                        </button>
                      </div>
                      <Toggle
                        checked={!!opt.isActive}
                        onChange={(v) => updateOption.mutate({ id: opt.id, isActive: v })}
                      />
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 24 }}
                        onClick={() => {
                          if (window.confirm(`Delete option "${opt.name}"?`)) deleteOption.mutate({ id: opt.id });
                        }}
                      ><IconTrash size={12}/></button>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px 80px auto', gap: 8, marginTop: 14, alignItems: 'center' }}>
                <input
                  className="input"
                  placeholder={lang === 'th' ? 'ชื่อตัวเลือกใหม่' : 'New option name'}
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                />
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>+฿</span>
                  <input
                    className="input"
                    type="number"
                    value={newOption.priceAdjustment}
                    onChange={(e) => setNewOption({ ...newOption, priceAdjustment: e.target.value })}
                    style={{ paddingLeft: 32 }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>฿</span>
                  <input
                    className="input"
                    type="number"
                    placeholder={lang === 'th' ? 'ต้นทุน' : 'Cost'}
                    value={newOption.costAdjustment}
                    onChange={(e) => setNewOption({ ...newOption, costAdjustment: e.target.value })}
                    style={{ paddingLeft: 24 }}
                  />
                </div>
                <div></div>
                <div></div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!newOption.name.trim()) return;
                    createOption.mutate({
                      groupId: activeGroup.id,
                      name: newOption.name.trim(),
                      priceAdjustment: newOption.priceAdjustment || '0',
                      costAdjustment: newOption.costAdjustment || '0',
                    });
                  }}
                  disabled={createOption.isPending || !newOption.name.trim()}
                ><IconPlus size={14}/> {lang === 'th' ? 'เพิ่ม' : 'Add'}</button>
              </div>

              {/* ─── Linked Menus Section ─── */}
              <LinkedMenusSection optionGroupId={activeGroup.id} />
            </div>
          )}
        </div>
      )}

      <Drawer
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        title="New Option Group"
        subtitle="Create a customisation group for menu items"
        width={480}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setNewGroupOpen(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!newGroupForm.name.trim() || createGroup.isPending}
            onClick={() => createGroup.mutate({
              name: newGroupForm.name.trim(),
              nameThai: newGroupForm.nameThai.trim() || undefined,
              selectionType: newGroupForm.selectionType,
              isRequired: newGroupForm.isRequired,
            })}
          >{createGroup.isPending ? 'Creating…' : 'Create Group'}</button>
        </>}
      >
        <Field label="Group name *">
          <input className="input" value={newGroupForm.name} onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })} placeholder="e.g. Size, Sweetness, Toppings"/>
        </Field>
        <Field label="Thai name">
          <input className="input" value={newGroupForm.nameThai} onChange={(e) => setNewGroupForm({ ...newGroupForm, nameThai: e.target.value })} placeholder="ชื่อภาษาไทย"/>
        </Field>
        <Field label="Selection type">
          <Select
            value={typeLabel(newGroupForm.selectionType)}
            onChange={(v) => setNewGroupForm({ ...newGroupForm, selectionType: { Single: 'single', Multi: 'multi', Quantity: 'quantity' }[v] || 'single' })}
            options={['Single', 'Multi', 'Quantity']}
          />
        </Field>
        <Field label="Required">
          <Toggle checked={newGroupForm.isRequired} onChange={(v) => setNewGroupForm({ ...newGroupForm, isRequired: v })} label="Customer must select an option"/>
        </Field>
      </Drawer>

      <OptionStockEffectsModal
        isOpen={effectsModalOpen}
        onClose={() => setEffectsModalOpen(false)}
        option={selectedOptionForEffects}
        onSave={handleSaveStockEffects}
      />

      <style>{`@media (max-width: 900px) { .opt-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

// ----- Discounts -----
export const PageAdminDiscounts = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const [addOpen, setAddOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({ code: '', name: '', discountType: 'percentage', value: '10' });

  const { data: camps = [], isLoading, refetch } = trpc.discounts.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const create = trpc.discounts.create.useMutation({
    onSuccess: () => { refetch(); setAddOpen(false); setNewDiscount({ code: '', name: '', discountType: 'percentage', value: '10' }); },
    onError: (e) => alert(e.message),
  });
  const toggle = trpc.discounts.toggleActive.useMutation({ onSuccess: () => refetch() });
  const deleteDiscount = trpc.discounts.delete.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const handleDeleteDiscount = (d) => { if (window.confirm(`ลบส่วนลด "${d.name}"? ข้อมูลจะหายถาวร`)) deleteDiscount.mutate({ id: d.id }); };

  const grad = (type) => type === 'percentage'
    ? 'linear-gradient(135deg, var(--matcha-300), var(--matcha-500))'
    : 'linear-gradient(135deg, #fef3c7, var(--gold))';

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.discounts')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'แคมเปญส่วนลด' : 'Discount Campaigns'}</h1>
            <p className="page-desc">{camps.length} {lang === 'th' ? 'แคมเปญ' : 'campaigns'}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><IconPlus size={16}/> Create Campaign</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading…</div>
      ) : camps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <p>No discount campaigns yet. Create your first to offer promo codes.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {camps.map((c, i) => {
            const unit = c.discountType === 'percentage' ? '%' : '฿';
            const val = c.discountType === 'percentage' ? `${c.value}%` : `฿${c.value}`;
            return (
              <div key={c.id} className="card" style={{ overflow: 'hidden', animation: `slideUp 360ms var(--ease-out-expo) ${i * 60}ms both` }}>
                <div style={{ height: 100, background: grad(c.discountType), position: 'relative', padding: 16, color: 'white' }}>
                  <span className="pill" style={{ background: 'rgba(255,255,255,0.3)', color: 'white', backdropFilter: 'blur(6px)' }}>
                    <span className="dot"/> {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.025em' }} className="tabular">{val}</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>off</span>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>{c.code}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Toggle checked={c.isActive ?? false} onChange={() => toggle.mutate({ id: c.id })}/>
                      <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24, color: 'var(--red-600)' }} onClick={() => handleDeleteDiscount(c)} title="Delete"><IconX size={12}/></button>
                    </div>
                  </div>
                  {c.maxUses && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12, marginBottom: 4 }}>
                        <span>{c.usedCount ?? 0} used</span>
                        <span>of {c.maxUses} cap</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, ((c.usedCount ?? 0) / c.maxUses) * 100)}%`, height: '100%', background: 'var(--matcha-500)', borderRadius: 2 }}/>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="New Discount"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={create.isPending || !newDiscount.code || !newDiscount.name}
            onClick={() => create.mutate({
              code: newDiscount.code.toUpperCase(),
              name: newDiscount.name,
              discountType: newDiscount.discountType,
              value: newDiscount.value,
            })}
          >{create.isPending ? 'Creating…' : 'Create'}</button>
        </>}>
        <Field label="Code (used by customer)" required>
          <input className="input mono" value={newDiscount.code} onChange={(e) => setNewDiscount(s => ({ ...s, code: e.target.value }))} placeholder="WELCOME10"/>
        </Field>
        <Field label="Display name" required>
          <input className="input" value={newDiscount.name} onChange={(e) => setNewDiscount(s => ({ ...s, name: e.target.value }))} placeholder="New Year promotion"/>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Type">
            <Select value={newDiscount.discountType} onChange={(v) => setNewDiscount(s => ({ ...s, discountType: v }))} options={['percentage', 'fixed']}/>
          </Field>
          <Field label="Value">
            <input className="input" type="number" value={newDiscount.value} onChange={(e) => setNewDiscount(s => ({ ...s, value: e.target.value }))}/>
          </Field>
        </div>
      </Drawer>
    </div>
  );
};

// ----- Payment methods -----
export const PageAdminPayments = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const { data: methods = [], isLoading, refetch } = trpc.payments.listMethods.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const toggleActive = trpc.payments.toggleMethod.useMutation({ onSuccess: () => refetch() });
  const deleteMethod = trpc.payments.deleteMethod.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const handleDeleteMethod = (m) => { if (window.confirm(`ลบวิธีชำระเงิน "${m.name}"?`)) deleteMethod.mutate({ id: m.id }); };

  const enabled = methods.filter((m) => m.isActive).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('settings.payment')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'วิธีชำระเงิน' : 'Payment Methods'}</h1>
            <p className="page-desc">{lang === 'th' ? `ตั้งค่าการชำระเงิน · ${enabled} วิธีเปิดใช้งาน` : `Configure how customers pay · ${enabled} methods enabled`}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading payment methods…</div>
      ) : methods.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <IconPayment size={36} style={{ opacity: 0.3 }}/>
          <p style={{ marginTop: 12 }}>No payment methods configured. Run <code>npm run seed</code> to add defaults.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {methods.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-muted)', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}><IconPayment size={20}/></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{m.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {m.type} · {Number(m.feePercentage ?? 0)}% fee
                  {Number(m.feeFixed ?? 0) > 0 ? ` + ฿${m.feeFixed}` : ''}
                  {m.requiresReference ? ' · requires reference' : ''}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.code}</span>
              <Toggle checked={m.isActive ?? false} onChange={() => toggleActive.mutate({ id: m.id })}/>
              <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--red-600)' }} onClick={() => handleDeleteMethod(m)} title="Delete"><IconX size={12}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ----- Staff -----
export const PageAdminStaff = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const [view, setView] = useState('grid');
  const [modal, setModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [staffDetailId, setStaffDetailId] = useState(null);
  const [newStaff, setNewStaff] = useState({ firstName: '', lastName: '', email: '', role: 'staff', pin: '', password: '', branchIds: [] });

  const { data: staffList = [], isLoading: staffLoading, refetch: refetchStaff } = trpc.staff.list.useQuery({ branchId: branchId || undefined }, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: branchOptions = [] } = trpc.branches.listPublic.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });
  const createStaff = trpc.staff.create.useMutation({
    onSuccess: () => { refetchStaff(); setModal(false); setNewStaff({ firstName: '', lastName: '', email: '', role: 'staff', pin: '', password: '', branchIds: [] }); },
    onError: (err) => alert(err.message),
  });
  const assignBranchesMut = trpc.staff.assignToBranches.useMutation({ onSuccess: () => refetchStaff() });

  const roleLabel = { super_admin: 'Super Admin', staff_admin: 'Staff Admin', staff: 'Staff' };
  const roleClass = { super_admin: 'pill-matcha', staff_admin: 'pill-gold', staff: '' };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.staff')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'พนักงานและสิทธิ์' : 'Staff & Permissions'}</h1>
            <p className="page-desc">{staffList.length} {lang === 'th' ? 'คน' : 'members'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setBulkModal(true)}><IconImport size={16}/> Bulk Invite</button>
            <button className="btn btn-primary" onClick={() => setModal(true)}><IconPlus size={16}/> Invite Staff</button>
          </div>
        </div>
      </div>

      <TopActionBar
        search="" onSearch={() => {}}
        filters={<>
          <Select value="" onChange={() => {}} options={['All branches', ...branchOptions.map(b => b.name)]} placeholder="All branches"/>
          <Select value="" onChange={() => {}} options={['All roles', 'Super Admin', 'Staff Admin', 'Staff']} placeholder="All roles"/>
        </>}
        viewMode={view} onViewMode={setView}
        onExport={() => {}} onImport={() => {}}
        onAdd={() => setModal(true)} addLabel="Invite"
      />

      {view === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {staffLoading ? (
            [1,2,3,4,5,6].map((i) => <div key={i} className="card" style={{ height: 160, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)
          ) : staffList.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
              <IconUser size={36} style={{ opacity: 0.3 }}/>
              <p style={{ marginTop: 12 }}>No staff members yet. Invite your first team member.</p>
            </div>
          ) : staffList.map((s, i) => {
            const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.employeeCode;
            const isActive = s.status === 'active';
            const lastLogin = s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : '—';
            return (
              <button key={s.id} className="card" onClick={() => setStaffDetailId(s.id)} style={{ padding: 20, animation: `slideUp 360ms var(--ease-out-expo) ${i * 30}ms both`, cursor: 'pointer', textAlign: 'left', width: '100%', border: '1px solid var(--border-default)' }}>
                <div style={{ position: 'relative', width: 'fit-content', marginBottom: 12 }}>
                  <Avatar name={fullName} size={56}/>
                  {isActive && <span style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: 'var(--matcha-500)', border: '2px solid var(--bg-surface)' }}/>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{fullName}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span className={'pill ' + (roleClass[s.role] ?? '')}>{roleLabel[s.role] ?? s.role}</span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{s.employeeCode}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>PIN ••••</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last: {lastLogin}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['Name', 'Code', 'Role', 'Status', 'Last login', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => {
                const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.employeeCode;
                const isActive = s.status === 'active';
                const lastLogin = s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : '—';
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={fullName} size={32}/><span style={{ fontWeight: 500 }}>{fullName}</span></div></td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: 13 }}>{s.employeeCode}</td>
                    <td style={{ padding: '12px 16px' }}><span className={'pill ' + (roleClass[s.role] ?? '')}>{roleLabel[s.role] ?? s.role}</span></td>
                    <td style={{ padding: '12px 16px' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? 'var(--matcha-500)' : 'var(--text-quaternary)' }}/>{isActive ? 'Active' : s.status}</span></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 13 }}>{lastLogin}</td>
                    <td style={{ padding: '12px 16px' }}><button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}><IconMore size={14}/></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'cards' && (
        <div className="card" style={{ padding: 24 }}>
          <div className="t-h4" style={{ fontWeight: 600, marginBottom: 14 }}>Permission Matrix</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>Feature</th>
                {['Super Admin', 'Staff Admin', 'Staff'].map((r) => (
                  <th key={r} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border-default)' }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { f: 'Manage all branches', p: [true, false, false] },
                { f: 'Edit master SOPs', p: [true, false, false] },
                { f: 'Approve POs', p: [true, false, false] },
                { f: 'Receive inventory', p: [true, true, false] },
                { f: 'Edit branch menu', p: [true, true, false] },
                { f: 'Manage staff', p: [true, true, false] },
                { f: 'Use POS', p: [true, true, true] },
                { f: 'View own tasks', p: [true, true, true] },
                { f: 'View financials', p: [true, true, false] },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '10px 12px', borderTop: '1px solid var(--border-default)' }}>{row.f}</td>
                  {row.p.map((v, j) => (
                    <td key={j} style={{ padding: '10px 12px', textAlign: 'center', borderTop: '1px solid var(--border-default)' }}>
                      {v ? <IconCheck size={16} style={{ color: 'var(--matcha-600)' }} stroke={2.5}/> : <IconX size={14} style={{ color: 'var(--text-quaternary)' }}/>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={modal} onClose={() => setModal(false)} title="Add staff member" subtitle="Create account"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={createStaff.isPending}
            onClick={async () => {
              try {
                const result = await createStaff.mutateAsync({
                  firstName: newStaff.firstName,
                  lastName: newStaff.lastName,
                  email: newStaff.email || undefined,
                  role: newStaff.role,
                  pin: newStaff.pin || undefined,
                  password: newStaff.password || undefined,
                });
                // Assign branches after creation
                if (result?.id && newStaff.branchIds.length > 0) {
                  try { await assignBranchesMut.mutateAsync({ staffId: result.id, branchIds: newStaff.branchIds }); } catch(e) {}
                }
                // Show created credentials
                const pin = result?.generatedPin || newStaff.pin;
                const code = result?.employeeCode;
                alert(`Staff created!\n\nEmployee Code: ${code}${pin ? '\nPIN: ' + pin : ''}\n\nPlease share these credentials securely.`);
              } catch(e) {
                alert('Failed: ' + (e.message || 'Unknown error'));
              }
            }}
          >{createStaff.isPending ? 'Creating…' : 'Create Account'}</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="First name" required><input className="input" placeholder="Yuki" value={newStaff.firstName} onChange={(e) => setNewStaff(s => ({ ...s, firstName: e.target.value }))}/></Field>
          <Field label="Last name" required><input className="input" placeholder="Tanaka" value={newStaff.lastName} onChange={(e) => setNewStaff(s => ({ ...s, lastName: e.target.value }))}/></Field>
          <Field label="Email"><input className="input" placeholder="yuki@hibimatcha.co" value={newStaff.email} onChange={(e) => setNewStaff(s => ({ ...s, email: e.target.value }))}/></Field>
        </div>
        <div className="t-caption" style={{ marginTop: 8, marginBottom: 8 }}>Account</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Role" required>
            <Select value={newStaff.role} onChange={(v) => setNewStaff(s => ({ ...s, role: v }))} options={['super_admin', 'staff_admin', 'staff']}/>
          </Field>
          <Field label="PIN (4-digit)"><input className="input" placeholder="1234" maxLength={4} value={newStaff.pin} onChange={(e) => setNewStaff(s => ({ ...s, pin: e.target.value }))}/></Field>
          <Field label="Password (for backoffice)"><input className="input" type="password" placeholder="Min 6 chars" value={newStaff.password} onChange={(e) => setNewStaff(s => ({ ...s, password: e.target.value }))}/></Field>
        </div>
        <div className="t-caption" style={{ marginTop: 12, marginBottom: 8 }}>Assign to Branches</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {branchOptions.map((b) => {
            const checked = newStaff.branchIds.includes(b.id);
            return (
              <button key={b.id} type="button" className={"pill " + (checked ? 'pill-matcha' : '')} style={{ cursor: 'pointer' }}
                onClick={() => setNewStaff(s => ({ ...s, branchIds: checked ? s.branchIds.filter(x => x !== b.id) : [...s.branchIds, b.id] }))}>
                {checked && '✓ '}{b.name}
              </button>
            );
          })}
        </div>
      </Drawer>

      {/* Bulk Invite Modal */}
      <BulkInviteModal open={bulkModal} onClose={() => setBulkModal(false)} onSuccess={() => refetchStaff()} />

      {/* Staff Detail Drawer */}
      <StaffDetailDrawer
        open={!!staffDetailId}
        onClose={() => setStaffDetailId(null)}
        staffId={staffDetailId}
        onUpdated={() => refetchStaff()}
      />
    </div>
  );
};

// ----- Reports -----
export const PageAdminReports = () => {
  const { branch, t, lang } = useApp();
  const branchId = branch?.id;
  const session = getSession();
  const [period, setPeriod] = useState('Last 30 days');

  // Compute date range based on period
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const days = period === 'Today' ? 0
      : period === 'Last 7 days' ? 7
      : period === 'Last 30 days' ? 30
      : period === 'This quarter' ? 90
      : period === 'YTD' ? Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (1000*60*60*24))
      : 30;
    const fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - days);
    return { dateFrom: fromDate.toISOString().slice(0, 10), dateTo: to };
  }, [period]);

  const { data: revenueData = [] } = trpc.reports.getRevenueReport.useQuery(
    { dateFrom, dateTo, groupBy: 'day', branchId: branchId || undefined },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: topItems = [] } = trpc.reports.getTopItemsReport.useQuery(
    { dateFrom, dateTo, limit: 6, branchId: branchId || undefined },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: stats } = trpc.reports.getDashboardStats.useQuery({ branchId: branchId || undefined }, { staleTime: 5000, refetchOnWindowFocus: true });

  const maxSales = topItems.reduce((m, r) => Math.max(m, Number(r.qty ?? 0)), 0) || 1;
  const maxRevenue = revenueData.reduce((m, r) => Math.max(m, Number(r.revenue ?? 0)), 0) || 1;

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">{t('admin.title')} / {t('admin.reports')}</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{lang === 'th' ? 'รายงานและวิเคราะห์' : 'Reports & Analytics'}</h1>
            <p className="page-desc">{dateFrom} → {dateTo} · {lang === 'th' ? 'ข้อมูลสด' : 'live data'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select value={period} onChange={setPeriod} options={['Today', 'Last 7 days', 'Last 30 days', 'This quarter', 'YTD']}/>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const rows = revenueData.map((r) => ({ date: r.date, revenue: r.revenue, orders: r.orders }));
              downloadCSV(`sales-${dateFrom}-to-${dateTo}`, rows);
            }} title="Export revenue data as CSV"><IconExport size={14}/> CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const rows = revenueData.map((r) => ({ Date: r.date, Revenue: r.revenue, Orders: r.orders }));
              downloadXLSX(`sales-${dateFrom}-to-${dateTo}`, rows, undefined, 'Revenue');
            }} title="Export as Excel"><IconExport size={14}/> XLSX</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const total = revenueData.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
              const totalOrders = revenueData.reduce((s, r) => s + Number(r.orders ?? 0), 0);
              const html = `
                <h1>Sales Report</h1>
                <div class="meta">Period: ${dateFrom} → ${dateTo}</div>
                <div class="stat-row">
                  <div class="stat"><div class="stat-label">Total revenue</div><div class="stat-value">฿${total.toLocaleString()}</div></div>
                  <div class="stat"><div class="stat-label">Total orders</div><div class="stat-value">${totalOrders.toLocaleString()}</div></div>
                  <div class="stat"><div class="stat-label">Avg order</div><div class="stat-value">฿${totalOrders > 0 ? Math.round(total / totalOrders).toLocaleString() : 0}</div></div>
                </div>
                <h2>Daily revenue</h2>
                ${tableHTMLFromRows(revenueData.map((r) => ({ Date: r.date, Revenue: `฿${Number(r.revenue ?? 0).toLocaleString()}`, Orders: r.orders })))}
                <h2>Top selling items</h2>
                ${tableHTMLFromRows(topItems.map((t) => ({ Item: t.name, Qty: t.qty, Revenue: `฿${Number(t.revenue ?? 0).toLocaleString()}` })))}
              `;
              downloadPDF(`Sales Report ${dateFrom} → ${dateTo}`, html);
            }} title="Print to PDF"><IconExport size={14}/> PDF</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const el = document.getElementById('reports-snapshot');
              if (el) downloadPNG(`sales-${dateFrom}-to-${dateTo}`, el);
            }} title="Capture as PNG"><IconExport size={14}/> PNG</button>
          </div>
        </div>
      </div>

      <div id="reports-snapshot">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }} className="dash-stats">
        <StatCard label="Revenue today" value={`฿${(stats?.todayRevenue ?? 0).toLocaleString()}`} sub="all branches"/>
        <StatCard label="Orders today" value={String(stats?.todayOrders ?? 0)} sub={`${stats?.pendingOrders ?? 0} pending`}/>
        <StatCard label="Avg order" value={`฿${Math.round(stats?.averageOrderValue ?? 0).toLocaleString()}`} sub="per order"/>
        <StatCard label="Low stock" value={String(stats?.lowStockCount ?? 0)} sub="items"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, gridAutoRows: 'minmax(80px, auto)' }}>
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 24, height: '100%' }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Revenue trend</div>
            {revenueData.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 13 }}>No revenue data in this period.</div>
            ) : (
              <RevenueLineChart data={revenueData} maxValue={maxRevenue}/>
            )}
          </div>
        </div>
        <div style={{ gridColumn: 'span 4' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 24, height: '100%' }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Period summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              <Stat label="Total revenue" value={`฿${revenueData.reduce((s, r) => s + Number(r.revenue ?? 0), 0).toLocaleString()}`} color="var(--matcha-700)"/>
              <Stat label="Total orders" value={String(revenueData.reduce((s, r) => s + Number(r.orders ?? 0), 0))}/>
              <Stat label="Avg daily revenue" value={revenueData.length > 0 ? `฿${Math.round(revenueData.reduce((s, r) => s + Number(r.revenue ?? 0), 0) / revenueData.length).toLocaleString()}` : '฿0'}/>
              <Stat label="Peak day" value={revenueData.length > 0 ? revenueData.reduce((mx, r) => Number(r.revenue ?? 0) > Number(mx.revenue ?? 0) ? r : mx, revenueData[0])?.date ?? '—' : '—'}/>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: 'span 12' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 24 }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 14 }}>Top selling items</div>
            {topItems.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '40px 0', fontSize: 13 }}>No sales recorded yet in this period.</div>
            ) : (
              topItems.map((r) => (
                <div key={r.menuItemId} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 110px 120px', gap: 12, alignItems: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: (Number(r.qty ?? 0) / maxSales * 100) + '%', height: '100%', background: 'var(--matcha-500)', borderRadius: 3 }}/>
                  </div>
                  <div className="tabular" style={{ fontSize: 13, textAlign: 'right', color: 'var(--text-secondary)' }}>{Number(r.qty ?? 0).toLocaleString()} sold</div>
                  <div className="tabular" style={{ fontSize: 13, textAlign: 'right', fontWeight: 500 }}>฿{Number(r.revenue ?? 0).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      </div>{/* /reports-snapshot */}

      <style>{`
        @media (max-width: 1100px) { .dash-span-12-mobile { grid-column: span 12 !important; } .dash-stats { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
};

// Simple line chart for revenue trend
const RevenueLineChart = ({ data, maxValue }) => {
  if (!data || data.length === 0) return null;
  const w = 800, h = 240, pad = 32;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const pts = data.map((d, i) => [pad + i * step, pad + innerH - (Number(d.revenue ?? 0) / maxValue) * innerH]);
  const pathD = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1][0]} ${pad + innerH} L ${pts[0][0]} ${pad + innerH} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h }}>
      <defs>
        <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--matcha-500)" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="var(--matcha-500)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1={pad} y1={pad + innerH * g} x2={w - pad} y2={pad + innerH * g} stroke="var(--border-default)" strokeDasharray="2 4"/>
      ))}
      <path d={areaD} fill="url(#rev-grad)"/>
      <path d={pathD} stroke="var(--matcha-600)" strokeWidth="2" fill="none"/>
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--matcha-600)"/>)}
    </svg>
  );
};

const DonutChart = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.v, 0);
  let cum = 0;
  const r = 70, R = 90, cx = 100, cy = 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 200 200" style={{ width: 180, height: 180 }}>
        {segments.map((s, i) => {
          const a0 = (cum / total) * Math.PI * 2 - Math.PI / 2;
          cum += s.v;
          const a1 = (cum / total) * Math.PI * 2 - Math.PI / 2;
          const large = (a1 - a0) > Math.PI ? 1 : 0;
          const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
          const [x0, y0] = p(a0, R);
          const [x1, y1] = p(a1, R);
          const [x2, y2] = p(a1, r);
          const [x3, y3] = p(a0, r);
          return <path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`} fill={s.c}/>;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--text-primary)">100%</text>
      </svg>
      <div style={{ flex: 1, fontSize: 13 }}>
        {segments.map((s) => (
          <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }}/>
            <span style={{ flex: 1 }}>{s.l}</span>
            <span className="tabular" style={{ color: 'var(--text-secondary)' }}>{s.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Heatmap = () => {
  const hours = ['8', '10', '12', '14', '16', '18', '20'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)', gap: 4 }}>
      <div/>
      {hours.map((h) => <div key={h} style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>{h}</div>)}
      {days.map((d, di) => (
        <React.Fragment key={d}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'grid', placeItems: 'center' }}>{d}</div>
          {hours.map((h, hi) => {
            const v = ((Math.sin(di * 1.5) + Math.cos(hi * 0.9)) + 2) / 4;
            return <div key={h+d} style={{
              height: 28,
              background: `oklch(${85 - v * 30}% 0.${Math.floor(v * 14)} 150)`,
              borderRadius: 4,
              transition: 'transform 200ms',
            }}/>;
          })}
        </React.Fragment>
      ))}
    </div>
  );
};



// ─── Linked Menus Section (inside Option Group detail) ────────────────────────
const LinkedMenusSection = ({ optionGroupId }) => {
  const [showModal, setShowModal] = useState(false);
  const { data: linkedMenus = [], refetch } = trpc.options.listLinkedMenus.useQuery(
    { optionGroupId },
    { enabled: !!optionGroupId }
  );

  return (
    <div style={{ marginTop: 28, borderTop: '1px solid var(--border-default)', paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>เมนูที่ผูกไว้</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            เลือกอยู่ {linkedMenus.length} เมนู
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(true)}>
          <IconEdit size={14}/> แก้ไขเมนูที่ผูกไว้
        </button>
      </div>

      {linkedMenus.length > 0 ? (
        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-default)', borderRadius: 'var(--r-default)', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ width: 160, padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>หมวดหมู่</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ชื่อเมนู</th>
              </tr>
            </thead>
            <tbody>
              {linkedMenus.map((m) => (
                <tr key={m.menuItemId} style={{ borderBottom: '1px solid var(--border-default)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{m.categoryName || '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{m.menuItemSku ? `${m.menuItemSku} - ` : ''}{m.menuItemName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13, padding: '16px 0', textAlign: 'center' }}>
          ยังไม่มีเมนูที่ผูกกับ option นี้ — คลิก "แก้ไขเมนูที่ผูกไว้" เพื่อเริ่มผูกเมนู
        </div>
      )}

      {showModal && (
        <LinkedMenusModal
          optionGroupId={optionGroupId}
          currentLinkedIds={linkedMenus.map((m) => m.menuItemId)}
          onClose={() => setShowModal(false)}
          onSave={() => { refetch(); setShowModal(false); }}
        />
      )}
    </div>
  );
};

// ─── Linked Menus Modal ───────────────────────────────────────────────────────
const LinkedMenusModal = ({ optionGroupId, currentLinkedIds, onClose, onSave }) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set(currentLinkedIds));

  const { data: menus = [] } = trpc.menu.list.useQuery({});
  const { data: categories = [] } = trpc.categories.list.useQuery({});

  const setLinkedMutation = trpc.options.setLinkedMenus.useMutation({
    onSuccess: () => onSave(),
  });

  // Filter by search
  const filteredMenus = menus.filter((m) =>
    !search ||
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.nameThai || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const menusByCategory = useMemo(() => {
    const grouped = {};
    filteredMenus.forEach((menu) => {
      const catId = menu.categoryId || 0;
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(menu);
    });
    return grouped;
  }, [filteredMenus]);

  const toggleAll = () => {
    if (filteredMenus.every((m) => selectedIds.has(m.id))) {
      const next = new Set(selectedIds);
      filteredMenus.forEach((m) => next.delete(m.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredMenus.forEach((m) => next.add(m.id));
      setSelectedIds(next);
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = () => {
    setLinkedMutation.mutate({
      optionGroupId,
      menuItemIds: Array.from(selectedIds),
    });
  };

  const allSelected = filteredMenus.length > 0 && filteredMenus.every((m) => selectedIds.has(m.id));

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="card" style={{ width: '90vw', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600, fontSize: 17 }}>แก้ไขเมนูที่ผูกไว้</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><IconX size={18}/></button>
          </div>
          <input
            className="input"
            placeholder="🔍 ค้นหาเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginTop: 12 }}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={toggleAll} style={{ color: 'var(--matcha-600)' }}>
              {allSelected ? 'ยกเลิกที่เลือกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {Object.entries(menusByCategory).map(([catId, items]) => {
            const category = categories.find((c) => c.id === Number(catId));
            return (
              <div key={catId} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {category?.name || 'Uncategorized'}
                  {category?.nameThai ? ` · ${category.nameThai}` : ''}
                </div>
                {items.map((menu) => (
                  <label key={menu.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 'var(--r-subtle)', cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <Checkbox
                      checked={selectedIds.has(menu.id)}
                      onChange={() => toggleOne(menu.id)}
                    />
                    <span style={{ fontSize: 14 }}>
                      {menu.sku ? <span className="muted" style={{ marginRight: 6 }}>{menu.sku}</span> : null}
                      {menu.name}
                      {menu.nameThai ? <span className="muted" style={{ marginLeft: 6 }}>({menu.nameThai})</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
          {filteredMenus.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: 32 }}>ไม่พบเมนูที่ตรงกับคำค้นหา</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>
            {selectedIds.size} จาก {menus.length} เมนูที่เลือก
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={setLinkedMutation.isPending}>
              {setLinkedMutation.isPending ? 'กำลังบันทึก…' : 'ยืนยันและบันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
