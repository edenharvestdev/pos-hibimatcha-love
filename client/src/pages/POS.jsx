// ============================================
// Page: pos
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { EmptyCart,IconBookmark,IconBowl,IconBox,IconBrand,IconCake,IconCards,IconCheck,IconChevLeft,IconChevRight,IconClock,IconCoin,IconCupHot,IconCupIced,IconDiscount,IconEdit,IconExport,IconEye,IconGrid,IconHeart,IconImport,IconLeaf,IconList,IconMore,IconPlus,IconPrint,IconQR,IconReceipt,IconRefresh,IconSettings,IconShare,IconTrash,IconWallet,IconWhisk } from "@/icons";
import { useApp,Drawer,Field,Select,Toggle,Checkbox,SearchInput,TopActionBar,BulkActionBar,Placeholder,CountUp } from "@/components";
import { Numpad } from "@/components/Numpad";
import { Logo } from "@/components/Shell";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/lib/authStore";
// USB hardware imports removed — all printing now via network tRPC
// import { printReceipt, openCashDrawer } from "@/lib/hardware";
import { downloadCSV, downloadXLSX, downloadPDF, tableHTMLFromRows } from "@/lib/export";
import { displayName } from "@/lib/i18n";
import { getAutomation } from "@/lib/automationSettings";


// Icon map for category icons
const CATEGORY_ICON_MAP = { IconWhisk, IconCupHot, IconCupIced, IconLeaf, IconCake, IconBowl, IconBox, IconGrid };

