// ============================================
// Page: pos
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import { EmptyCart,IconBookmark,IconBowl,IconBox,IconBrand,IconCake,IconCards,IconCheck,IconChevLeft,IconChevRight,IconClock,IconCoin,IconCupHot,IconCupIced,IconDiscount,IconEdit,IconExport,IconEye,IconGrid,IconHeart,IconImport,IconLeaf,IconList,IconMore,IconMoreV,IconLogout,IconPlus,IconPrint,IconQR,IconReceipt,IconRefresh,IconSettings,IconShare,IconTrash,IconWallet,IconWhisk,IconInfo,IconSearch } from "@/icons";
import { useApp,Drawer,Field,Select,Toggle,Checkbox,SearchInput,TopActionBar,BulkActionBar,Placeholder,CountUp,Modal } from "@/components";
import { Numpad } from "@/components/Numpad";
import { Logo } from "@/components/Shell";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, clearSession } from "@/lib/authStore";
// USB hardware imports removed — all printing now via network tRPC
// import { printReceipt, openCashDrawer } from "@/lib/hardware";
import { downloadCSV, downloadXLSX, downloadPDF, tableHTMLFromRows } from "@/lib/export";
import { displayName } from "@/lib/i18n";
import { getAutomation } from "@/lib/automationSettings";


// Icon map for category icons
const CATEGORY_ICON_MAP = { IconWhisk, IconCupHot, IconCupIced, IconLeaf, IconCake, IconBowl, IconBox, IconGrid };

// Motion animation variants for category shifts and list displays
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 22
    }
  }
};

const LiveMatchaBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      pointerEvents: 'none',
      background: 'radial-gradient(circle at 50% 50%, var(--background), var(--bg-muted))',
    }}>
      <div className="ambient-blob" style={{
        top: '10%',
        left: '15%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(143,188,143,0.25) 0%, rgba(143,188,143,0) 70%)',
        animationDelay: '0s',
        animationDuration: '30s',
      }}/>
      <div className="ambient-blob" style={{
        bottom: '15%',
        right: '10%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(107,142,35,0.2) 0%, rgba(107,142,35,0) 70%)',
        animationDelay: '-5s',
        animationDuration: '35s',
      }}/>
      <div className="ambient-blob" style={{
        top: '50%',
        left: '60%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(244,228,193,0.3) 0%, rgba(244,228,193,0) 70%)',
        animationDelay: '-10s',
        animationDuration: '25s',
      }}/>
    </div>
  );
};