export const PagePOS = () => {
  const { navigate, branch, t, lang } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [cart, setCart] = useState([]);
  const [optionFor, setOptionFor] = useState(null);
  const [orderType, setOrderType] = useState('Dine-in');

  // Load real data from API
  const { data: categories, isLoading: catsLoading } = trpc.categories.list.useQuery(
    { branchId },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: menuItems, isLoading: itemsLoading } = branchId
    ? trpc.menu.listAvailable.useQuery({ branchId }, { staleTime: 5000, refetchOnWindowFocus: true })
    : trpc.menu.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const { data: heldOrders } = trpc.orders.listHeld.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, staleTime: 15000, refetchOnWindowFocus: true }
  );
  // Low-stock alerts
  const { data: lowStockItems = [] } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0, lowStockOnly: true },
    { enabled: !!branchId, staleTime: 30000, refetchOnWindowFocus: true }
  );
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);

  const allCategories = [
    { id: 'all', name: 'All', iconName: 'IconGrid' },
    ...(categories ?? []),
  ];

  const allItems = menuItems ?? [];
  const filtered = allItems.filter((it) => {
    const matchCat = activeCat === 'all' || it.categoryId === activeCat;
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase()) || (it.nameThai ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = Math.round(sub * 0.07);
  const total = sub + vat;

  const addToCart = (item) => {
    setOptionFor(item);
  };

  // Activate barcode/SKU scanner only when toggle is on
  useEffect(() => {
    if (!getAutomation().barcodeScannerListener) return;
    let stopScanner = () => {};
    let stopHandler = () => {};
    import("@/lib/hardware").then(({ startBarcodeScanner, onBarcodeScan }) => {
      stopScanner = startBarcodeScanner();
      stopHandler = onBarcodeScan((code) => {
        const match = (menuItems ?? []).find(
          (it) =>
            it.sku === code ||
            it.barcode === code ||
            it.name?.toLowerCase() === code.toLowerCase()
        );
        if (match) addToCart(match);
        else setSearch(code);
      });
    }).catch(() => {});
    return () => { stopScanner(); stopHandler(); };
  }, [menuItems]);

  // Manual scan trigger (camera) — always available
  const handleManualScan = async () => {
    try {
      const { captureImageFromCamera, detectBarcodesInImage } = await import("@/lib/ocr");
      const img = await captureImageFromCamera();
      if (!img) return;
      const codes = await detectBarcodesInImage(img);
      if (codes.length === 0) { alert("No barcode detected"); return; }
      const code = codes[0];
      const match = (menuItems ?? []).find(
        (it) => it.sku === code || it.barcode === code
      );
      if (match) addToCart(match);
      else setSearch(code);
    } catch (err) {
      alert("Scan failed: " + (err.message || "Unknown"));
    }
  };

  const confirmAddItem = (item, opts = []) => {
    const optPrice = opts.reduce((s, o) => s + Number(o.priceAdjustment ?? 0), 0);
    setCart((c) => [...c, { id: item.id, name: item.name, price: Number(item.displayPrice ?? item.basePrice) + optPrice, qty: 1, opts: opts.map((o) => o.optionName ?? o.name), rawOpts: opts }]);
    setOptionFor(null);
  };

  const updateQty = (idx, d) => {
    setCart((c) => c.map((it, i) => i === idx ? { ...it, qty: Math.max(0, it.qty + d) } : it).filter((it) => it.qty > 0));
  };

  const isLoading = catsLoading || itemsLoading;

  return (
    <div style={{
      height: 'calc(100vh - 56px)',
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px',
      overflow: 'hidden', position: 'relative',
    }} className="pos-grid">
      {/* Menu side */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-default)' }}>
        {/* Top toolbar */}
        <div style={{ padding: '16px 24px 8px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-default)' }}>
          <SearchInput value={search} onChange={setSearch} placeholder={t('pos.searchMenu')} shortcut="⌘F" style={{ flex: 1, maxWidth: 360 }}/>
          <div className="hide-on-sunmi" style={{ display: 'inline-flex', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', padding: 3, gap: 2 }}>
            {[{ k: 'grid', I: IconGrid }, { k: 'list', I: IconList }, { k: 'cards', I: IconCards }].map(({ k, I }) => (
              <button key={k} onClick={() => setView(k)} style={{
                width: 34, height: 28, borderRadius: 6,
                background: view === k ? 'var(--bg-surface)' : 'transparent',
                color: view === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: view === k ? 'var(--shadow-xs)' : 'none',
                display: 'grid', placeItems: 'center',
              }}><I size={16}/></button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleManualScan} title={t('pos.scan')}><IconQR size={16}/> {t('pos.scan')}</button>
          <button className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/kitchen')} title={t('pos.kitchen')}><IconClock size={16}/> {t('pos.kitchen')}</button>
          <button className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/orders')} title={t('pos.orders')}><IconReceipt size={16}/> {t('pos.orders')}</button>
          <button className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/delivery')} title={t('pos.delivery')}><IconBox size={16}/> {t('pos.delivery')}</button>
          <button className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/sop')} title={t('pos.sop')}><IconBookmark size={16}/> {t('pos.sop')}</button>
          {(session?.role === 'super_admin' || session?.role === 'staff_admin') && (
            <button className="btn btn-secondary btn-sm hide-on-sunmi" onClick={() => navigate('/backoffice/menu')} title={t('nav.menu')}><IconPlus size={16}/> {t('nav.menu')}</button>
          )}
          <button className="btn btn-ghost btn-icon hide-on-sunmi" onClick={() => navigate('/settings')} title="Settings"><IconSettings size={18}/></button>
        </div>

        {/* Low-stock alert banner */}
        {lowStockItems.length > 0 && showLowStockAlert && (
          <div style={{
            padding: '10px 24px', background: 'linear-gradient(90deg, #fff3cd, #ffeaa7)',
            borderBottom: '1px solid #f0c36d', display: 'flex', alignItems: 'center', gap: 12,
            fontSize: 13, color: '#856404',
          }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>⚠️ {t('stock.lowAlert')} ({lowStockItems.length}):</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {lowStockItems.slice(0, 5).map((s) => `${s.item?.nameThai || s.item?.name} (${t('stock.remaining')} ${s.availableStock} ${s.item?.unitOfMeasure || ''})`).join(', ')}
              {lowStockItems.length > 5 && ` +${lowStockItems.length - 5} ${t('stock.others')}`}
            </span>
            <button onClick={() => setShowLowStockAlert(false)} style={{ background: 'none', border: 'none', color: '#856404', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Category tabs */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-default)', overflow: 'auto', whiteSpace: 'nowrap' }}>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            {allCategories.map((c) => {
              const iconName = c.iconName || 'IconGrid';
              const I = CATEGORY_ICON_MAP[iconName] || IconGrid;
              const active = activeCat === c.id || (activeCat === 'all' && c.id === 'all');
              return (
                <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 999,
                  fontSize: 13, fontWeight: 500,
                  background: active ? 'var(--matcha-600)' : 'var(--bg-surface)',
                  color: active ? 'white' : 'var(--text-secondary)',
                  border: '1px solid ' + (active ? 'var(--matcha-600)' : 'var(--border-default)'),
                  transition: 'all 200ms var(--ease-out-expo)',
                }}>
                  <I size={15}/> {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {isLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="card" style={{ height: 180, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
              ))}
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
              <IconGrid size={40} style={{ opacity: 0.3 }}/>
              <p style={{ marginTop: 12 }}>{t('pos.noItems')}</p>
              <p style={{ fontSize: 13 }}>{t('pos.addInBackoffice')}</p>
            </div>
          )}
          {!isLoading && view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {filtered.map((it, i) => <POSItemCard key={it.id} item={it} idx={i} onAdd={addToCart} lang={lang}/>)}
            </div>
          )}
          {!isLoading && view === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((it) => <POSItemRow key={it.id} item={it} onAdd={addToCart} lang={lang}/>)}
            </div>
          )}
          {!isLoading && view === 'cards' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {filtered.map((it, i) => <POSItemCard key={it.id} item={it} idx={i} onAdd={addToCart} large lang={lang}/>)}
            </div>
          )}
        </div>
      </div>

      {/* Cart */}
      <CartPanel
        cart={cart} orderType={orderType} setOrderType={setOrderType}
        updateQty={updateQty} sub={sub} vat={vat} total={total}
        branchId={branchId} onOrderCreated={(orderId) => {
          setCart([]);
          navigate(`/pos/payment?orderId=${orderId}`);
        }}
      />

      {/* Option picker */}
      <OptionSheet item={optionFor} onClose={() => setOptionFor(null)} onAdd={confirmAddItem}/>

      {/* Connection status */}
      <div style={{ position: 'absolute', bottom: 16, left: 24, display: 'flex', gap: 8 }}>
        <span className="glass pill" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)', boxShadow: '0 0 6px var(--matcha-500)' }}/>
          {t('pos.online')}
        </span>
        <span className="glass pill" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
          <IconClock size={12}/> {heldOrders?.length ?? 0} {t('pos.held')}
        </span>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pos-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .pos-grid { grid-template-columns: 1fr !important; height: 100vh !important; }
          .pos-grid > div:first-child { min-height: 0; }
          .pos-grid aside { position: fixed; bottom: 0; left: 0; right: 0; height: auto; max-height: 45vh; z-index: 50; border-top: 2px solid var(--matcha-200); border-radius: var(--r-xl) var(--r-xl) 0 0; box-shadow: 0 -8px 32px rgba(0,0,0,0.12); }
        }
      `}</style>
    </div>
  );
};

const POSItemCard = ({ item, idx, onAdd, large, lang }) => {
  const isOutOfStock = item.stockLevel === 0;
  const displayPrice = item.displayPrice ?? item.basePrice;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return (
    <button
      onClick={() => onAdd(item)}
      disabled={isOutOfStock}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        textAlign: 'left',
        opacity: isOutOfStock ? 0.5 : 1,
        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'transform 240ms var(--ease-out-expo), box-shadow 240ms, border-color 240ms',
      }}
      onMouseEnter={(e) => { if (!isOutOfStock) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--matcha-200)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
    >
      <div style={{ position: 'relative', aspectRatio: large ? '4/3' : '1/1' }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))', display: 'grid', placeItems: 'center', color: 'var(--matcha-700)' }}>
            <IconWhisk size={48}/>
          </div>
        )}
        {tags[0] && (
          <span className={'pill ' + (tags[0] === 'new' ? 'pill-gold' : 'pill-matcha')} style={{ position: 'absolute', top: 8, left: 8, height: 20, fontSize: 10 }}>
            {tags[0]}
          </span>
        )}
        {isOutOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center' }}>
            <span className="pill pill-danger">Out of stock</span>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{displayName(item, lang)}</div>
        {lang !== 'th' && item.nameThai && <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{item.nameThai}</div>}
        {lang === 'th' && item.name !== item.nameThai && <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{item.name}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <span className="tabular" style={{ fontSize: 15, fontWeight: 600 }}>฿{Number(displayPrice).toFixed(0)}</span>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white', display: 'grid', placeItems: 'center' }}>
            <IconPlus size={14} stroke={2.5}/>
          </span>
        </div>
      </div>
    </button>
  );
};

const POSItemRow = ({ item, onAdd, lang }) => {
  const isOutOfStock = item.stockLevel === 0;
  const displayPrice = item.displayPrice ?? item.basePrice;
  return (
    <button onClick={() => onAdd(item)} disabled={isOutOfStock} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: 12, background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--r-md)',
      opacity: isOutOfStock ? 0.5 : 1,
      textAlign: 'left',
      transition: 'background 200ms',
    }}
      onMouseEnter={(e) => { if (!isOutOfStock) e.currentTarget.style.background = 'var(--bg-muted)'; }}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
    >
      <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--matcha-50)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none' }}><IconWhisk size={24}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{displayName(item, lang)}</div>
        <div className="muted" style={{ fontSize: 12 }}>{lang === 'th' ? (item.name || '') : (item.nameThai || item.description || '')}</div>
      </div>
      {item.tag && <span className={'pill ' + (item.tag === 'New' ? 'pill-gold' : 'pill-matcha')}>{item.tag}</span>}
      <div className="tabular" style={{ fontSize: 15, fontWeight: 600, minWidth: 64, textAlign: 'right' }}>฿{item.price}</div>
    </button>
  );
};

const CartPanel = ({ cart, orderType, setOrderType, updateQty, sub, vat, total, branchId, onOrderCreated }) => {
  const { navigate, t } = useApp();
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const createOrder = trpc.orders.create.useMutation();
  const confirmOrder = trpc.orders.confirmOrder.useMutation();
  const getPrintPayload = trpc.orders.getPrintPayload.useMutation();
  const networkPrintOnConfirm = trpc.printing.autoPrintOnConfirm.useMutation();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!branchId) { alert(t('inventory.noBranch')); return; }
    try {
      const orderTypeMap = { 'Dine-in': 'dine-in', 'Takeaway': 'takeaway', 'Delivery': 'delivery' };
      const result = await createOrder.mutateAsync({
        branchId,
        orderType: orderTypeMap[orderType] ?? 'dine-in',
        tableNumber: tableNo || undefined,
        customerName: customerName || undefined,
        notes: orderNote || undefined,
        items: cart.map((it) => ({
          menuItemId: it.id,
          quantity: it.qty,
          options: (it.rawOpts ?? []).map((o) => ({
            optionId: o.id ?? o.optionId,
            optionName: o.optionName ?? o.name,
            priceAdjustment: String(o.priceAdjustment ?? '0'),
          })),
        })),
      });
      // Confirm order + auto-print order slip & kitchen ticket
      try {
        await confirmOrder.mutateAsync({ orderId: result.id });
        const auto = getAutomation();
        // Network auto-print (server-side TCP) — fire & forget
        networkPrintOnConfirm.mutate({ orderId: result.id, branchId: session?.currentBranchId || 1 });
        // Browser auto-print order slip (fallback)
        if (auto.autoPrintReceipt) {
          try {
            const slipPayload = await getPrintPayload.mutateAsync({ orderId: result.id, type: 'order_slip' });
            if (slipPayload?.html) {
              const w = window.open('', '_blank', 'width=380,height=600');
              if (w) { w.document.write(slipPayload.html); w.document.close(); }
            }
          } catch (e) { console.warn('Auto-print order slip failed:', e); }
        }
        // Browser auto-print kitchen ticket (fallback)
        try {
          const kitchenPayload = await getPrintPayload.mutateAsync({ orderId: result.id, type: 'kitchen_ticket' });
          if (kitchenPayload?.html) {
            const w = window.open('', '_blank', 'width=380,height=600');
            if (w) { w.document.write(kitchenPayload.html); w.document.close(); }
          }
        } catch (e) { console.warn('Auto-print kitchen ticket failed:', e); }
      } catch (e) { console.warn('Confirm order failed:', e); }
      onOrderCreated?.(result.id);
    } catch (err) {
      alert(err?.message ?? 'Failed to create order');
    }
  };

  const handleClear = () => {
    cart.forEach((_, idx) => updateQty(idx, -999));
  };

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-muted)', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>{t('pos.cart')}</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }} className="tabular">{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-ghost btn-icon"><IconMore size={18}/></button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Dine-in', 'Takeaway', 'Delivery'].map((t) => (
            <button key={t} onClick={() => setOrderType(t)} style={{
              flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 500,
              background: orderType === t ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid ' + (orderType === t ? 'var(--matcha-300)' : 'var(--border-default)'),
              borderRadius: 'var(--r-default)',
              color: orderType === t ? 'var(--matcha-700)' : 'var(--text-secondary)',
              transition: 'all 200ms',
            }}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="input" placeholder="Table no." value={tableNo} onChange={(e) => setTableNo(e.target.value)} style={{ height: 34, fontSize: 13 }}/>
          <input className="input" placeholder="Customer (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ height: 34, fontSize: 13 }}/>
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
        {cart.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <EmptyCart/>
            <div style={{ fontWeight: 500, marginTop: 8 }}>{t('pos.emptyCart')}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('pos.addItems')}</div>
          </div>
        ) : (
          cart.map((it, idx) => (
            <div key={idx} style={{
              padding: 12, marginBottom: 4,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--r-default)',
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--matcha-50)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none' }}><IconWhisk size={18}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                    <div className="tabular" style={{ fontSize: 13, fontWeight: 600 }}>฿{(it.price * it.qty).toLocaleString()}</div>
                  </div>
                  {it.opts?.length > 0 && it.opts.map((o, i) => (
                    <div key={i} className="muted" style={{ fontSize: 11, marginTop: 2 }}>· {o}</div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', background: 'var(--bg-muted)', borderRadius: 999 }}>
                      <button onClick={() => updateQty(idx, -1)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-surface)', display: 'grid', placeItems: 'center' }}>−</button>
                      <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13, fontWeight: 500 }} className="tabular">{it.qty}</span>
                      <button onClick={() => updateQty(idx, 1)} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white', display: 'grid', placeItems: 'center' }}>+</button>
                    </div>
                    <button className="btn btn-ghost btn-xs" style={{ height: 24, color: 'var(--text-tertiary)' }}>Note · ⓘ</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals + checkout */}
      <div style={{ padding: 16, background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}><IconDiscount size={14}/> {t('discounts.title')}</button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { const n = prompt('Order note:'); if (n !== null) setOrderNote(n); }}><IconEdit size={14}/> Note</button>
        </div>
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{t('pos.subtotal')}</span><span className="tabular">฿{sub.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{t('pos.vat')}</span><span className="tabular">฿{vat.toLocaleString()}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 600, paddingTop: 8, borderTop: '1px solid var(--border-default)', marginTop: 4 }}>
            <span>{t('pos.grandTotal')}</span><span className="tabular">฿{total.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || createOrder.isPending}
          className="btn btn-primary btn-xl"
          style={{ width: '100%', marginTop: 14, boxShadow: 'var(--glow-soft), var(--shadow-md)' }}
        >
          {createOrder.isPending ? 'Creating order…' : `Checkout · ฿${total.toLocaleString()}`}
          {!createOrder.isPending && <IconChevRight size={16}/>}
        </button>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>{t('pos.holdOrder')}</button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>{t('save')}</button>
          <button onClick={handleClear} className="btn btn-ghost btn-sm" style={{ flex: 1, color: 'var(--danger)' }}>{t('pos.clearCart')}</button>
        </div>
      </div>
    </aside>
  );
};

const OptionSheet = ({ item, onClose, onAdd }) => {
  // selections: { [groupId]: optionId (single) | Set<optionId> (multi) | { [optionId]: number } (quantity) }
  const [selections, setSelections] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const { data: detail, isLoading } = trpc.menu.getById.useQuery(
    { id: item?.id },
    { enabled: !!item?.id, staleTime: 5000, refetchOnWindowFocus: true }
  );

  useEffect(() => {
    if (item) {
      setQty(1);
      setNote('');
      setSelections({});
    }
  }, [item?.id]);

  // Pre-fill defaults when detail loads
  useEffect(() => {
    if (!detail?.optionGroups) return;
    const init = {};
    for (const ig of detail.optionGroups) {
      const g = ig.group;
      if (!g) continue;
      const opts = ig.options ?? [];
      if (g.selectionType === 'single') {
        const def = opts.find((o) => o.isDefault) ?? opts[0];
        if (def) init[g.id] = def.id;
      } else if (g.selectionType === 'multi') {
        init[g.id] = new Set(opts.filter((o) => o.isDefault).map((o) => o.id));
      } else if (g.selectionType === 'quantity') {
        init[g.id] = {};
      }
    }
    setSelections(init);
  }, [detail?.id]);

  if (!item) return null;

  // Header icon (fallback to whisk)
  const HeaderIcon = item.icon || IconWhisk;

  const groups = detail?.optionGroups ?? [];
  const description = detail?.description || item.description || '';
  const basePrice = Number(detail?.basePrice ?? item.displayPrice ?? item.basePrice ?? item.price ?? 0);

  // Collect selected option objects for price + display
  const selectedOpts = [];
  for (const ig of groups) {
    const g = ig.group;
    if (!g) continue;
    const sel = selections[g.id];
    const opts = ig.options ?? [];
    if (g.selectionType === 'single' && sel != null) {
      const o = opts.find((x) => x.id === sel);
      if (o) selectedOpts.push({ ...o, groupName: g.name, qty: 1, optionName: o.name });
    } else if (g.selectionType === 'multi' && sel instanceof Set) {
      for (const id of sel) {
        const o = opts.find((x) => x.id === id);
        if (o) selectedOpts.push({ ...o, groupName: g.name, qty: 1, optionName: o.name });
      }
    } else if (g.selectionType === 'quantity' && sel && typeof sel === 'object') {
      for (const [oid, n] of Object.entries(sel)) {
        if (n > 0) {
          const o = opts.find((x) => x.id === Number(oid));
          if (o) selectedOpts.push({ ...o, groupName: g.name, qty: n, optionName: `${o.name} x${n}` });
        }
      }
    }
  }

  const optionSum = selectedOpts.reduce((s, o) => s + Number(o.priceAdjustment ?? 0) * (o.qty || 1), 0);
  const lineTotal = (basePrice + optionSum) * qty;

  // Validation: required groups must have a selection
  const missingRequired = groups.some((ig) => {
    const g = ig.group;
    if (!g?.isRequired) return false;
    const sel = selections[g.id];
    if (g.selectionType === 'single') return sel == null;
    if (g.selectionType === 'multi') return !(sel instanceof Set) || sel.size === 0;
    if (g.selectionType === 'quantity') return !sel || Object.values(sel).every((n) => !n || n <= 0);
    return false;
  });

  const setSingle = (gId, oId) => setSelections((s) => ({ ...s, [gId]: oId }));
  const toggleMulti = (gId, oId) => setSelections((s) => {
    const next = new Set(s[gId] instanceof Set ? s[gId] : []);
    next.has(oId) ? next.delete(oId) : next.add(oId);
    return { ...s, [gId]: next };
  });
  const adjustQty = (gId, oId, d) => setSelections((s) => {
    const obj = { ...(s[gId] || {}) };
    obj[oId] = Math.max(0, (obj[oId] || 0) + d);
    return { ...s, [gId]: obj };
  });

  const onSubmit = () => {
    const payload = selectedOpts.map((o) => ({ ...o, optionId: o.id, optionName: o.optionName }));
    if (note.trim()) payload.push({ optionId: null, optionName: `Note: ${note.trim()}`, priceAdjustment: 0 });
    for (let i = 0; i < qty; i++) {
      onAdd({ ...item, ...detail, basePrice, displayPrice: basePrice }, payload);
    }
  };

  return (
    <Drawer open={!!item} onClose={onClose} title={detail?.name || item.name} subtitle={detail?.nameThai || 'Customize your drink'} width={480}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={missingRequired || isLoading}
          style={{ minWidth: 200 }}
        >
          Add to Cart · ฿{lineTotal.toLocaleString()}
        </button>
      </>}
    >
      <div style={{
        aspectRatio: '16/9', borderRadius: 'var(--r-md)', marginBottom: 20,
        background: 'linear-gradient(135deg, var(--matcha-100), var(--matcha-200))',
        display: 'grid', placeItems: 'center',
        color: 'var(--matcha-800)',
        overflow: 'hidden',
      }}>
        {detail?.imageUrl
          ? <img src={detail.imageUrl} alt={detail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <HeaderIcon size={80}/>}
      </div>

      {description && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 20 }}>{description}</div>
      )}

      {detail?.sop && (
        <button
          onClick={() => { window.location.hash = `/sop/${detail.sop.id}`; }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', marginBottom: 20,
            background: 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))',
            border: '1px solid var(--matcha-200)',
            borderRadius: 'var(--r-default)',
            textAlign: 'left', cursor: 'pointer',
          }}
        >
          <IconBookmark size={20} style={{ color: 'var(--matcha-700)', flex: 'none' }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--matcha-800)' }}>How to prepare: {detail.sop.title}</div>
            <div style={{ fontSize: 11, color: 'var(--matcha-700)', marginTop: 2 }}>Tap to read SOP →</div>
          </div>
          <IconChevRight size={16} style={{ color: 'var(--matcha-700)' }}/>
        </button>
      )}

      {detail?.recipe && detail.recipe.length > 0 && (
        <details style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            🥄 Recipe ({detail.recipe.length} ingredient{detail.recipe.length !== 1 ? 's' : ''})
          </summary>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            {detail.recipe.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>{r.itemName || `Item #${r.inventoryItemId}`}</span>
                <span className="tabular">{r.quantity} {r.unitOfMeasure}</span>
              </div>
            ))}
            {detail.recipeNotes && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-default)', fontStyle: 'italic' }}>{detail.recipeNotes}</div>}
          </div>
        </details>
      )}

      {isLoading && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 20, textAlign: 'center', padding: 20 }}>Loading options…</div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 20, padding: '20px', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', textAlign: 'center' }}>
          No options to customize. Just add to cart.
        </div>
      )}

      {groups.map((ig) => {
        const g = ig.group;
        if (!g) return null;
        const opts = (ig.options ?? []).filter((o) => o.isActive);
        const sel = selections[g.id];

        return (
          <div key={g.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>
                {g.name}
                {g.nameThai ? <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>· {g.nameThai}</span> : null}
              </div>
              <span className="muted" style={{ fontSize: 12 }}>{g.isRequired ? 'Required' : 'Optional'}</span>
            </div>

            {g.selectionType === 'single' && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(opts.length || 1, 4)}, 1fr)`, gap: 8 }}>
                {opts.map((o) => {
                  const on = sel === o.id;
                  const p = Number(o.priceAdjustment ?? 0);
                  return (
                    <button key={o.id} onClick={() => setSingle(g.id, o.id)} style={{
                      padding: '12px 8px', borderRadius: 'var(--r-default)',
                      background: on ? 'var(--matcha-50)' : 'var(--bg-surface)',
                      border: '1.5px solid ' + (on ? 'var(--matcha-600)' : 'var(--border-default)'),
                      fontSize: 14, fontWeight: 600,
                      color: on ? 'var(--matcha-700)' : 'var(--text-primary)',
                      transition: 'all 200ms',
                    }}>
                      {o.name}
                      <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {p === 0 ? 'base' : (p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {g.selectionType === 'multi' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {opts.map((o) => {
                  const on = sel instanceof Set && sel.has(o.id);
                  const p = Number(o.priceAdjustment ?? 0);
                  return (
                    <button key={o.id} onClick={() => toggleMulti(g.id, o.id)} style={{
                      padding: '10px 12px', borderRadius: 'var(--r-default)',
                      background: on ? 'var(--matcha-50)' : 'var(--bg-surface)',
                      border: '1.5px solid ' + (on ? 'var(--matcha-600)' : 'var(--border-default)'),
                      fontSize: 13, textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: on ? 'var(--matcha-700)' : 'var(--text-primary)',
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: on ? 'var(--matcha-600)' : 'transparent', border: '1.5px solid ' + (on ? 'var(--matcha-600)' : 'var(--border-emphasis)'), display: 'grid', placeItems: 'center', flex: 'none' }}>
                        {on && <IconCheck size={10} style={{ color: 'white' }} stroke={3}/>}
                      </span>
                      <span style={{ flex: 1 }}>{o.name}</span>
                      {p !== 0 && <span className="muted" style={{ fontSize: 11 }}>{p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {g.selectionType === 'quantity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opts.map((o) => {
                  const n = (sel && typeof sel === 'object' && sel[o.id]) || 0;
                  const p = Number(o.priceAdjustment ?? 0);
                  return (
                    <div key={o.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 'var(--r-default)',
                      border: '1px solid var(--border-default)',
                      background: n > 0 ? 'var(--matcha-50)' : 'var(--bg-surface)',
                    }}>
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <div style={{ fontWeight: 500 }}>{o.name}</div>
                        {p !== 0 && <div className="muted" style={{ fontSize: 11 }}>{p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`} each</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => adjustQty(g.id, o.id, -1)} disabled={n <= 0} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>−</button>
                        <span className="tabular" style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{n}</span>
                        <button onClick={() => adjustQty(g.id, o.id, 1)} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white' }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <Field label="Special instructions">
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="No ice, extra hot, etc." rows={3}/>
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border-default)', marginTop: 16 }}>
        <span style={{ fontWeight: 500 }}>Quantity</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', background: 'var(--bg-muted)', borderRadius: 999 }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-surface)' }}>−</button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, fontSize: 17 }} className="tabular">{qty}</span>
          <button onClick={() => setQty(qty + 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white' }}>+</button>
        </div>
      </div>
    </Drawer>
  );
};