export const PagePOS = () => {
  const { navigate, branch, t, lang } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const utils = trpc.useUtils();

  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [cart, setCart] = useState([]);
  const [optionFor, setOptionFor] = useState(null);
  const [editingCartIdx, setEditingCartIdx] = useState(null);
  const [orderType, setOrderType] = useState('Dine-in');
  const [discount, setDiscount] = useState(null); // { type: 'percent'|'fixed', value: number, label: string }
  const [discountOpen, setDiscountOpen] = useState(false);
  const [showSopLibraryDrawer, setShowSopLibraryDrawer] = useState(false);
  const [sopPreviewId, setSopPreviewId] = useState(null);
  const [heldDrawerOpen, setHeldDrawerOpen] = useState(false);

  const resumeOrder = trpc.orders.resumeOrder.useMutation({
    onSuccess: () => {
      utils.orders.listHeld.invalidate();
      setHeldDrawerOpen(false);
    },
  });

  // CRM member points states
  const [member, setMember] = useState(null);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);

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
  // Expiry alerts
  const { data: expiryAlerts } = trpc.inventoryLots.getExpiryAlerts.useQuery(
    { branchId: branchId ?? 0, warnDays: 7 },
    { enabled: !!branchId, staleTime: 60000, refetchOnWindowFocus: true }
  );
  const [showExpiryAlert, setShowExpiryAlert] = useState(true);
  const expiredCount    = expiryAlerts?.expired?.length ?? 0;
  const expiringSoonCount = expiryAlerts?.expiringSoon?.length ?? 0;
  const hasExpiryAlert = showExpiryAlert && (expiredCount > 0 || expiringSoonCount > 0);

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
  const discountAmt = (!discount ? 0 : discount.type === 'percent' ? Math.round(sub * discount.value / 100) : Math.min(discount.value, sub)) + pointsRedeemed;
  const afterDiscount = Math.max(0, sub - discountAmt);
  const vat = Math.round(afterDiscount * 0.07);
  const total = afterDiscount + vat;

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

  const handleSync = async () => {
    try {
      await utils.invalidate();
      alert("ซิงค์ข้อมูลเมนูสำเร็จ (Menu synced successfully)");
    } catch (e) {
      alert("ซิงค์ข้อมูลล้มเหลว: " + e.message);
    }
  };

  const handleLogout = () => {
    if (window.confirm("คุณต้องการออกจากระบบ / ปิดกะ หรือไม่? (Are you sure you want to logout / end shift?)")) {
      clearSession();
      navigate('/pos/login');
    }
  };

  const confirmAddItem = (item, opts = [], qty = 1, note = '') => {
    const optPrice = opts.reduce((s, o) => s + Number(o.priceAdjustment ?? 0), 0);
    const price = Number(item.displayPrice ?? item.basePrice) + optPrice;
    const itemNames = opts.map((o) => o.optionName ?? o.name);
    
    if (editingCartIdx !== null) {
      setCart((c) => c.map((it, i) => i === editingCartIdx ? {
        ...it,
        price,
        qty,
        opts: itemNames,
        rawOpts: opts,
        note,
      } : it));
      setEditingCartIdx(null);
    } else {
      const existingIdx = cart.findIndex((it) => it.id === item.id && JSON.stringify(it.rawOpts) === JSON.stringify(opts) && it.note === note);
      if (existingIdx !== -1) {
        setCart((c) => c.map((it, i) => i === existingIdx ? { ...it, qty: it.qty + qty } : it));
      } else {
        setCart((c) => [...c, {
          id: item.id,
          imageUrl: item.imageUrl,
          name: item.name,
          price,
          qty,
          opts: itemNames,
          rawOpts: opts,
          note,
        }]);
      }
    }
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
      <LiveMatchaBackground />

      {/* ─── Expiry Alert Banner ─────────────────────────────────────── */}
      {hasExpiryAlert && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
          background: expiredCount > 0 ? 'linear-gradient(90deg, #dc2626, #ef4444)' : 'linear-gradient(90deg, #d97706, #f59e0b)',
          color: 'white', padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <span style={{ fontSize: 18 }}>{expiredCount > 0 ? '🚨' : '⚠️'}</span>
          <div style={{ flex: 1 }}>
            {expiredCount > 0 && (
              <strong>หมดอายุแล้ว {expiredCount} รายการ: </strong>
            )}
            {expiredCount > 0 && expiryAlerts.expired.slice(0, 3).map((l, i) => (
              <span key={i}>{l.itemNameThai || l.itemName}{i < Math.min(2, expiredCount - 1) ? ', ' : ''}</span>
            ))}
            {expiredCount > 0 && expiringSoonCount > 0 && ' · '}
            {expiringSoonCount > 0 && (
              <span>จะหมดอายุใน 7 วัน: <strong>{expiringSoonCount} รายการ</strong></span>
            )}
          </div>
          <button
            onClick={() => { /* navigate to lots page */ }}
            style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            ดูรายละเอียด
          </button>
          <button
            onClick={() => setShowExpiryAlert(false)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16, padding: 4, opacity: 0.8 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Menu side */}
      <div className="glass-premium" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border-default)', zIndex: 1 }}>
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
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm" onClick={handleManualScan} title={t('pos.scan')}><IconQR size={16}/> {t('pos.scan')}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/kitchen')} title={t('pos.kitchen')}><IconClock size={16}/> {t('pos.kitchen')}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/orders')} title={t('pos.orders')}><IconReceipt size={16}/> {t('pos.orders')}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => navigate('/pos/delivery')} title={t('pos.delivery')}><IconBox size={16}/> {t('pos.delivery')}</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={() => setShowSopLibraryDrawer(true)} title={t('pos.sop')}><IconBookmark size={16}/> {t('pos.sop')}</motion.button>
          {(session?.role === 'super_admin' || session?.role === 'staff_admin') && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary btn-sm hide-on-sunmi" onClick={() => navigate('/backoffice/menu')} title={t('nav.menu')}><IconPlus size={16}/> {t('nav.menu')}</motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={handleSync} title="ซิงค์ข้อมูล (Sync)"><IconRefresh size={16}/> ซิงค์ (Sync)</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-ghost btn-sm hide-on-sunmi" onClick={handleLogout} title="ออกจากระบบ / ปิดกะ (Logout / End Shift)" style={{ color: 'var(--danger)' }}><IconLogout size={16}/> ออกจากระบบ (Logout)</motion.button>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} className="btn btn-ghost btn-icon hide-on-sunmi" onClick={() => navigate('/settings')} title="Settings"><IconSettings size={18}/></motion.button>
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
                <motion.button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '8px 14.5px', borderRadius: 999,
                    fontSize: 13, fontWeight: 500,
                    background: active ? 'var(--matcha-600)' : 'var(--bg-surface)',
                    color: active ? 'white' : 'var(--text-secondary)',
                    border: '1px solid ' + (active ? 'var(--matcha-600)' : 'var(--border-default)'),
                    boxShadow: active ? '0 4px 12px rgba(104,133,100,0.15)' : 'none',
                    transition: 'all 200ms var(--ease-out-expo)',
                  }}
                >
                  <I size={15}/> {c.name}
                </motion.button>
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
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`grid-${activeCat}`}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}
            >
              {filtered.map((it, i) => <POSItemCard key={it.id} item={it} idx={i} onAdd={addToCart} lang={lang} branchId={branchId} onStatusChange={() => utils.menu.invalidate()}/>)}
            </motion.div>
          )}
          {!isLoading && view === 'list' && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`list-${activeCat}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {filtered.map((it) => <POSItemRow key={it.id} item={it} onAdd={addToCart} lang={lang} branchId={branchId} onStatusChange={() => utils.menu.invalidate()}/>)}
            </motion.div>
          )}
          {!isLoading && view === 'cards' && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`cards-${activeCat}`}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}
            >
              {filtered.map((it, i) => <POSItemCard key={it.id} item={it} idx={i} onAdd={addToCart} large lang={lang} branchId={branchId} onStatusChange={() => utils.menu.invalidate()}/>)}
            </motion.div>
          )}
        </div>
      </div>

      {/* Cart */}
      <CartPanel
        cart={cart} setCart={setCart} orderType={orderType} setOrderType={setOrderType}
        updateQty={updateQty} sub={sub} discountAmt={discountAmt} vat={vat} total={total}
        discount={discount} onDiscountOpen={() => setDiscountOpen(true)} onClearDiscount={() => setDiscount(null)}
        branchId={branchId}
        member={member} setMember={setMember}
        pointsRedeemed={pointsRedeemed} setPointsRedeemed={setPointsRedeemed}
        onEditItem={(idx) => { setEditingCartIdx(idx); setOptionFor(cart[idx]); }}
        onRemoveItem={(idx) => updateQty(idx, -999)}
        onOrderCreated={(orderId) => {
          setCart([]);
          setDiscount(null);
          setMember(null);
          setPointsRedeemed(0);
          navigate(`/pos/payment?orderId=${orderId}`);
        }}
      />

      {/* Discount Drawer */}
      <DiscountDrawer
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        sub={sub}
        onApply={(d) => { setDiscount(d); setDiscountOpen(false); }}
        branchId={branchId}
      />

      {/* Option picker */}
      <OptionSheet 
        item={optionFor} 
        onClose={() => { setOptionFor(null); setEditingCartIdx(null); }} 
        onAdd={confirmAddItem}
        editingItem={editingCartIdx !== null ? cart[editingCartIdx] : null}
        onPreviewSop={(id) => setSopPreviewId(id)}
      />

      {/* Held orders */}
      <Drawer
        open={heldDrawerOpen}
        onClose={() => setHeldDrawerOpen(false)}
        title="Held Orders"
        subtitle={`${heldOrders?.length ?? 0} orders on hold`}
        width={420}
      >
        {(heldOrders ?? []).length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>No held orders</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {(heldOrders ?? []).map((o) => (
              <div key={o.id} className="card" style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{o.orderNumber}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    ฿{Number(o.totalAmount).toLocaleString()} · {o.customerName || 'Walk-in'}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={resumeOrder.isPending}
                  onClick={async () => {
                    try {
                      await resumeOrder.mutateAsync({ orderId: o.id });
                      navigate(`/pos/payment?orderId=${o.id}`);
                    } catch (e) {
                      alert(e?.message ?? 'Resume failed');
                    }
                  }}
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* SOP Library Drawer */}
      <SopLibraryDrawer
        open={showSopLibraryDrawer}
        onClose={() => setShowSopLibraryDrawer(false)}
        branchId={branchId}
        onSelectSop={(id) => { setSopPreviewId(id); setShowSopLibraryDrawer(false); }}
      />

      {/* Standalone SOP Preview Drawer */}
      <SopPreviewDrawer
        sopId={sopPreviewId}
        open={!!sopPreviewId}
        onClose={() => setSopPreviewId(null)}
      />

      {/* Connection status */}
      <div style={{ position: 'absolute', bottom: 16, left: 24, display: 'flex', gap: 8 }}>
        <span className="glass pill" style={{ height: 28, padding: '0 12px', fontSize: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)', boxShadow: '0 0 6px var(--matcha-500)' }}/>
          {t('pos.online')}
        </span>
        <button
          type="button"
          className="glass pill"
          onClick={() => setHeldDrawerOpen(true)}
          style={{ height: 28, padding: '0 12px', fontSize: 12, cursor: 'pointer', border: 'none' }}
        >
          <IconClock size={12}/> {heldOrders?.length ?? 0} {t('pos.held')}
        </button>
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

const POSItemCard = ({ item, idx, onAdd, large, lang, branchId, onStatusChange }) => {
  const isOutOfStock = item.stockLevel === 0;
  const displayPrice = item.displayPrice ?? item.basePrice;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const setStatusMut = trpc.menu.setBranchItemStatus.useMutation({
    onSuccess: () => {
      onStatusChange?.();
    }
  });

  const handleStatusChange = async (status) => {
    try {
      await setStatusMut.mutateAsync({ menuItemId: item.id, branchId, status });
    } catch (e) {
      alert("Error: " + e.message);
    }
    setShowStatusMenu(false);
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: isOutOfStock ? 1 : 1.03, y: isOutOfStock ? 0 : -4, boxShadow: '0 12px 30px rgba(104,133,100,0.12)', borderColor: 'var(--matcha-400)' }}
      whileTap={{ scale: isOutOfStock ? 1 : 0.97 }}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-md)',
        overflow: 'visible',
        textAlign: 'left',
        opacity: isOutOfStock ? 0.8 : 1,
        cursor: 'default',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="pos-item-card-wrapper"
    >
      <div 
        onClick={() => {
          if (!isOutOfStock) onAdd(item);
        }}
        style={{
          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: large ? '4/3' : '1/1', width: '100%', overflow: 'hidden', borderTopLeftRadius: 'var(--r-md)', borderTopRightRadius: 'var(--r-md)' }}>
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
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,240,240,0.7)', display: 'grid', placeItems: 'center' }}>
              <span className="pill pill-danger" style={{ fontWeight: 600 }}>ของหมด / Out of Stock</span>
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: isOutOfStock ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{displayName(item, lang)}</div>
            {lang !== 'th' && item.nameThai && <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{item.nameThai}</div>}
            {lang === 'th' && item.name !== item.nameThai && <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{item.name}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="tabular" style={{ fontSize: 15, fontWeight: 600, color: isOutOfStock ? 'var(--text-secondary)' : 'var(--text-primary)' }}>฿{Number(displayPrice).toFixed(0)}</span>
            {!isOutOfStock && (
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white', display: 'grid', placeItems: 'center' }}>
                <IconPlus size={14} stroke={2.5}/>
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStatusMenu(!showStatusMenu);
          }}
          className="btn btn-secondary btn-icon"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)',
            padding: 0,
            display: 'grid',
            placeItems: 'center',
          }}
          title="จัดการสถานะ / Branch Control"
        >
          <IconMoreV size={16}/>
        </button>

        {showStatusMenu && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(false);
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 32,
                right: 0,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--r-default)',
                boxShadow: 'var(--shadow-lg)',
                padding: 4,
                zIndex: 10,
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('open'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}/> เปิดขาย (Open)
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('out_of_stock'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}/> ของหมด (Out of Stock)
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('hidden'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }}/> ซ่อนเมนู (Hide)
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const POSItemRow = ({ item, onAdd, lang, branchId, onStatusChange }) => {
  const isOutOfStock = item.stockLevel === 0;
  const displayPrice = item.displayPrice ?? item.basePrice;
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const setStatusMut = trpc.menu.setBranchItemStatus.useMutation({
    onSuccess: () => {
      onStatusChange?.();
    }
  });

  const handleStatusChange = async (status) => {
    try {
      await setStatusMut.mutateAsync({ menuItemId: item.id, branchId, status });
    } catch (e) {
      alert("Error: " + e.message);
    }
    setShowStatusMenu(false);
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: isOutOfStock ? 1 : 1.015, boxShadow: '0 6px 18px rgba(104,133,100,0.08)', borderColor: 'var(--matcha-400)' }}
      whileTap={{ scale: isOutOfStock ? 1 : 0.99 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: 12, background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-md)',
        opacity: isOutOfStock ? 0.8 : 1,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <div 
        onClick={() => { if (!isOutOfStock) onAdd(item); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, flex: 1, cursor: isOutOfStock ? 'not-allowed' : 'pointer'
        }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--matcha-50)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none', position: 'relative', overflow: 'hidden' }}>
          {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <IconWhisk size={24}/>}
          {isOutOfStock && <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.2)', display: 'grid', placeItems: 'center', color: 'var(--danger)', fontWeight: 'bold', fontSize: 10 }}>หมด</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: isOutOfStock ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{displayName(item, lang)}</div>
          <div className="muted" style={{ fontSize: 12 }}>{lang === 'th' ? (item.name || '') : (item.nameThai || item.description || '')}</div>
        </div>
        {item.tag && <span className={'pill ' + (item.tag === 'New' ? 'pill-gold' : 'pill-matcha')}>{item.tag}</span>}
        <div className="tabular" style={{ fontSize: 15, fontWeight: 600, minWidth: 64, textAlign: 'right', marginRight: 40, color: isOutOfStock ? 'var(--text-secondary)' : 'var(--text-primary)' }}>฿{Number(displayPrice).toFixed(0)}</div>
      </div>

      <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowStatusMenu(!showStatusMenu);
          }}
          className="btn btn-ghost btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <IconMoreV size={16}/>
        </button>

        {showStatusMenu && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 9 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowStatusMenu(false);
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 28,
                right: 0,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--r-default)',
                boxShadow: 'var(--shadow-lg)',
                padding: 4,
                zIndex: 10,
                minWidth: 140,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('open'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}/> เปิดขาย (Open)
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('out_of_stock'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}/> ของหมด (Out of Stock)
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusChange('hidden'); }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }}/> ซ่อนเมนู (Hide)
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const CartPanel = ({
  cart, setCart, orderType, setOrderType, updateQty, sub, discountAmt, vat, total, branchId, onOrderCreated, discount, onDiscountOpen, onClearDiscount,
  member, setMember, pointsRedeemed, setPointsRedeemed, onEditItem, onRemoveItem
}) => {
  const { navigate, t } = useApp();
  const [tableNo, setTableNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [noteFor, setNoteFor] = useState(null); // idx of item being noted

  // CRM local states
  const [searchPhone, setSearchPhone] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFirstName, setNewMemberFirstName] = useState('');
  const [newMemberLastName, setNewMemberLastName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const utils = trpc.useUtils();
  const registerMutation = trpc.members.registerFromPos.useMutation();

  const handleSearchMember = async () => {
    if (!searchPhone) return;
    setSearchLoading(true);
    try {
      const res = await utils.client.members.findByPhone.query({ phone: searchPhone });
      if (res) {
        setMember(res);
        setPointsRedeemed(0); // reset redeemed points on new member select
        setShowRegisterForm(false);
      } else {
        setMember(null);
        if (confirm("ไม่พบสมาชิก ต้องการสมัครสมาชิกใหม่หรือไม่?")) {
          setNewMemberPhone(searchPhone);
          setNewMemberFirstName('');
          setNewMemberLastName('');
          setNewMemberEmail('');
          setShowRegisterForm(true);
        }
      }
    } catch (err) {
      alert(err.message || "Error searching member");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRegisterMember = async () => {
    if (!newMemberPhone) return;
    try {
      const res = await registerMutation.mutateAsync({
        phone: newMemberPhone,
        firstName: newMemberFirstName || undefined,
        lastName: newMemberLastName || undefined,
        email: newMemberEmail || undefined,
      });
      alert("สมัครสมาชิกสำเร็จ!");
      setMember({ ...res, points: 0 });
      setPointsRedeemed(0);
      setShowRegisterForm(false);
    } catch (err) {
      alert(err.message || "Registration failed");
    }
  };

  const handleRemoveMember = () => {
    setMember(null);
    setPointsRedeemed(0);
  };

  const createOrder = trpc.orders.create.useMutation();
  const confirmOrder = trpc.orders.confirmOrder.useMutation();
  const networkPrintOnConfirm = trpc.printing.autoPrintOnConfirm.useMutation();

  const fetchPrintPayload = async (orderId, type) =>
    utils.client.orders.getPrintPayload.query({ orderId, type });

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!branchId) { alert(t('inventory.noBranch')); return; }
    try {
      const orderTypeMap = { 'Dine-in': 'dine-in', 'Takeaway': 'takeaway', 'Delivery': 'delivery' };
      const regularDiscount = !discount ? 0 : discount.type === 'percent'
        ? Math.round(sub * discount.value / 100)
        : Math.min(discount.value, sub);
      const result = await createOrder.mutateAsync({
        branchId,
        orderType: orderTypeMap[orderType] ?? 'dine-in',
        tableNumber: tableNo || undefined,
        customerName: customerName || undefined,
        notes: orderNote || undefined,
        memberId: member ? member.id : undefined,
        pointsRedeemed: pointsRedeemed || undefined,
        discountCode: discount?.code || undefined,
        manualDiscountAmount: discount && !discount.code ? regularDiscount : undefined,
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
        networkPrintOnConfirm.mutate({ orderId: result.id, branchId: branchId || 1 });
        // Browser auto-print order slip (fallback)
        if (auto.autoPrintReceipt) {
          try {
            const slipPayload = await fetchPrintPayload(result.id, 'order_slip');
            if (slipPayload?.html) {
              const w = window.open('', '_blank', 'width=380,height=600');
              if (w) { w.document.write(slipPayload.html); w.document.close(); }
            }
          } catch (e) { console.warn('Auto-print order slip failed:', e); }
        }
        // Browser auto-print kitchen ticket (fallback)
        try {
          const kitchenPayload = await fetchPrintPayload(result.id, 'kitchen_ticket');
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
    onClearDiscount?.();
  };

  const holdOrder = trpc.orders.holdOrder.useMutation({
    onSuccess: () => utils.orders.listHeld.invalidate(),
  });

  const handleHold = async () => {
    if (cart.length === 0) return;
    if (!branchId) return;
    try {
      const orderTypeMap = { 'Dine-in': 'dine-in', 'Takeaway': 'takeaway', 'Delivery': 'delivery' };
      const regularDiscount = !discount ? 0 : discount.type === 'percent'
        ? Math.round(sub * discount.value / 100)
        : Math.min(discount.value, sub);
      await holdOrder.mutateAsync({
        branchId,
        orderType: orderTypeMap[orderType] ?? 'dine-in',
        tableNumber: tableNo || undefined,
        customerName: customerName || undefined,
        notes: orderNote || undefined,
        memberId: member ? member.id : undefined,
        pointsRedeemed: pointsRedeemed || undefined,
        discountCode: discount?.code || undefined,
        manualDiscountAmount: discount && !discount.code ? regularDiscount : undefined,
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
      handleClear();
      alert('Order held! Tap the held counter to resume.');
    } catch (err) {
      alert(err?.message ?? 'Failed to hold order');
    }
  };

  const ORDER_TYPES = [
    { k: 'Dine-in', label: '🍵 Dine-in', color: 'var(--matcha-600)' },
    { k: 'Takeaway', label: '🛍 Takeaway', color: 'var(--info)' },
    { k: 'Delivery', label: '🚴 Delivery', color: 'var(--warning)' },
  ];

  return (
    <aside className="glass-premium" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border-default)', zIndex: 1 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border-default)', background: 'transparent' }}>
        {/* Order type */}
        <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', padding: 3, gap: 2, marginBottom: 10 }}>
          {ORDER_TYPES.map(({ k, label }) => (
            <button key={k} onClick={() => setOrderType(k)} style={{
              flex: 1, padding: '7px 6px', fontSize: 11.5, fontWeight: 500,
              background: orderType === k ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid ' + (orderType === k ? 'var(--border-strong)' : 'transparent'),
              borderRadius: 'var(--r-subtle)',
              color: orderType === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: orderType === k ? 'var(--shadow-xs)' : 'none',
              transition: 'all 180ms var(--ease-out-expo)',
              whiteSpace: 'nowrap',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" placeholder="Table no." value={tableNo} onChange={(e) => setTableNo(e.target.value)} style={{ height: 32, fontSize: 13, flex: '0 0 90px' }}/>
          <input className="input" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ height: 32, fontSize: 13, flex: 1 }}/>
        </div>

        {/* Customer CRM / Loyalty Points */}
        <div style={{
          marginTop: 10,
          padding: 10,
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-default)',
        }}>
          {!member && !showRegisterForm && (
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input"
                  placeholder="Customer Phone (Loyalty)"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchMember(); }}
                  style={{ height: 32, fontSize: 13, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleSearchMember}
                  className="btn btn-secondary btn-sm"
                  disabled={searchLoading}
                  style={{ height: 32, padding: '0 12px' }}
                >
                  {searchLoading ? '...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {showRegisterForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--matcha-700)' }}>Register New Member</div>
              <input
                className="input"
                placeholder="Phone"
                value={newMemberPhone}
                readOnly
                style={{ height: 28, fontSize: 12, background: 'var(--bg-disabled)' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  className="input"
                  placeholder="First Name"
                  value={newMemberFirstName}
                  onChange={(e) => setNewMemberFirstName(e.target.value)}
                  style={{ height: 28, fontSize: 12, flex: 1 }}
                />
                <input
                  className="input"
                  placeholder="Last Name"
                  value={newMemberLastName}
                  onChange={(e) => setNewMemberLastName(e.target.value)}
                  style={{ height: 28, fontSize: 12, flex: 1 }}
                />
              </div>
              <input
                className="input"
                placeholder="Email (Optional)"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                style={{ height: 28, fontSize: 12 }}
              />
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setShowRegisterForm(false)}
                >Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={handleRegisterMember}
                  disabled={registerMutation.isPending}
                >Save</button>
              </div>
            </div>
          )}

          {member && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 16 }}>👤</span>
                  <span>{member.firstName ? `${member.firstName} ${member.lastName || ''}` : member.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveMember}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-quaternary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Remove Member"
                >×</button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4, color: 'var(--matcha-700)', fontWeight: 600 }}>
                <span>⭐ Points Balance:</span>
                <span style={{ fontSize: 13 }} className="tabular">{member.points} pts</span>
              </div>

              {member.points > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder={`Redeem points (max ${member.points})`}
                    value={pointsRedeemed || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val < 0) {
                        setPointsRedeemed(0);
                      } else if (val > member.points) {
                        setPointsRedeemed(member.points);
                      } else {
                        const regularDiscount = !discount ? 0 : discount.type === 'percent' ? Math.round(sub * discount.value / 100) : Math.min(discount.value, sub);
                        const maxPointsAllowed = sub - regularDiscount;
                        if (val > maxPointsAllowed) {
                          setPointsRedeemed(maxPointsAllowed);
                        } else {
                          setPointsRedeemed(val);
                        }
                      }
                    }}
                    style={{ height: 32, fontSize: 12, flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                      const regularDiscount = !discount ? 0 : discount.type === 'percent' ? Math.round(sub * discount.value / 100) : Math.min(discount.value, sub);
                      const maxPointsAllowed = Math.min(member.points, sub - regularDiscount);
                      setPointsRedeemed(maxPointsAllowed);
                    }}
                    style={{ whiteSpace: 'nowrap', height: 32 }}
                  >Redeem Max</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 10px' }}>
        {cart.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <EmptyCart/>
            <div style={{ fontWeight: 500, marginTop: 12, fontSize: 14 }}>{t('pos.emptyCart')}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t('pos.addItems')}</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {cart.map((it, idx) => (
              <motion.div
                key={`${it.id}-${JSON.stringify(it.rawOpts)}-${it.note}`}
                layout
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{
                  padding: '10px 12px', marginBottom: 6,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--r-default)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, var(--matcha-50), var(--matcha-100))', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none', fontSize: 10, fontWeight: 700 }}>
                    {it.imageUrl ? <img src={it.imageUrl} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}/> : <IconWhisk size={16}/>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{it.name}</div>
                      <div className="tabular" style={{ fontSize: 13, fontWeight: 600, flex: 'none' }}>฿{(it.price * it.qty).toLocaleString()}</div>
                    </div>
                    {it.opts?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {it.opts.map((o, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--matcha-50)', color: 'var(--matcha-700)', borderRadius: 999, border: '1px solid var(--matcha-100)' }}>{o}</span>
                        ))}
                      </div>
                    )}
                    {noteFor === idx ? (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                        <input
                          className="input"
                          autoFocus
                          placeholder="Special note…"
                          value={it.note || ''}
                          onChange={(e) => {
                            const updated = [...cart];
                            updated[idx] = { ...updated[idx], note: e.target.value };
                            setCart(updated);
                          }}
                          onBlur={() => setNoteFor(null)}
                          style={{ height: 28, fontSize: 12 }}
                        />
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'var(--bg-muted)', borderRadius: 'var(--r-full)', padding: '2px 2px' }}>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => updateQty(idx, -1)}
                          style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', display: 'grid', placeItems: 'center', fontSize: 14, boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border-default)', cursor: 'pointer' }}
                        >−</motion.button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13, fontWeight: 600 }} className="tabular">{it.qty}</span>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => updateQty(idx, 1)}
                          style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 14, cursor: 'pointer', border: 'none' }}
                        >+</motion.button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => setNoteFor(noteFor === idx ? null : idx)}
                          className="btn btn-ghost btn-xs"
                          style={{ height: 24, fontSize: 11, color: it.note ? 'var(--matcha-700)' : 'var(--text-quaternary)' }}
                        >{it.note ? '📝 Note' : '+ Note'}</button>
                        
                        <button
                          onClick={() => onEditItem?.(idx)}
                          className="btn btn-ghost btn-icon btn-xs"
                          style={{ color: 'var(--matcha-700)', width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0 }}
                          title="แก้ไขตัวเลือก (Edit Options)"
                        >
                          <IconEdit size={13}/>
                        </button>
                        
                        <button
                          onClick={() => onRemoveItem?.(idx)}
                          className="btn btn-ghost btn-icon btn-xs text-danger"
                          style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', padding: 0 }}
                          title="ลบรายการ (Remove)"
                        >
                          <IconTrash size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Totals + checkout */}
      <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderTop: '2px solid var(--border-default)' }}>
        {/* Discount + Note row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            className={discount ? 'btn btn-sm' : 'btn btn-secondary btn-sm'}
            style={{
              flex: 1,
              ...(discount ? {
                background: 'var(--matcha-50)',
                border: '1px solid var(--matcha-300)',
                color: 'var(--matcha-700)',
              } : {}),
            }}
            onClick={onDiscountOpen}
          >
            <IconDiscount size={13}/>
            {discount ? `${discount.label} −฿${discountAmt.toLocaleString()}` : t('discounts.title')}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ flex: 1 }}
            onClick={() => { const n = prompt('Order note:', orderNote); if (n !== null) setOrderNote(n); }}
          >
            <IconEdit size={13}/> {orderNote ? 'Note ✓' : 'Note'}
          </button>
        </div>

        {/* Price breakdown */}
        <div style={{ fontSize: 13, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="muted">{t('pos.subtotal')}</span>
            <span className="tabular">฿{sub.toLocaleString()}</span>
          </div>
          {discountAmt > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'var(--matcha-700)' }}>
              <span>Discount ({discount?.label})</span>
              <span className="tabular">−฿{discountAmt.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 0 }}>
            <span className="muted">{t('pos.vat')} (7%)</span>
            <span className="tabular">฿{vat.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--border-default)', marginTop: 6 }}>
            <span>{t('pos.grandTotal')}</span>
            <span className="tabular" style={{ color: 'var(--matcha-700)' }}>฿{total.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || createOrder.isPending}
          className="btn btn-primary btn-xl"
          style={{ width: '100%', marginBottom: 8, boxShadow: 'var(--glow-soft), var(--shadow-md)', fontSize: 15, height: 52 }}
        >
          {createOrder.isPending ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spinSlow 0.8s linear infinite' }}/>
              Creating order…
            </span>
          ) : (
            <>{t('pos.checkout') || 'Checkout'} · ฿{total.toLocaleString()} <IconChevRight size={16}/></>
          )}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <button onClick={handleHold} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
            ⏸ {t('pos.holdOrder') || 'Hold'}
          </button>
          <button onClick={() => navigate('/pos/orders')} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
            📋 Orders
          </button>
          <button onClick={handleClear} className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--danger)' }}>
            🗑 Clear
          </button>
        </div>
      </div>
    </aside>
  );
};

// DiscountDrawer — loads real discounts from API + allows manual entry
const DiscountDrawer = ({ open, onClose, sub, onApply, branchId }) => {
  const [manualType, setManualType] = useState('percent'); // 'percent' | 'fixed'
  const [manualVal, setManualVal] = useState('');

  const { data: discounts = [] } = trpc.discounts.list.useQuery(
    { branchId },
    { enabled: open && !!branchId, staleTime: 30000 }
  );

  const activeDiscounts = discounts.filter(d => d.isActive !== false);

  const applyPreset = (d) => {
    const isPercent = d.discountType === 'percentage';
    const val = Number(d.value ?? d.amount ?? 0);
    onApply({
      type: isPercent ? 'percent' : 'fixed',
      value: val,
      label: isPercent ? `${val}%` : `฿${val}`,
      id: d.id,
      code: d.code,
    });
  };

  const applyManual = () => {
    const val = Number(manualVal);
    if (!val || val <= 0) return;
    if (manualType === 'percent' && val > 100) return;
    if (manualType === 'fixed' && val > sub) return;
    onApply({
      type: manualType,
      value: val,
      label: manualType === 'percent' ? `${val}%` : `฿${val}`,
    });
  };

  const previewAmt = !manualVal ? 0 : manualType === 'percent'
    ? Math.round(sub * Number(manualVal) / 100)
    : Math.min(Number(manualVal), sub);

  return (
    <Drawer open={open} onClose={onClose} title="Apply Discount" subtitle={`Subtotal ฿${sub.toLocaleString()}`} width={460}>
      {/* Preset discounts from API */}
      {activeDiscounts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="t-caption" style={{ marginBottom: 10, color: 'var(--text-tertiary)' }}>Preset Discounts</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {activeDiscounts.map((d) => {
              const isPercent = d.discountType === 'percentage';
              const val = Number(d.value ?? d.amount ?? 0);
              const preview = isPercent ? Math.round(sub * val / 100) : Math.min(val, sub);
              return (
                <button
                  key={d.id}
                  onClick={() => applyPreset(d)}
                  style={{
                    padding: '14px 12px', borderRadius: 'var(--r-default)',
                    background: 'var(--bg-muted)', border: '1.5px solid var(--border-default)',
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'all 180ms',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--matcha-400)'; e.currentTarget.style.background = 'var(--matcha-50)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-muted)'; }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--matcha-700)' }}>
                    {isPercent ? `${val}%` : `฿${val}`}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{d.name}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Saves ฿{preview.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual entry */}
      <div style={{ padding: 16, background: 'var(--bg-muted)', borderRadius: 'var(--r-md)' }}>
        <div className="t-caption" style={{ marginBottom: 10, color: 'var(--text-tertiary)' }}>Manual Discount</div>
        <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 'var(--r-default)', padding: 3, gap: 2, marginBottom: 12 }}>
          {[{ k: 'percent', l: '% Percent' }, { k: 'fixed', l: '฿ Fixed' }].map(({ k, l }) => (
            <button key={k} onClick={() => setManualType(k)} style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500,
              background: manualType === k ? 'var(--bg-surface)' : 'transparent',
              border: '1px solid ' + (manualType === k ? 'var(--border-default)' : 'transparent'),
              borderRadius: 'var(--r-subtle)',
              color: manualType === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: manualType === k ? 'var(--shadow-xs)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="number"
            min="0"
            max={manualType === 'percent' ? 100 : sub}
            placeholder={manualType === 'percent' ? '0–100' : '฿ Amount'}
            value={manualVal}
            onChange={(e) => setManualVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyManual()}
            style={{ flex: 1, fontSize: 18, fontWeight: 600, textAlign: 'center' }}
          />
          <button
            onClick={applyManual}
            disabled={!manualVal || Number(manualVal) <= 0}
            className="btn btn-primary"
            style={{ minWidth: 100 }}
          >
            Apply {previewAmt > 0 ? `−฿${previewAmt.toLocaleString()}` : ''}
          </button>
        </div>
        {previewAmt > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--matcha-700)', textAlign: 'center' }}>
            After discount: <b>฿{(sub - previewAmt).toLocaleString()}</b>
          </div>
        )}
      </div>
    </Drawer>
  );
};

const SopPreviewDrawer = ({ sopId, open, onClose }) => {
  const { data: sop, isLoading } = trpc.sop.getById.useQuery(
    { id: sopId ?? 0 },
    { enabled: open && !!sopId }
  );

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      if (match && match[2].length === 11) {
        return `https://www.youtube.com/embed/${match[2]}`;
      }
    } catch (e) {}
    return null;
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={sop?.title || "วิธีชง / Recipe Guide"}
      subtitle={sop?.subtitle || "คู่มือขั้นตอนการชง / Recipe Step-by-Step"}
      width={460}
      footer={
        <button className="btn btn-primary" onClick={onClose} style={{ height: 44, width: '100%' }}>
          เข้าใจแล้ว (Close Guide)
        </button>
      }
    >
      {isLoading && <div className="muted center" style={{ padding: 40, textAlign: 'center' }}>กำลังโหลดสูตร...</div>}
      {!isLoading && !sop && <div className="muted center" style={{ padding: 40, textAlign: 'center' }}>ไม่พบข้อมูลสูตร</div>}
      {!isLoading && sop && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sop.coverImageUrl && (
            <img src={sop.coverImageUrl} alt={sop.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
          )}

          {sop.videoUrl && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'black' }}>
              {(() => {
                const ytUrl = getYoutubeEmbedUrl(sop.videoUrl);
                if (ytUrl) {
                  return (
                    <iframe
                      width="100%"
                      height="220"
                      src={ytUrl}
                      title="SOP Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  );
                }
                return (
                  <video src={sop.videoUrl} controls style={{ width: '100%', display: 'block', maxHeight: 220 }} />
                );
              })()}
            </div>
          )}

          <div className="sop-body-content" style={{ fontSize: 14, lineHeight: 1.6 }}>
            {(() => {
              const c = sop.content;
              if (!c) return <p className="muted italic">ไม่มีรายละเอียดขั้นตอน</p>;
              if (typeof c === 'string') {
                return <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{c}</div>;
              }
              if (Array.isArray(c)) {
                return c.map((block, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    {block.type === 'heading' && <h3 style={{ fontSize: 15, fontWeight: 600, margin: '16px 0 8px', color: 'var(--matcha-800)' }}>{block.text}</h3>}
                    {block.type === 'paragraph' && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{block.text}</p>}
                    {block.type === 'list' && block.items && (
                      <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13 }}>
                        {block.items.map((it, j) => <li key={j} style={{ marginBottom: 4 }}>{it}</li>)}
                      </ul>
                    )}
                    {block.type === 'callout' && (
                      <div style={{ background: 'var(--matcha-50)', border: '1px solid var(--matcha-200)', borderRadius: 'var(--r-md)', padding: 12, margin: '8px 0', fontSize: 13, color: 'var(--matcha-900)', display: 'flex', gap: 8 }}>
                        <IconInfo size={16} style={{ color: 'var(--matcha-600)', flex: 'none', marginTop: 2 }} />
                        <div>{block.text}</div>
                      </div>
                    )}
                  </div>
                ));
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </Drawer>
  );
};