// ----- Payment -----
export const PagePayment = () => {
  const { navigate, t } = useApp();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState(null);
  const [cash, setCash] = useState(0);

  const hash = location.hash.replace(/^#/, '');
  const qs = hash.includes('?') ? hash.split('?')[1] : '';
  const orderId = new URLSearchParams(qs).get('orderId');

  const { data: order } = trpc.orders.getById.useQuery(
    { id: Number(orderId) },
    { enabled: !!orderId && !isNaN(Number(orderId)) }
  );
  const { data: methods = [] } = trpc.payments.listMethods.useQuery({ activeOnly: true }, { staleTime: 5000, refetchOnWindowFocus: true });
  const networkPrintReceipt = trpc.printing.autoPrintOnPaid.useMutation();
  const addPayment = trpc.orders.addPayment.useMutation({
    onSuccess: async () => {
      const auto = getAutomation();
      const selected = methods.find((x) => x.code === method);
      const sess = getSession();
      const branchId = sess?.currentBranchId || 1;
      try {
        // Network print receipt + cash drawer via backend TCP
        if (auto.autoPrintReceipt || (auto.autoOpenCashDrawer && selected?.type === 'cash')) {
          networkPrintReceipt.mutate({
            orderId: Number(orderId),
            branchId,
            openDrawer: !!(auto.autoOpenCashDrawer && selected?.type === 'cash'),
          });
        }
      } catch (err) {
        console.warn('Network auto-print failed:', err);
      }
      // Invalidate inventory/stock queries so other pages see updated stock immediately
      queryClient.invalidateQueries({ queryKey: [['inventory']] });
      queryClient.invalidateQueries({ queryKey: [['orders']] });
      navigate(`/pos/receipt?orderId=${orderId}`);
    },
    onError: (e) => alert(e.message),
  });

  const total = Number(order?.totalAmount ?? 0);

  const confirmPayment = () => {
    if (!method) { alert('Select a payment method'); return; }
    if (!orderId) { alert('No order selected'); return; }
    const m = methods.find((x) => x.code === method);
    if (!m) { alert('Payment method not found'); return; }
    // Build the reference string for traceability across method types
    let ref;
    if (m.type === 'cash') ref = `Cash received: ฿${cash || total}`;
    else if (m.type === 'qr') ref = `QR ref: ${Date.now()}`;
    else if (m.type === 'card') ref = `EDC approval: pending`;
    else if (m.type === 'transfer') ref = `Bank ref: pending`;
    else if (m.type === 'voucher') ref = `Voucher code: pending`;
    const auto = getAutomation();
    addPayment.mutate({
      orderId: Number(orderId),
      paymentMethodId: m.id,
      amount: String(total),
      reference: ref,
      autoComplete: auto.autoCompleteOrderOnPayment,
      autoSyncSheet: auto.autoGoogleSheetSync,
    });
  };

  return (
    <div style={{ padding: 32, maxWidth: 920, margin: '0 auto', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/pos')}><IconChevLeft size={18}/></button>
        <div>
          <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>{order?.orderNumber ?? 'Order'} · {order?.orderType ?? '—'}{order?.tableNumber ? ` · Table ${order.tableNumber}` : ''}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{t('payment.title')}</div>
        </div>
      </div>

      {/* Order summary */}
      <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-lg)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="t-caption">{t('payment.amountDue')}</div>
        </div>
        <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }} className="tabular">
          ฿<CountUp to={total}/>
        </div>
        <div className="muted" style={{ marginTop: 6 }}>{order?.items?.length ?? 0} items · ฿{Number(order?.subtotal ?? 0).toLocaleString()} subtotal · ฿{Number(order?.taxAmount ?? 0).toLocaleString()} tax</div>
      </div>

      {/* Methods */}
      {/* Group payment methods by type */}
      {['cash', 'qr', 'card', 'transfer', 'voucher'].map((groupType) => {
        const groupMethods = methods.filter((m) => m.type === groupType && m.isActive !== false);
        if (groupMethods.length === 0) return null;
        const groupLabel = { cash: '💵 Cash', qr: '📱 QR Code', card: '💳 Card (EDC)', transfer: '🏦 Bank Transfer', voucher: '🎟️ Voucher' }[groupType] || groupType;
        return (
          <div key={groupType} style={{ marginBottom: 14 }}>
            <div className="t-caption" style={{ marginBottom: 8 }}>{groupLabel}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }} className="pay-methods">
              {groupMethods.map((m) => {
                const I = m.type === 'cash' ? IconCoin : m.type === 'qr' ? IconQR : m.type === 'card' ? IconWallet : IconWallet;
                const active = method === m.code;
                return (
                  <button key={m.id} onClick={() => setMethod(m.code)} style={{
                    padding: 14,
                    background: active ? 'var(--matcha-50)' : 'var(--bg-surface)',
                    border: '1.5px solid ' + (active ? 'var(--matcha-600)' : 'var(--border-default)'),
                    borderRadius: 'var(--r-md)',
                    textAlign: 'left',
                    transition: 'all 240ms var(--ease-out-expo)',
                    boxShadow: active ? 'var(--glow-soft)' : 'none',
                  }}>
                    <I size={22} style={{ color: active ? 'var(--matcha-700)' : 'var(--text-secondary)' }}/>
                    <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                    {m.nameThai && <div className="muted" style={{ fontSize: 11 }}>{m.nameThai}</div>}
                    {Number(m.feePercentage ?? 0) > 0 && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>Fee {m.feePercentage}%</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {methods.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', marginBottom: 16 }}>
          No payment methods configured. Add some in Backoffice → Payments.
        </div>
      )}

      {/* Method config — match by type */}
      {(() => {
        const sel = methods.find((m) => m.code === method);
        const type = sel?.type;
        return <>
          {type === 'cash' && (
            <div className="card anim-fade" style={{ padding: 24 }}>
              <div className="t-h4" style={{ fontWeight: 600, marginBottom: 14 }}>Cash received</div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', marginBottom: 16,
                background: 'var(--bg-muted)', borderRadius: 'var(--r-default)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Amount received</span>
                <span className="tabular" style={{ fontSize: 28, fontWeight: 600, color: 'var(--matcha-700)' }}>฿{Number(cash || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="cash-layout">
                <div>
                  <Numpad
                    value={String(cash || '')}
                    onChange={(v) => setCash(v ? Number(v) : 0)}
                    quickValues={[100, 500, 1000, total]}
                    onQuickPick={(v) => setCash(Number(v))}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                  <div style={{ padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--r-default)' }}>
                    <div className="muted" style={{ fontSize: 12 }}>Order total</div>
                    <div className="tabular" style={{ fontSize: 22, fontWeight: 600 }}>฿{total.toLocaleString()}</div>
                  </div>
                  <div style={{
                    padding: 18, borderRadius: 'var(--r-default)',
                    background: (cash >= total) ? 'var(--matcha-50)' : 'rgba(239,68,68,0.06)',
                    border: '1.5px solid ' + ((cash >= total) ? 'var(--matcha-500)' : 'rgba(239,68,68,0.2)'),
                  }}>
                    <div style={{ fontSize: 12, color: cash >= total ? 'var(--matcha-700)' : 'var(--danger)', fontWeight: 500 }}>
                      {cash >= total ? 'Change due' : 'Still needed'}
                    </div>
                    <div className="tabular" style={{ fontSize: 32, fontWeight: 700, color: cash >= total ? 'var(--matcha-700)' : 'var(--danger)' }}>
                      ฿{Math.max(0, cash >= total ? cash - total : total - cash).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <style>{`@media (max-width: 700px) { .cash-layout { grid-template-columns: 1fr !important; } }`}</style>
            </div>
          )}
          {type === 'qr' && (
            <QRPaymentSection orderId={Number(orderId)} total={total} methodName={sel.name}/>
          )}
          {type === 'card' && (
            <div className="card anim-fade" style={{ padding: 24 }}>
              <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>EDC Terminal · {sel.name}</div>
              <div style={{ padding: 20, background: 'var(--matcha-50)', borderRadius: 'var(--r-md)', textAlign: 'center', marginBottom: 16 }}>
                <IconWallet size={40} style={{ color: 'var(--matcha-700)' }}/>
                <div style={{ marginTop: 12, fontWeight: 600 }}>Swipe / Insert / Tap card on EDC machine</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Amount: ฿{total.toLocaleString()}{Number(sel.feePercentage ?? 0) > 0 && ` (+${sel.feePercentage}% fee = ฿${(total * Number(sel.feePercentage) / 100).toFixed(2)})`}</div>
              </div>
              <div className="t-caption" style={{ marginBottom: 8 }}>Issuing bank</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                {['SCB', 'Kbank', 'Bangkok', 'Krungsri', 'TTB', 'Krungthai', 'CIMB', 'UOB'].map((b, i) => (
                  <button key={b} className="card" style={{ padding: 12, textAlign: 'center', fontWeight: 500, fontSize: 13 }}>
                    <div style={{ width: 30, height: 30, margin: '0 auto 6px', borderRadius: 6, background: `oklch(70% 0.12 ${i * 45})`, display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{b[0]}</div>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === 'transfer' && (
            <div className="card anim-fade" style={{ padding: 24 }}>
              <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>Bank Transfer</div>
              <div style={{ padding: 14, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)' }}>
                <div className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
                  <div><strong>Bank:</strong> SCB</div>
                  <div><strong>Account:</strong> 123-4-56789-0</div>
                  <div><strong>Name:</strong> Hibi Matcha Co., Ltd.</div>
                  <div><strong>Amount:</strong> ฿{total.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field label="Transfer reference / slip number">
                  <input className="input" placeholder="Last 4 digits of slip or ref number"/>
                </Field>
              </div>
            </div>
          )}
          {type === 'voucher' && (
            <div className="card anim-fade" style={{ padding: 24 }}>
              <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>{sel.name}</div>
              <Field label="Voucher code" required>
                <input className="input" placeholder="Enter voucher code or scan QR"/>
              </Field>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>The voucher's value will be deducted from the total. If voucher value is greater, remaining will need another payment.</div>
            </div>
          )}
        </>;
      })()}

      {/* Bottom bar */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/pos')} style={{ flex: 1 }}>← {t('payment.backToOrder')}</button>
        <button
          className="btn btn-primary btn-lg"
          onClick={confirmPayment}
          disabled={!method || !orderId || addPayment.isPending}
          style={{ flex: 2 }}
        >
          {addPayment.isPending ? `${t('loading')}` : <>{t('payment.pay')} · ฿{total.toLocaleString()} <IconCheck size={16}/></>}
        </button>
      </div>
    </div>
  );
};

// ----- QR Payment Section (real PromptPay QR) -----
const QRPaymentSection = ({ orderId, total, methodName }) => {
  const generateQr = trpc.orders.generatePaymentQr.useMutation();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  useEffect(() => {
    if (orderId && total > 0) {
      generateQr.mutateAsync({ orderId, amount: total })
        .then((res) => { if (res?.qrDataUrl) setQrDataUrl(res.qrDataUrl); })
        .catch((e) => console.warn('QR generation failed:', e));
    }
  }, [orderId, total]);
  return (
    <div className="card anim-fade" style={{ padding: 32, textAlign: 'center' }}>
      <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>Scan to pay with {methodName}</div>
      <div style={{ display: 'inline-block', position: 'relative', padding: 20, background: 'white', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="PromptPay QR" style={{ width: 220, height: 220, display: 'block' }}/>
        ) : generateQr.isPending ? (
          <div style={{ width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }}/>
              <div className="muted" style={{ fontSize: 12 }}>Generating QR...</div>
            </div>
          </div>
        ) : (
          <FakeQR size={220}/>
        )}
        {qrDataUrl && (
          <div style={{ position: 'absolute', left: 20, right: 20, top: 20, height: 220, overflow: 'hidden', borderRadius: 8, pointerEvents: 'none' }}>
            <div style={{ height: 2, width: '100%', background: 'linear-gradient(90deg, transparent, var(--matcha-500), transparent)', animation: 'scanline 2.4s linear infinite' }}/>
          </div>
        )}
      </div>
      <div className="muted" style={{ marginTop: 14 }}>Show this to the customer · ฿{total.toLocaleString()} due</div>
      {generateQr.isError && (
        <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: 12 }}>
          QR generation failed. PromptPay not configured for this branch.
          <br/>Please set up PromptPay in Backoffice → Settings → Payment.
        </div>
      )}
    </div>
  );
};

const FakeQR = ({ size = 200 }) => {
  // Procedural QR-like pattern
  const cells = 25;
  const cs = size / cells;
  const grid = [];
  let seed = 7;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      seed = (seed * 9301 + 49297) % 233280;
      const on = (seed / 233280) > 0.5;
      if (on) grid.push([c * cs, r * cs]);
    }
  }
  // finder squares (corners)
  const finder = (x, y) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width={cs * 7} height={cs * 7} fill="#1c1917"/>
      <rect x={x + cs} y={y + cs} width={cs * 5} height={cs * 5} fill="white"/>
      <rect x={x + cs * 2} y={y + cs * 2} width={cs * 3} height={cs * 3} fill="#1c1917"/>
    </g>
  );
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <rect width={size} height={size} fill="white"/>
      {grid.map(([x, y], i) => <rect key={i} x={x} y={y} width={cs} height={cs} fill="#1c1917"/>)}
      {finder(0, 0)}
      {finder(size - cs * 7, 0)}
      {finder(0, size - cs * 7)}
      {/* matcha brand mark center */}
      <rect x={size / 2 - 18} y={size / 2 - 18} width={36} height={36} rx={6} fill="white" stroke="#1c1917" strokeWidth="1.5"/>
      <g transform={`translate(${size / 2 - 12}, ${size / 2 - 12})`}>
        <IconBrand size={24}/>
      </g>
    </svg>
  );
};

// ----- Receipt -----
export const PageReceipt = () => {
  const { navigate, t } = useApp();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [paperSize, setPaperSize] = useState('80mm'); // 80mm, 58mm, A4

  const hash = location.hash.replace(/^#/, '');
  const qs = hash.includes('?') ? hash.split('?')[1] : '';
  const orderId = new URLSearchParams(qs).get('orderId');

  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: Number(orderId) },
    { enabled: !!orderId && !isNaN(Number(orderId)) }
  );

  const orderTime = order?.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  const orderDate = order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // Build receipt HTML for print popup
  const buildReceiptHTML = (size) => {
    if (!order) return '';
    // px widths for screen display; @page uses mm for actual print
    const pxWidthMap = { '80mm': '302px', '58mm': '219px', 'A4': '794px' };
    const mmWidthMap = { '80mm': '80mm', '58mm': '58mm', 'A4': '210mm' };
    const fontBase = size === 'A4' ? '14px' : size === '58mm' ? '11px' : '12px';
    const pxW = pxWidthMap[size] || '302px';
    const mmW = mmWidthMap[size] || '80mm';
    const items = (order.items ?? []).map(it =>
      `<div class="row"><span>${it.quantity}× ${it.menuItemName}</span><span>฿${Number(it.totalPrice).toLocaleString()}</span></div>`
    ).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt - ${order.orderNumber}</title>
<style>
  @page { size: ${mmW} auto; margin: 2mm; }
  @media print {
    html, body { width: ${mmW}; }
    .receipt { width: 100% !important; max-width: none !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; display: flex; justify-content: center; align-items: flex-start; padding-top: 20px; background: #f5f5f5; }
  .receipt {
    font-family: 'Sarabun', 'Noto Sans Thai', sans-serif;
    font-size: ${fontBase};
    width: ${pxW};
    max-width: ${pxW};
    padding: 12px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
    border: 1px solid #ddd;
  }
  .center { text-align: center; }
  .sep { border-top: 1px dashed #999; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .bold { font-weight: 700; }
  .big { font-size: 1.4em; }
  .small { font-size: 0.85em; color: #555; }
  .header { font-size: 1.2em; font-weight: 700; margin-bottom: 2px; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&family=Noto+Sans+Thai:wght@400;700&display=swap" rel="stylesheet">
</head><body>
<div class="receipt">
  <div class="center header">HIBI MATCHA</div>
  <div class="center small">ひびマッチャ · hibi MATCHA</div>
  <div class="center small">${orderDate} · ${orderTime}</div>
  <div class="center small">${order.orderNumber} · ${order.orderType || 'dine-in'}${order.tableNumber ? ' · Table ' + order.tableNumber : ''}</div>
  <div class="sep"></div>
  ${items}
  <div class="sep"></div>
  <div class="row"><span>Subtotal</span><span>฿${Number(order.subtotal ?? 0).toLocaleString()}</span></div>
  ${Number(order.discountAmount) > 0 ? `<div class="row"><span>Discount</span><span>-฿${Number(order.discountAmount).toLocaleString()}</span></div>` : ''}
  <div class="row"><span>VAT 7%</span><span>฿${Number(order.taxAmount ?? 0).toLocaleString()}</span></div>
  <div class="sep"></div>
  <div class="row bold big"><span>Total</span><span>฿${Number(order.totalAmount ?? 0).toLocaleString()}</span></div>
  <div class="sep"></div>
  <div class="center small" style="margin-top:8px;">ありがとうございます</div>
  <div class="center small">Thank you · ขอบคุณค่ะ</div>
  <div class="center small" style="margin-top:4px;">Hibi Matcha · ひびマッチャ</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
</body></html>`;
  };

  const handlePrint = () => {
    const html = buildReceiptHTML(paperSize);
    const popupWidth = paperSize === 'A4' ? 850 : paperSize === '58mm' ? 280 : 360;
    const w = window.open('', '_blank', `width=${popupWidth},height=600`);
    if (!w) { alert('Popup blocked — please allow popups'); return; }
    w.document.write(html);
    w.document.close();
    setShowPrintModal(false);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', padding: '32px 24px', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* Confetti */}
      {Array.from({ length: 18 }).map((_, i) => (
        <span key={i} style={{
          position: 'absolute', top: -20, left: `${(i * 17) % 100}%`,
          width: 8, height: 8, borderRadius: '50%',
          background: ['var(--matcha-400)', 'var(--matcha-600)', 'var(--gold)'][i % 3],
          animation: `confetti ${3 + (i % 4)}s var(--ease-out-expo) ${(i * 100)}ms infinite`,
          opacity: 0.6,
        }}/>
      ))}

      <div style={{ width: 'min(420px, 100%)' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="muted">Loading receipt…</div>
          </div>
        ) : (
          <>
            <div className="anim-bounce" style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--matcha-50)', display: 'grid', placeItems: 'center', color: 'var(--matcha-600)', boxShadow: 'var(--glow-soft)' }}>
                <IconCheck size={32} stroke={2.5}/>
              </div>
              <div className="t-h2" style={{ fontWeight: 600 }}>{t('receipt.orderComplete')}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {order ? `${order.orderNumber} · ${orderTime}` : `Order #${orderId}`}
              </div>
            </div>

            <div className="card" style={{ padding: 28, borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Logo size="sm"/>
              </div>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-emphasis)', paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>HIBI MATCHA · THAILAND</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {orderDate} · {orderTime} · {order?.orderType ?? 'Dine-in'}
                  {order?.tableNumber ? ` · Table ${order.tableNumber}` : ''}
                </div>
              </div>

              {(order?.items ?? []).map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span><span className="mono">{it.quantity}×</span> {it.menuItemName}</span>
                  <span className="tabular">฿{Number(it.totalPrice).toLocaleString()}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px dashed var(--border-emphasis)', marginTop: 14, paddingTop: 14, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>{t('pos.subtotal')}</span><span className="tabular">฿{Number(order?.subtotal ?? 0).toLocaleString()}</span>
                </div>
                {Number(order?.discountAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: 'var(--matcha-700)' }}>
                    <span>Discount</span><span className="tabular">−฿{Number(order.discountAmount).toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>VAT 7%</span><span className="tabular">฿{Number(order?.taxAmount ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 2px', fontSize: 17, fontWeight: 600 }}>
                  <span>{t('pos.grandTotal')}</span><span className="tabular">฿{Number(order?.totalAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border-emphasis)', marginTop: 14, paddingTop: 14, textAlign: 'center' }}>
                <div style={{ display: 'grid', placeItems: 'center', padding: 8 }}>
                  <FakeQR size={96}/>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Scan to leave a review</div>
                <div className="jp" style={{ fontSize: 14, marginTop: 12, fontWeight: 500 }}>ありがとうございます</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Thank you · ขอบคุณค่ะ</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowPrintModal(true)}
              ><IconPrint size={16}/> {t('receipt.print')}</button>
              <button className="btn btn-secondary" disabled title="Email receipt — coming soon"><IconShare size={16}/> Email</button>
            </div>
          </>
        )}
        <button onClick={() => navigate('/pos')} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12 }}>
          {t('receipt.newOrder')} <IconChevRight size={16}/>
        </button>
      </div>

      {/* Print Size Selection Modal */}
      {showPrintModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999 }} onClick={() => setShowPrintModal(false)}>
          <div className="card" style={{ padding: 24, borderRadius: 'var(--r-lg)', width: 'min(360px, 90vw)', boxShadow: 'var(--shadow-xl)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>เลือกขนาดกระดาษ</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { value: '80mm', label: '80mm (Thermal)', desc: 'สำหรับเครื่องพิมพ์ใบเสร็จ' },
                { value: '58mm', label: '58mm (Thermal)', desc: 'สำหรับเครื่องพิมพ์ขนาดเล็ก' },
                { value: 'A4', label: 'A4', desc: 'สำหรับเครื่องพิมพ์ปกติ' },
              ].map(opt => (
                <label key={opt.value} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: paperSize === opt.value ? '2px solid var(--matcha-500)' : '2px solid var(--border)',
                  background: paperSize === opt.value ? 'var(--matcha-50)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}>
                  <input type="radio" name="paperSize" value={opt.value} checked={paperSize === opt.value}
                    onChange={() => setPaperSize(opt.value)} style={{ accentColor: 'var(--matcha-600)' }}/>
                  <div>
                    <div style={{ fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handlePrint}><IconPrint size={16}/> พิมพ์ใบเสร็จ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----- Kitchen Display -----
export const PageKitchen = () => {
  const { branch, t } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const { data: tickets = [], refetch } = trpc.kitchen.listTickets.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, refetchInterval: 10000 }
  );

  const markPreparing = trpc.kitchen.markPreparing.useMutation({ onSuccess: () => refetch() });
  const markReady = trpc.kitchen.markReady.useMutation({ onSuccess: () => refetch() });
  const markServed = trpc.kitchen.markServed.useMutation({ onSuccess: () => refetch() });

  const inQueue = tickets.filter((t) => t.status === 'pending').length;
  const readyCount = tickets.filter((t) => t.status === 'ready').length;

  return (
    <div style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Drinks', 'Food', 'Desserts'].map((t, i) => (
            <button key={t} className={i === 0 ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>{t}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Stat label="In queue" value={String(inQueue)} color="var(--matcha-700)"/>
          <span style={{ width: 1, height: 28, background: 'var(--border-default)' }}/>
          <Stat label="Ready" value={String(readyCount)}/>
          <span style={{ width: 1, height: 28, background: 'var(--border-default)' }}/>
          <Toggle label="Sound" checked={true} onChange={() => {}}/>
        </div>
      </div>

      {tickets.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <IconCheck size={40} style={{ opacity: 0.2 }}/>
          <p style={{ marginTop: 12, fontWeight: 500 }}>{t('kitchen.noTickets')}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {tickets.map((ticket, i) => {
          const elapsed = ticket.createdAt
            ? Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000)
            : 0;
          const isLate = elapsed >= 10;
          const statusColor = ticket.status === 'pending'
            ? 'var(--matcha-500)'
            : ticket.status === 'ready'
            ? 'var(--matcha-700)'
            : isLate
            ? 'var(--danger)'
            : 'var(--warning)';

          return (
            <div key={ticket.id} className="card" style={{
              padding: 16, borderLeft: `4px solid ${statusColor}`,
              animation: isLate ? 'pulse-soft 2s ease-in-out infinite' : `slideUp 400ms var(--ease-out-expo) ${i * 60}ms both`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }} className="tabular">{ticket.ticketNumber}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {ticket.order?.tableNumber ? `Table ${ticket.order.tableNumber}` : ticket.order?.orderType ?? 'Order'}
                    {ticket.order?.customerName ? ` · ${ticket.order.customerName}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tabular" style={{ fontSize: 18, fontWeight: 600, color: statusColor }}>
                    {elapsed}:{((Date.now() - new Date(ticket.createdAt ?? 0).getTime()) % 60000 / 1000).toFixed(0).padStart(2, '0')}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>elapsed</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                {(ticket.items ?? []).map((it, j) => (
                  <div key={j} style={{ padding: '6px 0', borderTop: j === 0 ? 'none' : '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}><span className="tabular">{it.quantity}×</span> {it.menuItemName}</div>
                    {it.notes && <div className="muted" style={{ fontSize: 11, marginLeft: 16 }}>· {it.notes}</div>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {ticket.status === 'pending' && (
                  <button
                    onClick={() => markPreparing.mutate({ ticketId: ticket.id })}
                    disabled={markPreparing.isPending}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >{t('kitchen.markPreparing')}</button>
                )}
                {(ticket.status === 'pending' || ticket.status === 'preparing') && (
                  <button
                    onClick={() => markReady.mutate({ ticketId: ticket.id })}
                    disabled={markReady.isPending}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                  ><IconCheck size={16}/> {t('kitchen.markReady')}</button>
                )}
                {ticket.status === 'ready' && (
                  <button
                    onClick={() => markServed.mutate({ ticketId: ticket.id })}
                    disabled={markServed.isPending}
                    className="btn btn-primary"
                    style={{ flex: 1, background: 'var(--matcha-700)' }}
                  ><IconCheck size={16}/> {t('kitchen.markServed')}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => (
  <div>
    <div className="t-caption" style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{label}</div>
    <div className="tabular" style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2, lineHeight: 1 }}>{value}</div>
  </div>
);

// ----- Order history -----
export const PageOrders = () => {
  const { navigate, branch, t } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [openOrderId, setOpenOrderId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.orders.list.useQuery(
    { branchId: branchId ?? undefined, search: search || undefined, status: statusFilter || undefined, page, limit: 50 },
    { staleTime: 15000, refetchOnWindowFocus: true }
  );

  const { data: openOrder } = trpc.orders.getById.useQuery(
    { id: openOrderId ?? 0 },
    { enabled: !!openOrderId }
  );

  const orders = data?.orders ?? [];
  const totalOrders = data?.total ?? 0;
  const bulkSyncMut = trpc.orders.bulkSyncToSheet.useMutation();

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const statusClass = (st) => {
    if (st === 'completed') return 'pill-matcha';
    if (st === 'refunded' || st === 'cancelled') return 'pill-warning';
    if (st === 'pending' || st === 'preparing') return 'pill-gold';
    return '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">POS / Orders</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{t('orders.title')}</h1>
            <p className="page-desc">{totalOrders} orders</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const rows = orders.map((o) => ({
                orderNumber: o.orderNumber,
                date: o.createdAt ? new Date(o.createdAt).toISOString() : '',
                status: o.status,
                type: o.orderType,
                table: o.tableNumber || '',
                subtotal: o.subtotal,
                tax: o.taxAmount,
                discount: o.discountAmount,
                total: o.totalAmount,
              }));
              downloadCSV(`orders-${new Date().toISOString().slice(0,10)}`, rows);
            }}><IconExport size={14}/> CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const rows = orders.map((o) => ({
                Order: o.orderNumber,
                Date: o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
                Status: o.status,
                Type: o.orderType,
                Table: o.tableNumber || '',
                Total: Number(o.totalAmount),
              }));
              downloadXLSX(`orders-${new Date().toISOString().slice(0,10)}`, rows, undefined, 'Orders');
            }}><IconExport size={14}/> XLSX</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/pos')}><IconPlus size={16}/> {t('receipt.newOrder')}</button>
          </div>
        </div>
      </div>

      <TopActionBar
        search={search}
        onSearch={setSearch}
        filters={<>
          <Select value={statusFilter} onChange={setStatusFilter} options={['', 'pending', 'preparing', 'ready', 'completed', 'cancelled', 'refunded']} placeholder="All status"/>
        </>}
        onAdd={() => navigate('/pos')}
        addLabel="New order"
      />

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())} actions={<>
        <button
          className="btn btn-ghost btn-sm"
          onClick={async () => {
            if (selected.size === 0) return;
            if (!window.confirm(`Sync ${selected.size} order(s) to Google Sheet?`)) return;
            try {
              const res = await bulkSyncMut.mutateAsync({ orderIds: Array.from(selected) });
              alert(`Synced ${res.synced} payment(s) to sheet.`);
              setSelected(new Set());
            } catch (err) {
              alert('Sync failed: ' + (err.message || 'Unknown'));
            }
          }}
        ><IconShare size={14}/> Sync to Sheet</button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const picked = orders.filter((o) => selected.has(o.id));
            downloadCSV(`orders-selected-${new Date().toISOString().slice(0,10)}`, picked.map((o) => ({
              orderNumber: o.orderNumber,
              date: o.createdAt,
              status: o.status,
              total: o.totalAmount,
            })));
          }}
        ><IconExport size={14}/> Export CSV</button>
      </>}/>

      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
            <IconReceipt size={36} style={{ opacity: 0.3 }}/>
            <p style={{ marginTop: 12 }}>No orders yet</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
                <th style={{ width: 40, padding: '12px 8px 12px 16px' }}>
                  <Checkbox
                    checked={selected.size === orders.length && orders.length > 0}
                    indeterminate={selected.size > 0 && selected.size < orders.length}
                    onChange={() => setSelected(selected.size === orders.length ? new Set() : new Set(orders.map(o => o.id)))}
                  />
                </th>
                {['Order #', 'Time', 'Items', 'Customer', 'Total', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const time = o.createdAt ? new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <tr key={o.id} onClick={() => setOpenOrderId(o.id)} style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer', transition: 'background 160ms' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 8px 12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.has(o.id)} onChange={() => toggle(o.id)}/>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500 }} className="tabular">{o.orderNumber}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }} className="tabular">{time}</td>
                    <td style={{ padding: '12px' }}>
                      {(o.items?.length ?? 0)} <span className="muted">items</span>
                      {o.orderType && <span className="pill" style={{ height: 18, fontSize: 10, padding: '0 6px', marginLeft: 4 }}>{o.orderType}</span>}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{o.customerName || 'Walk-in'}</td>
                    <td style={{ padding: '12px', fontWeight: 600 }} className="tabular">฿{Number(o.totalAmount).toLocaleString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={'pill ' + statusClass(o.status)} style={{ height: 22, fontSize: 11 }}>
                        <span className="dot"/> {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', gap: 4 }} className="row-actions">
                        <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => setOpenOrderId(o.id)}><IconEye size={14}/></button>
                        <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}><IconPrint size={14}/></button>
                        <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}><IconMore size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-tertiary)' }}>
          <span>Showing {orders.length} of {totalOrders}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><IconChevLeft size={14}/></button>
            <button className="btn btn-ghost btn-sm" disabled={orders.length < 50} onClick={() => setPage(p => p + 1)}><IconChevRight size={14}/></button>
          </div>
        </div>
      </div>

      <Drawer open={!!openOrderId} onClose={() => setOpenOrderId(null)} title={openOrder ? openOrder.orderNumber : 'Order'} width={560}>
        {openOrder && (
          <>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="t-caption">Status</div>
                  <span className={'pill ' + statusClass(openOrder.status)} style={{ marginTop: 4 }}><span className="dot"/> {openOrder.status}</span>
                </div>
                <div>
                  <div className="t-caption">Type</div>
                  <div style={{ marginTop: 4, fontWeight: 500 }}>{openOrder.orderType}</div>
                </div>
                {openOrder.tableNumber && (
                  <div>
                    <div className="t-caption">Table</div>
                    <div style={{ marginTop: 4, fontWeight: 500 }}>{openOrder.tableNumber}</div>
                  </div>
                )}
                <div>
                  <div className="t-caption">Total</div>
                  <div style={{ marginTop: 4, fontWeight: 600 }} className="tabular">฿{Number(openOrder.totalAmount).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="t-caption" style={{ marginBottom: 8 }}>Items</div>
            <div className="card" style={{ padding: 16 }}>
              {(openOrder.items ?? []).map((it, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                  <span><span className="tabular">{it.quantity}×</span> {it.menuItemName}</span>
                  <span className="tabular">฿{Number(it.totalPrice).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '1px solid var(--border-default)', marginTop: 8, fontWeight: 600 }}>
                <span>Total</span><span className="tabular">฿{Number(openOrder.totalAmount).toLocaleString()}</span>
              </div>
            </div>
            {openOrder.payments?.length > 0 && (
              <>
                <div className="t-caption" style={{ marginTop: 20, marginBottom: 8 }}>Payments</div>
                <div className="card" style={{ padding: 16 }}>
                  {openOrder.payments.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', fontSize: 13 }}>
                      <span>{p.referenceNumber || 'Payment'}</span>
                      <span className="tabular">฿{Number(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};


// ----- Pending Payment Queue -----
export const PagePendingOrders = () => {
  const { navigate, branch, t } = useApp();
  const queryClient = useQueryClient();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const { data: pendingOrders = [], isLoading, refetch } = trpc.orders.listPending.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId, refetchInterval: 15000 }
  );

  const markPaid = trpc.orders.markPaid.useMutation({
    onSuccess: () => {
      refetch();
      // Invalidate inventory queries since stock deduction happens on payment
      queryClient.invalidateQueries({ queryKey: [['inventory']] });
    },
  });
  const getPrintPayload = trpc.orders.getPrintPayload.useMutation();
  const networkPrintOnPaid = trpc.printing.autoPrintOnPaid.useMutation();

  const handleMarkPaid = async (orderId) => {
    if (!window.confirm('Mark this order as paid?')) return;
    try {
      await markPaid.mutateAsync({ orderId });
      // Network auto-print receipt + open cash drawer (fire & forget)
      const sess = getSession();
      networkPrintOnPaid.mutate({ orderId, branchId: sess?.currentBranchId || 1, openDrawer: true });
    } catch (e) {
      alert('Failed: ' + (e.message || 'Unknown error'));
    }
  };

  const handlePrint = async (orderId, type) => {
    try {
      const payload = await getPrintPayload.mutateAsync({ orderId, type });
      if (payload?.html) {
        const w = window.open('', '_blank', 'width=380,height=600');
        if (w) {
          w.document.write(payload.html);
          w.document.close();
        }
      }
    } catch (e) {
      alert('Print failed: ' + (e.message || 'Unknown'));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">POS / Pending Payments</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">{t('orders.pending')}</h1>
            <p className="page-desc">{pendingOrders.length} orders awaiting payment</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()}><IconRefresh size={14}/> Refresh</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/pos')}><IconPlus size={16}/> {t('receipt.newOrder')}</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading…</div>
      ) : pendingOrders.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <IconCheck size={48} style={{ opacity: 0.3, color: 'var(--matcha-500)' }}/>
          <p style={{ marginTop: 12, fontSize: 16, fontWeight: 500 }}>All orders are paid!</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>No pending payments at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pendingOrders.map((order) => {
            const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            const isUrgent = elapsed > 10;
            return (
              <div key={order.id} className="card" style={{
                padding: 20,
                borderLeft: `4px solid ${isUrgent ? 'var(--danger)' : 'var(--matcha-400)'}`,
                transition: 'transform 200ms var(--ease-out-expo)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  {/* Order info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 16 }} className="tabular">{order.orderNumber}</span>
                      <span className={'pill ' + (isUrgent ? 'pill-danger' : 'pill-gold')} style={{ height: 20, fontSize: 10 }}>
                        <IconClock size={10}/> {elapsed}m ago
                      </span>
                      {order.orderType && (
                        <span className="pill" style={{ height: 20, fontSize: 10 }}>{order.orderType}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {order.customerName || 'Walk-in'}
                      {order.tableNumber && <> · Table {order.tableNumber}</>}
                      {' · '}{order.items?.length ?? '?'} items
                    </div>
                    {/* Item list preview */}
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      {(order.items ?? []).slice(0, 3).map((it, i) => (
                        <span key={i}>{i > 0 && ', '}{it.quantity}× {it.menuItemName}</span>
                      ))}
                      {(order.items?.length ?? 0) > 3 && <span> +{order.items.length - 3} more</span>}
                    </div>
                  </div>

                  {/* Total + actions */}
                  <div style={{ textAlign: 'right', minWidth: 160 }}>
                    <div className="tabular" style={{ fontSize: 24, fontWeight: 700, color: 'var(--matcha-700)', marginBottom: 10 }}>
                      ฿{Number(order.totalAmount).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handlePrint(order.id, 'order_slip')}
                        title="Print order slip"
                      ><IconPrint size={14}/></button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/pos/payment?orderId=${order.id}`)}
                      ><IconQR size={14}/> Pay</button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMarkPaid(order.id)}
                        disabled={markPaid.isPending}
                      ><IconCheck size={14}/> {t('orders.markPaid')}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