const SopLibraryDrawer = ({ open, onClose, onSelectSop, branchId }) => {
  const [search, setSearch] = useState('');
  const { data: sops = [], isLoading } = trpc.sop.list.useQuery(
    { search: search || undefined, status: 'published', branchId: branchId || undefined },
    { enabled: open }
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="คลังสูตรและวิธีปฏิบัติ (SOP Library)"
      subtitle="ค้นหาสูตรเครื่องดื่มและขั้นตอนการเตรียมอุปกรณ์"
      width={460}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        <div className="card" style={{ padding: '2px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', border: '1px solid var(--border-default)' }}>
          <IconSearch size={18} style={{ color: 'var(--text-tertiary)' }} />
          <input
            className="input"
            placeholder="ค้นหาชื่อเมนู, สูตรชง, แท็ก..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', boxShadow: 'none', height: 38, fontSize: 14, flex: 1, background: 'transparent' }}
          />
        </div>

        {isLoading ? (
          <div className="muted center" style={{ textAlign: 'center', padding: 20 }}>กำลังโหลด...</div>
        ) : sops.length === 0 ? (
          <div className="muted center" style={{ textAlign: 'center', padding: 20 }}>ไม่พบข้อมูลสูตร</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
            {sops.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSop(s.id)}
                className="card"
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 150ms, border-color 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--matcha-50)';
                  e.currentTarget.style.borderColor = 'var(--matcha-300)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--matcha-100)', display: 'grid', placeItems: 'center', color: 'var(--matcha-700)', flex: 'none' }}>
                  <IconBookmark size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                  {s.subtitle && <div className="muted" style={{ fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.subtitle}</div>}
                </div>
                <IconChevRight size={16} style={{ color: 'var(--text-tertiary)', flex: 'none' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};

const OptionSheet = ({ item, onClose, onAdd, editingItem = null, onPreviewSop }) => {
  // selections: { [groupId]: optionId (single) | Set<optionId> (multi) | { [optionId]: number } (quantity) }
  const [selections, setSelections] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const { data: detail, isLoading } = trpc.menu.getById.useQuery(
    { id: item?.id },
    { enabled: !!item?.id, staleTime: 5000, refetchOnWindowFocus: true }
  );

  const { branch } = useApp();
  const branchId = branch?.id;

  const { data: branchStock = [] } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId && !!item?.id, staleTime: 10000, refetchOnWindowFocus: true }
  );

  const stockMap = useMemo(() => {
    return new Map(branchStock.map(s => [s.inventoryItemId, s.availableStock]));
  }, [branchStock]);

  const getUnitCost = (itemId) => {
    const stockItem = branchStock.find(s => s.inventoryItemId === itemId);
    if (stockItem && stockItem.averageCost !== null && Number(stockItem.averageCost) > 0) {
      return Number(stockItem.averageCost);
    }
    if (stockItem && stockItem.item && stockItem.item.costPerUnit !== null) {
      return Number(stockItem.item.costPerUnit);
    }
    return 0;
  };

  const compileRecipe = (baseRecipe, selectedOptions) => {
    let compiled = baseRecipe.map((r) => ({
      inventoryItemId: Number(r.inventoryItemId),
      quantity: Number(r.quantity ?? 0),
      unit: r.unitOfMeasure || r.unit || 'pcs',
      role: r.role || '',
      itemName: r.itemName || '',
    }));

    const effects = [];
    for (const item of selectedOptions) {
      const opt = item.option;
      const optQty = item.qty || 1;
      if (opt.stockEffects && Array.isArray(opt.stockEffects)) {
        for (const ef of opt.stockEffects) {
          effects.push({
            ...ef,
            quantity: ef.quantity !== null && ef.quantity !== undefined && ef.quantity !== '' ? Number(ef.quantity) * optQty : null,
            optQty: optQty,
          });
        }
      }
    }

    // 3. Apply REPLACE
    const replaceEffects = effects.filter(e => e.type === 'REPLACE');
    for (const ef of replaceEffects) {
      const idx = compiled.findIndex(r => 
        (ef.targetRole && r.role === ef.targetRole) || 
        (ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId)
      );
      if (idx !== -1) {
        const original = compiled[idx];
        const newQty = ef.quantity !== null && ef.quantity !== undefined ? ef.quantity : original.quantity;
        compiled[idx] = {
          inventoryItemId: Number(ef.inventoryItemId),
          quantity: newQty,
          unit: ef.unit || original.unit,
          role: ef.role || original.role || '',
        };
      }
    }

    // 4. Apply REMOVE
    const removeEffects = effects.filter(e => e.type === 'REMOVE');
    for (const ef of removeEffects) {
      compiled = compiled.filter(r => {
        const matchRole = ef.targetRole && r.role === ef.targetRole;
        const matchId = ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId;
        return !(matchRole || matchId);
      });
    }

    // 5. Apply SET_QUANTITY
    const setQtyEffects = effects.filter(e => e.type === 'SET_QUANTITY');
    for (const ef of setQtyEffects) {
      compiled = compiled.map(r => {
        const matchRole = ef.targetRole && r.role === ef.targetRole;
        const matchId = ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId;
        if (matchRole || matchId) {
          return {
            ...r,
            quantity: ef.quantity !== null && ef.quantity !== undefined ? ef.quantity : r.quantity,
            unit: ef.unit || r.unit,
          };
        }
        return r;
      });
    }

    // 6. Apply ADD
    const addEffects = effects.filter(e => e.type === 'ADD');
    for (const ef of addEffects) {
      compiled.push({
        inventoryItemId: Number(ef.inventoryItemId),
        quantity: ef.quantity !== null && ef.quantity !== undefined ? ef.quantity : 1,
        unit: ef.unit || 'pcs',
        role: ef.role || '',
      });
    }

    const grouped = {};
    for (const r of compiled) {
      const key = `${r.inventoryItemId}_${r.unit}`;
      if (!grouped[key]) {
        grouped[key] = { ...r };
      } else {
        grouped[key].quantity += r.quantity;
      }
    }

    return Object.values(grouped);
  };

  const calculateDynamicCostAdjustment = (opt) => {
    if (!opt.stockEffects || !Array.isArray(opt.stockEffects) || opt.stockEffects.length === 0) {
      return Number(opt.costAdjustment ?? 0);
    }

    let calculatedCost = 0;
    const baseRecipe = detail?.recipe ?? [];

    for (const ef of opt.stockEffects) {
      const efQty = ef.quantity !== null && ef.quantity !== undefined && ef.quantity !== '' ? Number(ef.quantity) : null;
      if (ef.type === 'ADD' && ef.inventoryItemId) {
        const cost = getUnitCost(ef.inventoryItemId);
        calculatedCost += cost * (efQty ?? 1);
      } 
      else if (ef.type === 'REMOVE') {
        const recipeItem = baseRecipe.find(r => 
          (ef.targetRole && r.role === ef.targetRole) ||
          (ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId)
        );
        if (recipeItem) {
          const baseQty = Number(recipeItem.quantity ?? 0);
          const cost = getUnitCost(recipeItem.inventoryItemId);
          calculatedCost -= cost * baseQty;
        }
      } 
      else if (ef.type === 'REPLACE' && ef.inventoryItemId) {
        const recipeItem = baseRecipe.find(r => 
          (ef.targetRole && r.role === ef.targetRole) ||
          (ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId)
        );
        const baseQty = recipeItem ? Number(recipeItem.quantity ?? 0) : 0;
        const replaceQty = efQty !== null ? efQty : baseQty;
        
        const targetCost = recipeItem ? getUnitCost(recipeItem.inventoryItemId) : 0;
        const replacementCost = getUnitCost(ef.inventoryItemId);
        
        calculatedCost += (replacementCost * replaceQty) - (targetCost * baseQty);
      } 
      else if (ef.type === 'SET_QUANTITY') {
        const recipeItem = baseRecipe.find(r => 
          (ef.targetRole && r.role === ef.targetRole) ||
          (ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId)
        );
        if (recipeItem) {
          const baseQty = Number(recipeItem.quantity ?? 0);
          const newQty = efQty ?? 0;
          const cost = getUnitCost(recipeItem.inventoryItemId);
          calculatedCost += cost * (newQty - baseQty);
        }
      }
    }

    return calculatedCost;
  };

  const isOptionOutOfStock = (opt) => {
    const baseRecipe = detail?.recipe ?? [];
    if (!baseRecipe || baseRecipe.length === 0) return false;

    const simSelections = { ...selections };
    const groupId = opt.groupId;
    const group = groups.find(ig => ig.group?.id === groupId)?.group;
    if (!group) return false;

    if (group.selectionType === 'single') {
      simSelections[groupId] = opt.id;
    } else if (group.selectionType === 'multi') {
      const next = new Set(selections[groupId] instanceof Set ? selections[groupId] : []);
      next.add(opt.id);
      simSelections[groupId] = next;
    } else if (group.selectionType === 'quantity') {
      const obj = { ...(selections[groupId] || {}) };
      obj[opt.id] = (obj[opt.id] || 0) + 1;
      simSelections[groupId] = obj;
    }

    const simSelectedOpts = [];
    for (const ig of groups) {
      const g = ig.group;
      if (!g) continue;
      const sel = simSelections[g.id];
      const opts = ig.options ?? [];
      if (g.selectionType === 'single' && sel != null) {
        const o = opts.find((x) => x.id === sel);
        if (o) simSelectedOpts.push({ option: o, qty: 1 });
      } else if (g.selectionType === 'multi' && sel instanceof Set) {
        for (const id of sel) {
          const o = opts.find((x) => x.id === id);
          if (o) simSelectedOpts.push({ option: o, qty: 1 });
        }
      } else if (g.selectionType === 'quantity' && sel && typeof sel === 'object') {
        for (const [oid, n] of Object.entries(sel)) {
          if (n > 0) {
            const o = opts.find((x) => x.id === Number(oid));
            if (o) simSelectedOpts.push({ option: o, qty: n });
          }
        }
      }
    }

    const finalRecipe = compileRecipe(baseRecipe, simSelectedOpts);
    for (const ing of finalRecipe) {
      const available = stockMap.get(ing.inventoryItemId) ?? 0;
      const required = ing.quantity * qty;
      if (available < required) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (item) {
      if (editingItem) {
        setQty(editingItem.qty || 1);
        setNote(editingItem.note || '');
      } else {
        setQty(1);
        setNote('');
        setSelections({});
      }
    }
  }, [item?.id, editingItem]);

  // Pre-fill defaults or load editing selections when detail loads
  useEffect(() => {
    if (!detail?.optionGroups) return;
    const init = {};
    for (const ig of detail.optionGroups) {
      const g = ig.group;
      if (!g) continue;
      const opts = ig.options ?? [];
      
      if (editingItem) {
        // Find rawOpts that belong to this group
        const groupSelected = (editingItem.rawOpts || []).filter((o) => o.groupId === g.id);
        if (g.selectionType === 'single') {
          if (groupSelected.length > 0) init[g.id] = groupSelected[0].id;
        } else if (g.selectionType === 'multi') {
          init[g.id] = new Set(groupSelected.map((o) => o.id));
        } else if (g.selectionType === 'quantity') {
          const qMap = {};
          groupSelected.forEach((o) => {
            qMap[o.id] = o.qty || 1;
          });
          init[g.id] = qMap;
        }
      } else {
        if (g.selectionType === 'single') {
          const def = opts.find((o) => o.isDefault) ?? opts[0];
          if (def) init[g.id] = def.id;
        } else if (g.selectionType === 'multi') {
          init[g.id] = new Set(opts.filter((o) => o.isDefault).map((o) => o.id));
        } else if (g.selectionType === 'quantity') {
          init[g.id] = {};
        }
      }
    }
    setSelections(init);
  }, [detail?.id, editingItem]);

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
    const opts = (ig.options ?? []).filter((o) => o.isActive);
    if (opts.length === 0) return false;
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
    const payload = selectedOpts.map((o) => {
      const costAdj = calculateDynamicCostAdjustment(o);
      return {
        ...o,
        optionId: o.id,
        optionName: o.optionName,
        costAdjustment: String(costAdj)
      };
    });
    onAdd({ ...item, ...detail, basePrice, displayPrice: basePrice }, payload, qty, note);
  };



  return (
    <Drawer 
      open={!!item} 
      onClose={onClose} 
      title={detail?.nameThai || detail?.name || item.name} 
      subtitle={detail?.nameThai && detail?.name ? detail.name : 'เลือกตัวเลือกเสริม / Customize your drink'} 
      width={480}
      footer={
        <div style={{ display: 'flex', width: '100%', gap: 10 }}>
          <button className="btn btn-secondary btn-lg" onClick={onClose} style={{ flex: 1 }}>
            ยกเลิก (Cancel)
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={onSubmit}
            disabled={missingRequired || isLoading}
            style={{ flex: 2, height: 48, fontSize: 15, fontWeight: 600 }}
          >
            {editingItem ? 'บันทึกการแก้ไข (Update)' : 'เพิ่มลงตะกร้า (Add to Cart)'} · ฿{lineTotal.toLocaleString()}
          </button>
        </div>
      }
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
          onClick={() => onPreviewSop(detail.sop.id)}
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
            <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--matcha-800)' }}>วิธีการชง: {detail.sop.title}</div>
            <div style={{ fontSize: 11, color: 'var(--matcha-700)', marginTop: 2 }}>แตะเพื่ออ่านคู่มือ SOP →</div>
          </div>
          <IconChevRight size={16} style={{ color: 'var(--matcha-700)' }}/>
        </button>
      )}

      {detail?.recipe && detail.recipe.length > 0 && (
        <details style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
            🥄 สูตรส่วนผสม (Recipe) ({detail.recipe.length} รายการ)
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
        <div className="muted" style={{ fontSize: 13, marginBottom: 20, textAlign: 'center', padding: 20 }}>กำลังโหลดตัวเลือก... (Loading options…)</div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 20, padding: '20px', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', textAlign: 'center' }}>
          ไม่มีตัวเลือกเสริมสำหรับเมนูนี้ สามารถเพิ่มลงตะกร้าได้เลย
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
                {g.nameThai || g.name}
                {g.nameThai && g.name !== g.nameThai ? <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>· {g.name}</span> : null}
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {g.isRequired ? 'บังคับเลือก (Required)' : 'ไม่บังคับ (Optional)'}
              </span>
            </div>

            {g.selectionType === 'single' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opts.map((o) => {
                  const on = sel === o.id;
                  const p = Number(o.priceAdjustment ?? 0);
                  const isOutOfStock = isOptionOutOfStock(o);
                  return (
                    <button key={o.id}
                      onClick={() => !isOutOfStock && setSingle(g.id, o.id)}
                      disabled={isOutOfStock}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--r-default)',
                        background: on ? 'var(--matcha-50)' : 'var(--bg-surface)',
                        border: '1.5px solid ' + (on ? 'var(--matcha-600)' : 'var(--border-default)'),
                        fontSize: 14, fontWeight: 500,
                        color: isOutOfStock ? 'var(--text-tertiary)' : on ? 'var(--matcha-700)' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        transition: 'all 200ms',
                        opacity: isOutOfStock ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: '2px solid ' + (isOutOfStock ? 'var(--border-default)' : on ? 'var(--matcha-600)' : 'var(--border-emphasis)'),
                          display: 'grid', placeItems: 'center', background: 'transparent', flex: 'none'
                        }}>
                          {on && !isOutOfStock && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--matcha-600)' }}/>}
                        </span>
                        <span>
                          {o.nameThai || o.name}
                          {isOutOfStock && <span style={{ color: 'var(--red-600)', fontSize: 12, marginLeft: 8 }}>(ของหมด / Out of Stock)</span>}
                        </span>
                      </div>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--matcha-700)' : 'var(--text-secondary)' }}>
                        {p === 0 ? '฿0' : (p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {g.selectionType === 'multi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opts.map((o) => {
                  const on = sel instanceof Set && sel.has(o.id);
                  const p = Number(o.priceAdjustment ?? 0);
                  const isOutOfStock = isOptionOutOfStock(o);
                  return (
                    <button key={o.id}
                      onClick={() => !isOutOfStock && toggleMulti(g.id, o.id)}
                      disabled={isOutOfStock}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--r-default)',
                        background: on ? 'var(--matcha-50)' : 'var(--bg-surface)',
                        border: '1.5px solid ' + (on ? 'var(--matcha-600)' : 'var(--border-default)'),
                        fontSize: 14, fontWeight: 500,
                        color: isOutOfStock ? 'var(--text-tertiary)' : on ? 'var(--matcha-700)' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        transition: 'all 200ms',
                        opacity: isOutOfStock ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 4,
                          border: '2px solid ' + (isOutOfStock ? 'var(--border-default)' : on ? 'var(--matcha-600)' : 'var(--border-emphasis)'),
                          display: 'grid', placeItems: 'center', background: on && !isOutOfStock ? 'var(--matcha-600)' : 'transparent', flex: 'none'
                        }}>
                          {on && !isOutOfStock && <IconCheck size={12} style={{ color: 'white' }} stroke={3}/>}
                        </span>
                        <span>
                          {o.nameThai || o.name}
                          {isOutOfStock && <span style={{ color: 'var(--red-600)', fontSize: 12, marginLeft: 8 }}>(ของหมด / Out of Stock)</span>}
                        </span>
                      </div>
                      <span className="tabular" style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--matcha-700)' : 'var(--text-secondary)' }}>
                        {p === 0 ? '' : (p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`)}
                      </span>
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
                  const isOutOfStock = isOptionOutOfStock(o);
                  return (
                    <div key={o.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 'var(--r-default)',
                      border: '1px solid var(--border-default)',
                      background: n > 0 ? 'var(--matcha-50)' : 'var(--bg-surface)',
                      opacity: isOutOfStock && n === 0 ? 0.6 : 1,
                    }}>
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <div style={{ fontWeight: 500, color: isOutOfStock && n === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                          {o.nameThai || o.name}
                          {isOutOfStock && <span style={{ color: 'var(--red-600)', fontSize: 12, marginLeft: 8 }}>(ของหมด / Out of Stock)</span>}
                        </div>
                        {p !== 0 && <div className="muted" style={{ fontSize: 11 }}>{p > 0 ? `+฿${p}` : `−฿${Math.abs(p)}`} / ชิ้น</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => adjustQty(g.id, o.id, -1)} disabled={n <= 0} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>−</button>
                        <span className="tabular" style={{ minWidth: 18, textAlign: 'center', fontWeight: 600 }}>{n}</span>
                        <button onClick={() => adjustQty(g.id, o.id, 1)} disabled={isOutOfStock} style={{ width: 26, height: 26, borderRadius: '50%', background: isOutOfStock ? 'var(--border-default)' : 'var(--matcha-600)', color: isOutOfStock ? 'var(--text-tertiary)' : 'white', border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <Field label="คำแนะนำพิเศษ (Special instructions)">
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น หวานน้อย, ไม่ใส่น้ำแข็ง, ขอร้อนๆ" rows={3}/>
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid var(--border-default)', marginTop: 16 }}>
        <span style={{ fontWeight: 500 }}>จำนวนแก้ว / เมนู (Quantity)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px', background: 'var(--bg-muted)', borderRadius: 999 }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', cursor: 'pointer' }}>−</button>
          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, fontSize: 17 }} className="tabular">{qty}</span>
          <button onClick={() => setQty(qty + 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--matcha-600)', color: 'white', border: 'none', cursor: 'pointer' }}>+</button>
        </div>
      </div>
    </Drawer>
  );
};

// ----- Payment -----
export const PagePayment = () => {
  const { navigate, t, branch } = useApp();
  const queryClient = useQueryClient();
  const [method, setMethod] = useState(null);
  const [cash, setCash] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Dynamic parameter states for reference and slip
  const [refNum, setRefNum] = useState("");
  const [slipUrl, setSlipUrl] = useState("");

  // Manager PIN Authorization states
  const [showPinModal, setShowPinModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");

  // Split Payment states
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitPayments, setSplitPayments] = useState([]);
  const [splitAmount, setSplitAmount] = useState(0);

  const hash = location.hash.replace(/^#/, '');
  const qs = hash.includes('?') ? hash.split('?')[1] : '';
  const orderId = new URLSearchParams(qs).get('orderId');

  const { data: order } = trpc.orders.getById.useQuery(
    { id: Number(orderId) },
    { enabled: !!orderId && !isNaN(Number(orderId)) }
  );

  const session = getSession();
  const currentBranchId = session?.currentBranchId || 1;
  const currentRole = session?.role || 'staff';

  // Fetch branch-specific payment methods configuration
  const { data: branchMethods = [] } = trpc.enterprise.getBranchPaymentMethods.useQuery(
    { branchId: Number(currentBranchId) },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );

  // Filter payment methods based on isActive, isEnabledForBranch, and roleAvailability
  const methods = useMemo(() => {
    return branchMethods.filter((m) => {
      if (m.isActive === false) return false;
      if (!m.isEnabledForBranch) return false;
      if (m.roleAvailability && m.roleAvailability.length > 0) {
        if (!m.roleAvailability.includes(currentRole)) return false;
      }
      return true;
    });
  }, [branchMethods, currentRole]);

  // Fetch member profile details to calculate loyalty points balance
  const memberId = order?.memberId;
  const { data: orderMember } = trpc.members.findById.useQuery(
    { id: Number(memberId) },
    { enabled: !!memberId && !isNaN(Number(memberId)) }
  );

  const networkPrintReceipt = trpc.printing.autoPrintOnPaid.useMutation();
  const processSplitPayment = trpc.enterprise.processSplitPayment.useMutation();

  const selMethod = methods.find((x) => x.code === method);
  const { data: voucherInfo } = trpc.enterprise.lookupGiftVoucher.useQuery(
    { code: refNum, branchId: Number(currentBranchId) },
    { enabled: selMethod?.type === 'voucher' && refNum.trim().length >= 3 }
  );

  const total = Number(order?.totalAmount ?? 0);
  const splitTotalPaid = splitPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const splitRemaining = Math.max(0, total - splitTotalPaid);

  useEffect(() => {
    setPaymentSuccess(false);
    if (splitEnabled) {
      setSplitAmount(splitRemaining);
    }
  }, [method, splitEnabled, splitPayments]);

  const isConfirmDisabled = (() => {
    if (processSplitPayment.isPending) return true;
    if (splitEnabled) {
      return splitTotalPaid < total;
    }
    if (!method || !orderId) return true;
    const mObj = methods.find((x) => x.code === method);
    if (!mObj) return true;

    // Cash check
    if (mObj.type === 'cash') {
      return cash < total;
    }
    // QR check
    if (mObj.type === 'qr') {
      return !paymentSuccess;
    }
    // Reference check
    if (mObj.requiresReference && !refNum) return true;
    if (mObj.type === 'voucher') {
      if (!refNum || !voucherInfo?.valid) return true;
      const payAmt = splitEnabled ? splitAmount : total;
      if (payAmt > (voucherInfo?.balance ?? 0)) return true;
    }
    // Slip upload check
    if (mObj.requiresSlipUpload && !slipUrl) return true;
    // Loyalty point check
    if (mObj.type === 'loyalty') {
      if (!orderMember) return true;
      const pointsNeeded = total / (Number(branch?.loyaltyRedeemRate ?? 1.0));
      if (orderMember.points < pointsNeeded) return true;
    }
    return false;
  })();

  const confirmPayment = async () => {
    // 1. PIN verification check
    const requiresPin = splitEnabled
      ? splitPayments.some(sp => {
          const mObj = methods.find(m => m.id === sp.methodId);
          return mObj?.requiresManagerPin;
        })
      : (() => {
          const mObj = methods.find(m => m.code === method);
          return mObj?.requiresManagerPin;
        })();

    if (requiresPin && !managerPin) {
      setShowPinModal(true);
      return;
    }

    await submitPayment(managerPin);
  };

  const submitPayment = async (enteredPin) => {
    if (!orderId) { alert('No order selected'); return; }
    const auto = getAutomation();
    const sess = getSession();
    const branchId = sess?.currentBranchId || 1;

    try {
      let paymentsPayload = [];

      if (splitEnabled) {
        paymentsPayload = splitPayments.map(p => ({
          paymentMethodId: p.methodId,
          amount: String(p.amount),
          referenceNumber: p.referenceNumber,
          slipImageUrl: p.slipImageUrl,
        }));
      } else {
        const mObj = methods.find((x) => x.code === method);
        if (!mObj) { alert('Select a payment method'); return; }
        if (mObj.type === 'qr' && !paymentSuccess) {
          alert('Please scan the QR code and complete the payment first.');
          return;
        }

        paymentsPayload = [{
          paymentMethodId: mObj.id,
          amount: String(total),
          referenceNumber: refNum || undefined,
          slipImageUrl: slipUrl || undefined,
        }];
      }

      await processSplitPayment.mutateAsync({
        orderId: Number(orderId),
        managerPin: enteredPin || undefined,
        payments: paymentsPayload,
      });

      // Network auto-print / open drawer trigger
      try {
        const lastSelected = splitEnabled
          ? methods.find((x) => x.id === splitPayments[splitPayments.length - 1]?.methodId)
          : methods.find((x) => x.code === method);
        if (auto.autoPrintReceipt || (auto.autoOpenCashDrawer && lastSelected?.type === 'cash')) {
          networkPrintReceipt.mutate({
            orderId: Number(orderId),
            branchId,
            openDrawer: !!(auto.autoOpenCashDrawer && lastSelected?.type === 'cash'),
          });
        }
      } catch (err) {
        console.warn('Network auto-print failed:', err);
      }

      queryClient.invalidateQueries({ queryKey: [['inventory']] });
      queryClient.invalidateQueries({ queryKey: [['orders']] });
      navigate(`/pos/receipt?orderId=${orderId}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const isAddSplitDisabled = (() => {
    if (!method || splitAmount <= 0 || splitAmount > splitRemaining) return true;
    const sel = methods.find(x => x.code === method);
    if (!sel) return true;
    if (sel.requiresReference && !refNum) return true;
    if (sel.requiresSlipUpload && !slipUrl) return true;
    if (sel.type === 'loyalty') {
      if (!orderMember) return true;
      const pointsNeeded = splitAmount / (Number(branch?.loyaltyRedeemRate ?? 1.0));
      if (orderMember.points < pointsNeeded) return true;
    }
    return false;
  })();

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

      {/* Split payment toggle */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600 }}>ชำระเงินแบบแยกจ่าย (Split Payment)</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>รองรับการจ่ายเงินแยกยอดตามวิธีต่าง ๆ เช่น เงินสดร่วมกับการโอนสแกน QR</div>
        </div>
        <Toggle checked={splitEnabled} onChange={(v) => {
          setSplitEnabled(v);
          setSplitPayments([]);
          setMethod(null);
          setRefNum('');
          setSlipUrl('');
        }}/>
      </div>

      {splitEnabled && (
        <>
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div className="t-h4" style={{ fontWeight: 600, marginBottom: 12 }}>เพิ่มรายการยอดแบ่งจ่าย (Add Split Slot)</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>เลือกประเภทการชำระ</label>
                <select value={method || ''} onChange={e => { setMethod(e.target.value || null); setRefNum(''); setSlipUrl(''); }} className="input">
                  <option value="">เลือกวิธีชำระ...</option>
                  {methods.map(m => (
                    <option key={m.id} value={m.code}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>จำนวนเงิน (฿)</label>
                <input 
                  type="number" 
                  value={splitAmount || ''} 
                  onChange={e => setSplitAmount(Number(e.target.value))} 
                  className="input"
                />
              </div>
            </div>

            {method && (() => {
              const sel = methods.find(x => x.code === method);
              if (!sel) return null;
              
              const pointsNeeded = sel.type === 'loyalty' ? (splitAmount / (Number(branch?.loyaltyRedeemRate ?? 1.0))) : 0;
              const hasInsufficientPoints = sel.type === 'loyalty' && (!orderMember || orderMember.points < pointsNeeded);

              return (
                <div style={{ marginTop: 12, borderTop: '1px dashed var(--border-default)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {sel.type === 'loyalty' && (
                    <div style={{ padding: 12, borderRadius: 6, background: hasInsufficientPoints ? 'rgba(239,68,68,0.06)' : 'var(--matcha-50)', border: '1px solid ' + (hasInsufficientPoints ? 'rgba(239,68,68,0.2)' : 'var(--matcha-200)') }}>
                      {!orderMember ? (
                        <div style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 500 }}>⚠️ วิธีการชำระเงินนี้ต้องเลือกสมาชิก (Loyalty points require a member profile)</div>
                      ) : (
                        <div style={{ fontSize: 13 }}>
                          <div>สมาชิก: <strong>{orderMember.firstName ? `${orderMember.firstName} ${orderMember.lastName || ''}` : orderMember.phone}</strong></div>
                          <div>คะแนนสะสม: <strong className="tabular">{orderMember.points} คะแนน</strong></div>
                          <div>คะแนนที่ต้องใช้: <strong className="tabular">{pointsNeeded.toFixed(1)} คะแนน</strong> (อัตรา {Number(branch?.loyaltyRedeemRate ?? 1.0)} ฿/คะแนน)</div>
                          {hasInsufficientPoints && (
                            <div style={{ color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>⚠️ คะแนนสะสมไม่เพียงพอ</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {sel.requiresReference && (
                    <Field label="หมายเลขอ้างอิงการชำระเงิน / Authorization Code" required>
                      <input 
                        className="input" 
                        value={refNum} 
                        onChange={(e) => setRefNum(e.target.value)} 
                        placeholder="กรอกหมายเลขอ้างอิง"
                      />
                    </Field>
                  )}

                  {sel.requiresSlipUpload && (
                    <Field label="ลิงก์รูปภาพสลิปการโอนเงิน (Slip Image URL)" required>
                      <input 
                        className="input" 
                        value={slipUrl} 
                        onChange={(e) => setSlipUrl(e.target.value)} 
                        placeholder="กรอก URL สลิป หรืออ้างอิงสลิป"
                      />
                    </Field>
                  )}
                </div>
              );
            })()}
            
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                if (!method) { alert("กรุณาเลือกช่องทางชำระเงิน"); return; }
                const sel = methods.find(x => x.code === method);
                if (splitAmount <= 0) { alert("จำนวนเงินต้องมากกว่า 0"); return; }
                if (splitAmount > splitRemaining) { alert("กรอกยอดเกินจำนวนเงินที่เหลืออยู่"); return; }
                
                setSplitPayments([
                  ...splitPayments,
                  {
                    methodId: sel.id,
                    code: sel.code,
                    name: sel.name,
                    amount: splitAmount,
                    referenceNumber: sel.requiresReference ? refNum : undefined,
                    slipImageUrl: sel.requiresSlipUpload ? slipUrl : undefined,
                    reference: `Split payment: ${sel.name} - ฿${splitAmount} ${refNum ? `(Ref: ${refNum})` : ''}`
                  }
                ]);
                setMethod(null);
                setRefNum('');
                setSlipUrl('');
              }}
              disabled={isAddSplitDisabled}
            >
              ➕ บันทึกส่วนแบ่งจ่าย
            </button>
          </div>

          {splitPayments.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>รายการยอดชำระที่สะสม ({splitPayments.length})</div>
              {splitPayments.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-muted)', marginBottom: 6, borderRadius: 6, alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.referenceNumber && <div className="muted" style={{ fontSize: 11 }}>Ref: {p.referenceNumber}</div>}
                    {p.slipImageUrl && <div className="muted" style={{ fontSize: 11 }}>Slip: {p.slipImageUrl}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontWeight: 700 }} className="tabular">฿{p.amount.toLocaleString()}</span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: '#ef4444', padding: 4 }}
                      onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== idx))}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid var(--border-default)', paddingTop: 10, fontWeight: 700 }}>
                <span>รวมยอดชำระแล้ว</span>
                <span className="tabular">฿{splitTotalPaid.toLocaleString()} / ฿{total.toLocaleString()}</span>
              </div>
              {splitRemaining > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: 'var(--danger)', fontSize: 13 }}>
                  <span>ยอดเงินค้างชำระ</span>
                  <span className="tabular">ยังขาดอีก ฿{splitRemaining.toLocaleString()}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: 'var(--matcha-700)', fontSize: 13, fontWeight: 600 }}>
                  <span>ครบยอดชำระแล้ว</span>
                  <span>พร้อมสำหรับการยืนยัน</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!splitEnabled && (
        <>
          {/* Methods */}
          {/* Group payment methods by type */}
          {['cash', 'qr', 'card', 'transfer', 'voucher', 'loyalty', 'billing', 'credit', 'delivery_platform'].map((groupType) => {
            const groupMethods = methods.filter((m) => m.type === groupType);
            if (groupMethods.length === 0) return null;
            const groupLabel = {
              cash: '💵 Cash',
              qr: '📱 QR Code',
              card: '💳 Card (EDC)',
              transfer: '🏦 Bank Transfer',
              voucher: '🎟️ Voucher / Gift Card',
              loyalty: '⭐ Loyalty Points',
              billing: '🏢 Corporate Billing',
              credit: '💳 Franchise Credit',
              delivery_platform: '🛵 Delivery Platform'
            }[groupType] || groupType;
            return (
              <div key={groupType} style={{ marginBottom: 14 }}>
                <div className="t-caption" style={{ marginBottom: 8 }}>{groupLabel}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }} className="pay-methods">
                  {groupMethods.map((m) => {
                    const I = m.type === 'cash' ? IconCoin : m.type === 'qr' ? IconQR : m.type === 'card' ? IconWallet : (m.type === 'delivery_platform' ? IconLeaf : IconDiscount);
                    const active = method === m.code;
                    return (
                      <button key={m.id} onClick={() => { setMethod(m.code); setRefNum(''); setSlipUrl(''); }} style={{
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
            if (!sel) return null;
            const type = sel.type;
            return <>
              {type === 'cash' && (
                <div className="card anim-fade" style={{ padding: 24 }}>
                  <div className="t-h4" style={{ fontWeight: 600, marginBottom: 14 }}>รับเงินสด (Cash Received)</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', marginBottom: 16,
                    background: 'var(--bg-muted)', borderRadius: 'var(--r-default)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>จำนวนเงินที่รับ (Amount received)</span>
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
                        <div className="muted" style={{ fontSize: 12 }}>ยอดที่ต้องชำระ (Order total)</div>
                        <div className="tabular" style={{ fontSize: 22, fontWeight: 600 }}>฿{total.toLocaleString()}</div>
                      </div>
                      <div style={{
                        padding: 18, borderRadius: 'var(--r-default)',
                        background: (cash >= total) ? 'var(--matcha-50)' : 'rgba(239,68,68,0.06)',
                        border: '1.5px solid ' + ((cash >= total) ? 'var(--matcha-500)' : 'rgba(239,68,68,0.2)'),
                      }}>
                        <div style={{ fontSize: 12, color: cash >= total ? 'var(--matcha-700)' : 'var(--danger)', fontWeight: 500 }}>
                          {cash >= total ? 'เงินทอน (Change due)' : 'ยังขาดอีก (Still needed)'}
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
                <QRPaymentSection
                  orderId={Number(orderId)}
                  total={total}
                  methodName={sel.name}
                  paymentSuccess={paymentSuccess}
                  setPaymentSuccess={setPaymentSuccess}
                />
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
                  <div style={{ padding: 14, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', marginBottom: 16 }}>
                    <div className="mono" style={{ fontSize: 13, lineHeight: 1.7 }}>
                      <div><strong>Bank:</strong> SCB</div>
                      <div><strong>Account:</strong> 123-4-56789-0</div>
                      <div><strong>Name:</strong> Hibi Matcha Co., Ltd.</div>
                      <div><strong>Amount:</strong> ฿{total.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
              {type === 'voucher' && (
                <div className="card anim-fade" style={{ padding: 24 }}>
                  <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>{sel.name}</div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Enter voucher/gift card code. Balance will be deducted on payment.</div>
                  <input
                    className="input"
                    placeholder="Voucher code"
                    value={refNum}
                    onChange={(e) => setRefNum(e.target.value.toUpperCase())}
                    style={{ marginBottom: 12, fontFamily: 'monospace', letterSpacing: 2 }}
                  />
                  {refNum.length >= 3 && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: voucherInfo?.valid ? 'var(--matcha-700)' : 'var(--danger)' }}>
                      {voucherInfo?.valid
                        ? `Balance: ฿${Number(voucherInfo.balance).toLocaleString()}`
                        : 'Invalid or expired code'}
                    </div>
                  )}
                </div>
              )}
              {type === 'loyalty' && (
                <div className="card anim-fade" style={{ padding: 24 }}>
                  <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>⭐ {sel.name}</div>
                  {!orderMember ? (
                    <div style={{ color: 'var(--danger)', padding: 12, background: 'rgba(239,68,68,0.06)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', fontWeight: 500 }}>
                      ⚠️ วิธีการชำระเงินนี้ต้องเลือกสมาชิก (Loyalty points require a member profile)
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>กรุณาเลือกหรือสมัครสมาชิกในหน้าคำสั่งซื้อก่อนชำระเงิน</div>
                    </div>
                  ) : (() => {
                    const pointsNeeded = total / (Number(branch?.loyaltyRedeemRate ?? 1.0));
                    const hasInsufficient = orderMember.points < pointsNeeded;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ padding: 16, background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', border: '1px solid var(--border-default)' }}>
                          <div>สมาชิก: <strong>{orderMember.firstName ? `${orderMember.firstName} ${orderMember.lastName || ''}` : orderMember.phone}</strong></div>
                          <div>คะแนนสะสมที่มี: <strong className="tabular">{orderMember.points} คะแนน</strong></div>
                          <div style={{ marginTop: 6, borderTop: '1px solid var(--border-default)', paddingTop: 6 }}>
                            คะแนนที่ต้องชำระ: <strong className="tabular">{pointsNeeded.toFixed(1)} คะแนน</strong>
                          </div>
                        </div>
                        {hasInsufficient && (
                          <div style={{ color: 'var(--danger)', fontWeight: 600, padding: 10, background: 'rgba(239,68,68,0.06)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                            ⚠️ คะแนนสะสมไม่เพียงพอสำหรับการชำระเงินรายการนี้
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              {['billing', 'credit'].includes(type) && (
                <div className="card anim-fade" style={{ padding: 24 }}>
                  <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>🏢 {sel.name}</div>
                  <div style={{ padding: 16, background: 'var(--matcha-50)', borderRadius: 'var(--r-default)', color: 'var(--matcha-800)', fontSize: 13, fontWeight: 500 }}>
                    บัญชีคู่ค้า / วงเงินล่วงหน้า (Corporate Billing / Franchise Credit)
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>
                      ยอดชำระนี้จะถูกตั้งค้างชำระในบัญชีลูกหนี้การค้า (Accounts Receivable) ของลูกค้าในระบบโดยอัตโนมัติ
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic references and slip uploads */}
              {sel && (sel.requiresReference || sel.requiresSlipUpload) && (
                <div className="card anim-fade" style={{ padding: 24, marginTop: 16 }}>
                  <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>ข้อมูลอ้างอิงการชำระเงิน (Reference / Slip Details)</div>
                  {sel.requiresReference && (
                    <Field label="เลขที่อ้างอิง / Authorization Code" required>
                      <input 
                        className="input" 
                        value={refNum} 
                        onChange={(e) => setRefNum(e.target.value)} 
                        placeholder="กรอกหมายเลขอ้างอิงเพื่อใช้ตรวจสอบภายหลัง"
                      />
                    </Field>
                  )}
                  {sel.requiresSlipUpload && (
                    <Field label="ลิงก์รูปสลิปการโอนเงิน (Slip Image URL)" required>
                      <input 
                        className="input" 
                        value={slipUrl} 
                        onChange={(e) => setSlipUrl(e.target.value)} 
                        placeholder="กรอก URL สลิป หรือใช้วิธีอัพโหลด"
                      />
                    </Field>
                  )}
                </div>
              )}
            </>;
          })()}
        </>
      )}

      {/* Bottom bar */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn btn-secondary btn-lg" onClick={() => navigate('/pos')} style={{ flex: 1 }}>← {t('payment.backToOrder')}</button>
        <button
          className="btn btn-primary btn-lg"
          onClick={confirmPayment}
          disabled={isConfirmDisabled}
          style={{ flex: 2 }}
        >
          {processSplitPayment.isPending ? `${t('loading')}` : <>{t('payment.pay')} · ฿{total.toLocaleString()} <IconCheck size={16}/></>}
        </button>
      </div>

      {/* Modal: Manager security PIN verification */}
      <Modal 
        open={showPinModal} 
        onClose={() => { setShowPinModal(false); setManagerPin(""); }}
        title="Manager PIN Authorization"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowPinModal(false); setManagerPin(""); }}>Cancel</button>
          <button className="btn btn-primary" disabled={managerPin.length !== 4} onClick={async () => {
            const pinToSubmit = managerPin;
            setShowPinModal(false);
            setManagerPin("");
            await submitPayment(pinToSubmit);
          }}>Confirm PIN & Pay</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            This checkout transaction requires Manager or Admin authorization. Please enter the 4-digit security PIN.
          </p>
          <input
            type="password"
            maxLength={4}
            className="input"
            style={{ fontSize: 28, letterSpacing: '0.8em', textAlign: 'center', fontWeight: 600 }}
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

// ----- QR Payment Section (real PromptPay QR) -----
const QRPaymentSection = ({ orderId, total, methodName, paymentSuccess, setPaymentSuccess }) => {
  const { navigate, t } = useApp();
  const queryClient = useQueryClient();
  const generateQr = trpc.orders.generatePaymentQr.useMutation();
  const simulatePayment = trpc.orders.simulatePaymentWebhook.useMutation();
  const utils = trpc.useUtils();

  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [pollingActive, setPollingActive] = useState(true);

  useEffect(() => {
    if (orderId && total > 0) {
      generateQr.mutateAsync({ orderId, amount: total })
        .then((res) => { if (res?.qrDataUrl) setQrDataUrl(res.qrDataUrl); })
        .catch((e) => console.warn('QR generation failed:', e));
    }
  }, [orderId, total]);

  // Polling logic
  useEffect(() => {
    if (!orderId || !pollingActive || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await utils.client.orders.checkPaymentStatus.query({ orderId });
        if (res?.paid) {
          setPaymentSuccess(true);
          setPollingActive(false);
          clearInterval(interval);
          
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: [['inventory']] });
            queryClient.invalidateQueries({ queryKey: [['orders']] });
            navigate(`/pos/receipt?orderId=${orderId}`);
          }, 1500);
        }
      } catch (err) {
        console.warn('Payment check failed:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, pollingActive, paymentSuccess, utils, queryClient, navigate]);

  const handleSimulatePayment = async () => {
    try {
      await simulatePayment.mutateAsync({ orderId });
      const res = await utils.client.orders.checkPaymentStatus.query({ orderId });
      if (res?.paid) {
        setPaymentSuccess(true);
        setPollingActive(false);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [['inventory']] });
          queryClient.invalidateQueries({ queryKey: [['orders']] });
          navigate(`/pos/receipt?orderId=${orderId}`);
        }, 1500);
      }
    } catch (err) {
      alert(err.message || 'Simulation failed');
    }
  };

  return (
    <div className="card anim-fade" style={{ padding: 32, textAlign: 'center' }}>
      {paymentSuccess ? (
        <div style={{ padding: '24px 0' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--matcha-50)', color: 'var(--matcha-700)',
            display: 'grid', placeItems: 'center', margin: '0 auto 16px',
            fontSize: 36, animation: 'pulse 1.5s ease-in-out infinite'
          }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--matcha-700)' }}>ชำระเงินสำเร็จแล้ว! (Payment Verified!)</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>กำลังนำท่านไปยังหน้าใบเสร็จ... (Redirecting to receipt...)</div>
        </div>
      ) : (
        <>
          <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>สแกนเพื่อชำระเงินด้วย {methodName} (Scan to pay)</div>
          
          <div style={{ display: 'inline-block', position: 'relative', padding: 20, background: 'white', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="PromptPay QR" style={{ width: 220, height: 220, display: 'block' }}/>
            ) : generateQr.isPending ? (
              <div style={{ width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }}/>
                  <div className="muted" style={{ fontSize: 12 }}>กำลังสร้าง QR Code... (Generating QR...)</div>
                </div>
              </div>
            ) : (
              <RealQR value={`https://hibimatcha.com/pay?orderId=${orderId}&amount=${total}`} size={220}/>
            )}
            {qrDataUrl && (
              <div style={{ position: 'absolute', left: 20, right: 20, top: 20, height: 220, overflow: 'hidden', borderRadius: 8, pointerEvents: 'none' }}>
                <div style={{ height: 2, width: '100%', background: 'linear-gradient(90deg, transparent, var(--matcha-500), transparent)', animation: 'scanline 2.4s linear infinite' }}/>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, color: 'var(--matcha-600)', fontSize: 13, fontWeight: 500 }}>
            <span className="spinner-xs"/>
            <span>กำลังตรวจสอบสถานะการชำระเงินอัตโนมัติ... (Auto-verifying payment status...)</span>
          </div>
          
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>แสดงสิ่งนี้ให้ลูกค้าสแกน · ยอดชำระ ฿{total.toLocaleString()} (Show this to customer)</div>

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSimulatePayment}
              disabled={simulatePayment.isPending}
            >
              ⚡ จำลองการสแกน QR (Simulate QR Scan)
            </button>
          </div>

          {generateQr.isError && (
            <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 12 }}>
              สร้าง QR Code ไม่สำเร็จ กรุณาตั้งค่าพร้อมเพย์ในระบบหลังบ้านก่อน
              <br/>(QR generation failed. Please configure PromptPay in Backoffice → Settings → Payment.)
            </div>
          )}
        </>
      )}
    </div>
  );
};

const RealQR = ({ value, size = 200, className = "" }) => {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { margin: 1, width: size })
      .then(setQrUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [value, size]);

  if (!qrUrl) {
    return (
      <div style={{ width: size, height: size, display: 'grid', placeItems: 'center' }} className={className}>
        <span className="spinner-xs"/>
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt="QR Code"
      style={{ width: size, height: size, display: 'block', borderRadius: 4 }}
      className={className}
    />
  );
};

// ----- Receipt -----
export const PageReceipt = () => {
  const { navigate, t } = useApp();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [paperSize, setPaperSize] = useState('80mm'); // 80mm, 58mm, A4
  const utils = trpc.useUtils();
  const [printLoading, setPrintLoading] = useState(null); // 'receipt'|'labels'|'kitchen'|null

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
    const isPaid = order.payments && order.payments.some(p => p.status === 'completed');
    const headerTitle = isPaid ? 'ใบเสร็จรับเงิน (Receipt)' : 'ใบแจ้งยอดชำระ (Bill/Invoice)';
    const subtotalExcludingVat = Number(order.totalAmount ?? 0) - Number(order.taxAmount ?? 0);
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
  .qr { text-align: center; margin: 8px 0; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&family=Noto+Sans+Thai:wght@400;700&display=swap" rel="stylesheet">
</head><body>
<div class="receipt">
  <div class="center header">${headerTitle}</div>
  <div class="center small">ひびマッチャ · hibi MATCHA</div>
  <div class="center small">${orderDate} · ${orderTime}</div>
  <div class="center small">${order.orderNumber} · ${order.orderType || 'dine-in'}${order.tableNumber ? ' · Table ' + order.tableNumber : ''}</div>
  <div class="sep"></div>
  ${items}
  <div class="sep"></div>
  <div class="row"><span>Subtotal</span><span>฿${subtotalExcludingVat.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
  ${Number(order.discountAmount) > 0 ? `<div class="row"><span>Discount</span><span>-฿${Number(order.discountAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>` : ''}
  <div class="row"><span>VAT 7%</span><span>฿${Number(order.taxAmount ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
  <div class="sep"></div>
  <div class="row bold big"><span>Total</span><span>฿${Number(order.totalAmount ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
  
  ${order.paymentQrPayload && !isPaid ? `
    <div class="sep"></div>
    <div class="center bold">สแกนเพื่อชำระเงิน (Scan to Pay)</div>
    <div class="qr"><img src="${order.paymentQrPayload}" style="width: 150px; height: 150px; display: block; margin: 8px auto 0;" /></div>
  ` : ''}

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

  const handleServerPrint = async (type) => {
    if (!orderId) return;
    setPrintLoading(type);
    try {
      const payload = await utils.client.orders.getPrintPayload.query({ orderId: Number(orderId), type });
      if (payload?.html) {
        const w = window.open('', '_blank', 'width=420,height=700');
        if (!w) { alert('Popup blocked — please allow popups'); return; }
        w.document.write(payload.html);
        w.document.close();
      }
    } catch (e) {
      alert('พิมพ์ไม่สำเร็จ: ' + (e.message || 'Unknown error'));
    } finally {
      setPrintLoading(null);
    }
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
                  <RealQR value={`https://hibimatcha.com/review?branchId=${order?.branchId ?? 1}&orderId=${order?.id ?? ''}`} size={96}/>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Scan to leave a review</div>
                <div className="jp" style={{ fontSize: 14, marginTop: 12, fontWeight: 500 }}>ありがとうございます</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Thank you · ขอบคุณค่ะ</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
              <button
                className="btn btn-secondary"
                onClick={() => handleServerPrint('receipt')}
                disabled={printLoading === 'receipt'}
              ><IconPrint size={16}/> {printLoading === 'receipt' ? 'กำลังโหลด...' : 'ใบเสร็จ + QR'}</button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowPrintModal(true)}
              ><IconPrint size={16}/> ใบเสร็จ (กำหนดขนาด)</button>
              <button
                className="btn btn-secondary"
                onClick={() => handleServerPrint('labels')}
                disabled={printLoading === 'labels'}
              >🏷️ {printLoading === 'labels' ? 'กำลังโหลด...' : 'ป้ายติดแก้ว'}</button>
              <button
                className="btn btn-secondary"
                onClick={() => handleServerPrint('kitchen_ticket')}
                disabled={printLoading === 'kitchen_ticket'}
              >🍵 {printLoading === 'kitchen_ticket' ? 'กำลังโหลด...' : 'ใบครัว'}</button>
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
  const [station, setStation] = useState('all');
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('kitchen_sound') !== 'false');
  const prevPendingRef = useRef(0);

  const stationParam = station === 'All' ? undefined : station.toLowerCase();

  const { data: tickets = [], refetch } = trpc.kitchen.listTickets.useQuery(
    { branchId: branchId ?? 0, station: stationParam },
    { enabled: !!branchId, refetchInterval: 10000 }
  );

  const pendingCount = tickets.filter((tk) => tk.status === 'pending').length;
  useEffect(() => {
    if (soundOn && pendingCount > prevPendingRef.current && prevPendingRef.current > 0) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch (_) { /* ignore */ }
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount, soundOn]);

  const markPreparing = trpc.kitchen.markPreparing.useMutation({ onSuccess: () => refetch() });
  const markReady = trpc.kitchen.markReady.useMutation({ onSuccess: () => refetch() });
  const markServed = trpc.kitchen.markServed.useMutation({ onSuccess: () => refetch() });

  const inQueue = tickets.filter((t) => t.status === 'pending').length;
  const readyCount = tickets.filter((t) => t.status === 'ready').length;

  return (
    <div style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Drinks', 'Food', 'Desserts'].map((label) => (
            <button
              key={label}
              type="button"
              className={station === label ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => setStation(label)}
            >{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Stat label="In queue" value={String(inQueue)} color="var(--matcha-700)"/>
          <span style={{ width: 1, height: 28, background: 'var(--border-default)' }}/>
          <Stat label="Ready" value={String(readyCount)}/>
          <span style={{ width: 1, height: 28, background: 'var(--border-default)' }}/>
          <Toggle label="Sound" checked={soundOn} onChange={(v) => { setSoundOn(v); localStorage.setItem('kitchen_sound', String(v)); }}/>
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
  const utils = trpc.useUtils();
  const [printLoading, setPrintLoading] = useState(false);
  const updateStatusMut = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['orders']] });
      alert("อัปเดตสถานะออเดอร์สำเร็จ");
      setOpenOrderId(null);
    },
    onError: (err) => {
      alert("ผิดพลาด: " + err.message);
    }
  });

  const handleVoidRefund = (id) => {
    const reason = prompt("ระบุเหตุผลการยกเลิก/คืนเงิน (Reason for Void/Refund):");
    if (reason === null) return;
    updateStatusMut.mutate({ id, status: "cancelled", notes: reason });
  };

  const handlePrint = async (orderId, type = 'receipt') => {
    setPrintLoading(true);
    try {
      const payload = await utils.client.orders.getPrintPayload.query({ orderId, type });
      if (payload?.html) {
        const w = window.open('', '_blank', 'width=380,height=600');
        if (w) {
          w.document.write(payload.html);
          w.document.close();
        }
      }
    } catch (e) {
      alert('Print failed: ' + (e.message || 'Unknown'));
    } finally {
      setPrintLoading(false);
    }
  };

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
                        <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => handlePrint(o.id, 'receipt')} title="พิมพ์ใบเสร็จย้อนหลัง (Reprint Receipt)"><IconPrint size={14}/></button>
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

      <Drawer
        open={!!openOrderId}
        onClose={() => setOpenOrderId(null)}
        title={openOrder ? openOrder.orderNumber : 'Order'}
        width={560}
        footer={openOrder && (
          <div style={{ display: 'flex', gap: 12, width: '100%', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => handlePrint(openOrder.id, 'receipt')}
                disabled={printLoading}
              >
                <IconPrint size={16}/> {printLoading ? 'กำลังพิมพ์...' : 'พิมพ์ใบเสร็จย้อนหลัง (Reprint Receipt)'}
              </button>
              {openOrder.status !== 'cancelled' && openOrder.status !== 'refunded' && (
                <button
                  className="btn"
                  style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                  onClick={() => handleVoidRefund(openOrder.id)}
                  disabled={updateStatusMut.isPending}
                >
                  Void / Refund
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setOpenOrderId(null)}
            >
              ปิด (Close)
            </button>
          </div>
        )}
      >
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

  const { data: branchMethods = [] } = trpc.enterprise.getBranchPaymentMethods.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId }
  );
  const defaultPaymentMethodId = branchMethods.find((m) => m.type === 'cash')?.id
    ?? branchMethods[0]?.id;

  const markPaid = trpc.orders.markPaid.useMutation({
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: [['inventory']] });
    },
  });
  const utils = trpc.useUtils();
  const networkPrintOnPaid = trpc.printing.autoPrintOnPaid.useMutation();

  const handleMarkPaid = async (orderId) => {
    if (!window.confirm('Mark this order as paid?')) return;
    if (!defaultPaymentMethodId) {
      alert('No payment method configured for this branch');
      return;
    }
    try {
      await markPaid.mutateAsync({ orderId, paymentMethodId: defaultPaymentMethodId });
      networkPrintOnPaid.mutate({ orderId, branchId: branchId || 1, openDrawer: true });
    } catch (e) {
      alert('Failed: ' + (e.message || 'Unknown error'));
    }
  };

  const handlePrint = async (orderId, type) => {
    try {
      const payload = await utils.client.orders.getPrintPayload.query({ orderId, type });
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
