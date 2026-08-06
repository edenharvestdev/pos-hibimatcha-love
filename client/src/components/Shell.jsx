// ============================================
// Shell: Sidebar + Topbar + Theme + Role Switcher
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as Icons from "@/icons";
import { IconBell,IconBook,IconBox,IconBrand,IconBuilding,IconCategories,IconCheck,IconCheckCircle,IconCheckList,IconChevDown,IconChevLeft,IconChevRight,IconChevUp,IconCommand,IconDiscount,IconFlag,IconFranchise,IconGrid,IconHelp,IconHome,IconInventory,IconKitchen,IconMenu,IconMenuLines,IconMoon,IconOptions,IconOrders,IconPOS,IconPayment,IconPlus,IconPrint,IconReceipt,IconRefresh,IconReports,IconScanner,IconSearch,IconSettings,IconShare,IconStaff,IconSun,IconSupplier,IconTruck,IconUser,IconX,IconTrash,IconInfo } from "@/icons";
import {
  useApp, AppCtx, useToast, ToastProvider,
  Drawer, Modal,
  Field, Select, Toggle, Checkbox, Tabs,
  SearchInput, TopActionBar, BulkActionBar, EmptyState,
  StatCard, Placeholder, SectionHeader,
  CountUp, Avatar, Sparkline, BarChart,
} from "@/components";
import { getSession, clearSession } from "@/lib/authStore";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { BRAND_NAME } from '@/lib/brand';

// Icon registry — replaces window[iconName] lookup
const I = Icons;

// NAV uses i18n keys — resolved at render time via t()
const NAV = [
  {
    labelKey: 'nav.dashboard', items: [
      { path: '/backoffice', icon: 'IconHome', labelKey: 'nav.dashboard', shortcut: '⌘1' },
      { path: '/backoffice/distribute', icon: 'IconShare', labelKey: 'nav.distribute', roles: ['super'] },
    ]
  },
  {
    labelKey: 'nav.menu', roles: ['super', 'admin'], items: [
      { path: '/backoffice/menu', icon: 'IconMenu', labelKey: 'nav.menu' },
      { path: '/backoffice/categories', icon: 'IconCategories', labelKey: 'nav.categories' },
      { path: '/backoffice/options', icon: 'IconOptions', labelKey: 'nav.options' },
      { path: '/backoffice/discounts', icon: 'IconDiscount', labelKey: 'nav.discounts' },
      { path: '/backoffice/payments/methods', icon: 'IconPayment', labelKey: 'nav.payments' },
      { path: '/backoffice/payments/permissions', icon: 'IconCheckCircle', labelKey: 'nav.paymentPermissions' },
      { path: '/backoffice/payments/settlements', icon: 'IconReceipt', labelKey: 'nav.settlementReconciliation' },
      { path: '/backoffice/orders', icon: 'IconOrders', labelKey: 'nav.orders' },
      { path: '/backoffice/delivery', icon: 'IconTruck', labelKey: 'nav.delivery' },
      { path: '/backoffice/reports', icon: 'IconReports', labelKey: 'nav.reports' },
      { path: '/backoffice/pnl', icon: 'IconReports', labelKey: 'nav.pnl', roles: ['super', 'admin'] },
      { path: '/backoffice/kpi', icon: 'IconStaff', labelKey: 'nav.kpi', roles: ['super', 'admin'] },
    ]
  },
  {
    labelKey: 'nav.inventory', roles: ['super', 'admin'], items: [
      { path: '/backoffice/inventory', icon: 'IconInventory', labelKey: 'nav.inventory' },
      { path: '/backoffice/inventory/items', icon: 'IconBox', labelKey: 'inventory.allStock' },
      { path: '/backoffice/inventory/receiving', icon: 'IconTruck', labelKey: 'inventory.stockIn' },
      { path: '/backoffice/inventory/count', icon: 'IconCheckList', labelKey: 'inventory.adjustStock' },
      { path: '/backoffice/inventory/forecast', icon: 'IconInfo', labelKey: 'nav.forecast' },
      { path: '/backoffice/inventory/count-session', icon: 'IconCheckList', labelKey: 'nav.countSession' },
      { path: '/backoffice/waste', icon: 'IconTrash', labelKey: 'nav.waste' },
      { path: '/backoffice/inventory/transfer', icon: 'IconShare', labelKey: 'inventory.transfer' },
      { path: '/backoffice/inventory/movements', icon: 'IconRefresh', labelKey: 'inventory.movements' },
      { path: '/backoffice/requisitions', icon: 'IconReceipt', labelKey: 'nav.requisitions' },
      { path: '/backoffice/production', icon: 'IconKitchen', labelKey: 'nav.production' },
    ]
  },
  {
    labelKey: 'nav.suppliers', roles: ['super', 'admin'], items: [
      { path: '/backoffice/suppliers', icon: 'IconSupplier', labelKey: 'nav.suppliers' },
      { path: '/backoffice/purchase-orders', icon: 'IconReceipt', labelKey: 'requisitions.title', badge: 4 },
      { path: '/backoffice/expense-receipts', icon: 'IconReceipt', labelKey: 'expenses.title' },
      { path: '/backoffice/inventory-lots', icon: 'IconBox', labelKey: 'nav.inventoryLots' },
      { path: '/backoffice/documents', icon: 'IconExport', labelKey: 'export' },
    ]
  },
  {
    labelKey: 'nav.sop', items: [
      { path: '/backoffice/sop', icon: 'IconBook', labelKey: 'sop.library' },
    ]
  },
  {
    labelKey: 'nav.crm', roles: ['super', 'admin'], items: [
      { path: '/backoffice/customers', icon: 'IconUser', labelKey: 'nav.customers360' },
      { path: '/backoffice/customers/segments', icon: 'IconCategories', labelKey: 'nav.segments' },
    ]
  },
  {
    labelKey: 'nav.accounting', roles: ['super', 'admin'], items: [
      { path: '/backoffice/accounting/cashflow', icon: 'IconReports', labelKey: 'nav.cashflow' },
      { path: '/backoffice/accounting/ap', icon: 'IconReceipt', labelKey: 'nav.ap' },
      { path: '/backoffice/accounting/ar', icon: 'IconReceipt', labelKey: 'nav.ar' },
    ]
  },
  {
    labelKey: 'nav.staff', roles: ['super', 'admin'], items: [
      { path: '/backoffice/staff', icon: 'IconStaff', labelKey: 'nav.staff' },
    ]
  },
  {
    labelKey: 'nav.branches', roles: ['super', 'admin'], items: [
      { path: '/backoffice/franchise', icon: 'IconFranchise', labelKey: 'nav.branches' },
      { path: '/backoffice/franchise/royalty', icon: 'IconPayment', labelKey: 'nav.royalty' },
      { path: '/backoffice/franchise/compliance', icon: 'IconCheckCircle', labelKey: 'nav.compliance' },
      { path: '/backoffice/franchise/new', icon: 'IconPlus', labelKey: 'add' },
    ]
  },
];

// BRANCHES is now fetched from API in Sidebar component (no more hardcoded mock)

const ROLES = [
  { id: 'super', label: 'Super Admin', sub: 'Hibi House HQ', color: 'var(--matcha-600)' },
  { id: 'admin', label: 'Staff Admin', sub: 'Branch Owner', color: 'var(--gold)' },
  { id: 'staff', label: 'Staff', sub: 'Branch Employee', color: 'var(--stone-500)' },
];

// Logo
const Logo = ({ size = 'md', subtitle = true }) => {
  const fs = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ color: 'var(--matcha-600)', display: 'grid', placeItems: 'center' }}>
        <IconBrand size={fs + 8}/>
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontWeight: 700, fontSize: fs, letterSpacing: '0.14em' }}>{BRAND_NAME}</div>
        {subtitle && <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 4, letterSpacing: '0.08em' }}>Operations System</div>}
      </div>
    </div>
  );
};

// ----- Sidebar -----
const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const { route, navigate, role, branch, setBranch, setCmdOpen, setStaff, t } = useApp();
  const queryClient = useQueryClient();
  const [branchOpen, setBranchOpen] = useState(false);
  const session = getSession();
  const isLoggedIn = !!session;
  // Use getMyBranches (role-aware) when logged in, fallback to listPublic
  const { data: myBranchList = [] } = trpc.branches.getMyBranches.useQuery(undefined, { staleTime: 15000, enabled: isLoggedIn });
  const { data: publicBranchList = [] } = trpc.branches.listPublic.useQuery(undefined, { staleTime: 60000, enabled: !isLoggedIn });
  const branchList = isLoggedIn ? myBranchList : publicBranchList;
  const mappedBranches = branchList.map(b => ({
    id: b.id,
    name: b.name,
    sub: b.province || 'Bangkok',
    type: b.branchType === 'hq' ? 'HQ' : b.branchType === 'franchise' ? 'Franchise' : 'Branch',
    branchCode: b.branchCode,
  }));
  const switchBranchMut = trpc.posAuth.switchBranch.useMutation();

  // Sync branch state with API data on first load or when branch has incomplete info
  useEffect(() => {
    if (mappedBranches.length === 0) return;
    // If branch.id is null, pick from session or default to HQ
    if (branch.id === null) {
      const sessionBranchId = session?.currentBranchId;
      const sessionBranch = sessionBranchId ? mappedBranches.find(b => b.id === sessionBranchId) : null;
      const hqBranch = mappedBranches.find(b => b.type === 'HQ') || mappedBranches[0];
      setBranch(sessionBranch || hqBranch);
    } else {
      // Branch has an id (from localStorage) but may lack full details — enrich from API
      const match = mappedBranches.find(b => b.id === branch.id);
      if (match && (branch.name !== match.name || branch.sub !== match.sub)) {
        setBranch(match);
      }
    }
  }, [mappedBranches.length]);

  const handleSwitchBranch = async (b) => {
    setBranch(b);
    setBranchOpen(false);
    // Call API to get new token with updated branchId
    if (isLoggedIn) {
      try {
        const result = await switchBranchMut.mutateAsync({ branchId: b.id });
        if (result?.token) {
          const { getSession: gs, setSession: ss } = await import('@/lib/authStore');
          const s = gs();
          if (s) ss({ ...s, currentBranchId: b.id, token: result.token });
        }
      } catch (e) { /* setBranch already updated UI */ }
    }
    // Invalidate ALL cached queries so pages refetch with new branchId
    queryClient.invalidateQueries();
  };
  const userName = session?.firstName
    ? `${session.firstName}${session.lastName ? ' ' + session.lastName : ''}`
    : (session?.employeeCode || 'Guest');

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem('hibi-branch');
    setStaff?.(null);
    setBranch({ id: null, name: 'Hibi House', sub: 'HQ', type: 'HQ' });
    navigate('/login');
  };

  const visibleSections = NAV.filter((s) => !s.roles || s.roles.includes(role));
  const W = collapsed ? 72 : 256;

  return (
    <>
      {/* mobile overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(20,30,20,0.32)', backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms',
          display: 'block',
        }}
        className="sidebar-overlay"
      />
      <aside
        className="sidebar"
        data-no-toast
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          width: W,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex', flexDirection: 'column',
          transition: 'transform 320ms var(--ease-out-expo), width 280ms var(--ease-out-expo)',
        }}
      >
        {/* Brand */}
        <div style={{ padding: collapsed ? '20px 0 16px' : '20px 20px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8, position: 'relative' }}>
          {collapsed ? (
            <button onClick={onToggleCollapse} title="Expand sidebar (⌘\)" aria-label="Expand sidebar" style={{ color: 'var(--matcha-600)', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 8 }}>
              <IconBrand size={28}/>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--matcha-600)', display: 'grid', placeItems: 'center' }}><IconBrand size={28}/></span>
              <div style={{ lineHeight: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em' }}>hibi</span>
                  <span style={{ fontWeight: 400, fontSize: 16, letterSpacing: '0.18em', color: 'var(--text-secondary)' }}>MATCHA</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, letterSpacing: '0.04em' }}>Backoffice</div>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar (⌘\)"
              className="sidebar-collapse-btn"
              style={{
                width: 28, height: 28, borderRadius: 6,
                display: 'grid', placeItems: 'center',
                color: 'var(--text-tertiary)',
                background: 'transparent',
                transition: 'background 180ms, color 180ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <IconChevLeft size={16}/>
            </button>
          )}
        </div>

        {/* Branch selector */}
        <div style={{ padding: collapsed ? '12px 12px 4px' : '14px 16px 4px', position: 'relative' }}>
          {collapsed ? (
            <button
              onClick={onToggleCollapse}
              title={`${branch.name} · ${branch.sub}`}
              style={{
                width: 48, height: 48, borderRadius: 'var(--r-default)',
                background: branch.type === 'HQ' ? 'var(--matcha-50)' : 'var(--bg-muted)',
                border: '1px solid var(--border-default)',
                color: branch.type === 'HQ' ? 'var(--matcha-700)' : 'var(--text-secondary)',
                display: 'grid', placeItems: 'center', margin: '0 auto',
              }}
            >
              <IconBuilding size={18}/>
            </button>
          ) : (
            <button
              onClick={() => setBranchOpen((v) => !v)}
              style={{
                width: '100%', padding: '10px 12px',
                borderRadius: 'var(--r-default)',
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, textAlign: 'left',
                transition: 'background 180ms',
              }}
            >
            <span style={{
              width: 28, height: 28, borderRadius: 7,
              background: branch.type === 'HQ' ? 'var(--matcha-100)' : 'var(--bg-subtle)',
              color: branch.type === 'HQ' ? 'var(--matcha-700)' : 'var(--text-secondary)',
              display: 'grid', placeItems: 'center', flex: 'none',
            }}>
              <IconBuilding size={14}/>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{branch.name}</span>
                {branch.type === 'HQ' && <span className="pill pill-matcha" style={{ height: 16, fontSize: 9, padding: '0 5px' }}>HQ</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{branch.sub}</div>
            </span>
            <IconChevDown size={14} style={{ color: 'var(--text-tertiary)', transform: branchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 240ms' }}/>
          </button>
          )}
          {!collapsed && branchOpen && (
            <div className="anim-fade" style={{
              position: 'absolute', top: '100%', left: 16, right: 16,
              marginTop: 4, zIndex: 60,
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-default)',
              padding: 6,
              maxHeight: 280, overflowY: 'auto',
            }}>
              {mappedBranches.filter(b => b.id !== branch.id).map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSwitchBranch(b)}
                  style={{
                    width: '100%', padding: '8px 10px',
                    borderRadius: 'var(--r-subtle)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: branch.id === b.id ? 'var(--bg-subtle)' : 'transparent',
                    fontSize: 13, textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = branch.id === b.id ? 'var(--bg-subtle)' : 'transparent'}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)' }}/>
                  <span style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{b.sub}</div>
                  </span>
                  {b.type === 'HQ' && <span className="pill pill-matcha" style={{ height: 18, fontSize: 10, padding: '0 6px' }}>HQ</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick search */}
        <div style={{ padding: collapsed ? '8px 12px 12px' : '8px 16px 12px' }}>
          <button
            onClick={() => setCmdOpen(true)}
            title="Search · ⌘K"
            style={{
              width: '100%', height: collapsed ? 40 : 36, padding: collapsed ? 0 : '0 10px',
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--r-default)',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
              fontSize: 13,
              color: 'var(--text-tertiary)',
            }}
          >
            <IconSearch size={14}/>
            {!collapsed && <>
              <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
              <span className="kbd">⌘K</span>
            </>}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflow: 'auto', padding: collapsed ? '4px 8px 16px' : '4px 12px 16px' }}>
          {visibleSections.map((s) => (
            <div key={s.labelKey} style={{ marginTop: collapsed ? 10 : 14 }}>
              {collapsed ? (
                <div style={{ height: 1, background: 'var(--border-default)', margin: '8px 12px' }}/>
              ) : (
                <div className="t-caption" style={{ padding: '4px 10px 6px', color: 'var(--text-quaternary)' }}>{t(s.labelKey)}</div>
              )}
              {s.items.filter((it) => !it.roles || it.roles.includes(role)).map((it) => {
                const active = route === it.path || (it.path !== '/' && route.startsWith(it.path + '/'));
                const Ic = I[it.icon] || IconHome;
                return (
                  <button
                    key={it.path}
                    onClick={() => { navigate(it.path); onClose?.(); }}
                    title={collapsed ? `${t(it.labelKey)}${it.shortcut ? ' · ' + it.shortcut : ''}` : undefined}
                    style={{
                      width: '100%', padding: collapsed ? '10px 0' : '7px 10px',
                      borderRadius: 'var(--r-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
                      fontSize: 13.5, fontWeight: active ? 500 : 400,
                      color: active ? 'var(--matcha-700)' : 'var(--text-secondary)',
                      background: active ? 'var(--matcha-50)' : 'transparent',
                      position: 'relative',
                      transition: 'all 180ms var(--ease-out-expo)',
                      textAlign: 'left',
                      marginBottom: 1,
                    }}
                    onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg-subtle)'; if (!collapsed) e.currentTarget.style.transform = 'translateX(2px)'; } }}
                    onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; } }}
                  >
                    {active && <span style={{ position: 'absolute', left: collapsed ? 0 : -12, top: 6, bottom: 6, width: 3, borderRadius: '0 4px 4px 0', background: 'var(--matcha-600)' }}/>}
                    <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
                      <Ic size={collapsed ? 18 : 16}/>
                      {collapsed && it.badge && <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, padding: '0 4px', borderRadius: 999, background: 'var(--matcha-600)', color: 'white', fontSize: 9, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{it.badge}</span>}
                    </span>
                    {!collapsed && <>
                      <span style={{ flex: 1 }}>{t(it.labelKey)}</span>
                      {it.badge && <span className="pill pill-matcha" style={{ height: 18, fontSize: 10, padding: '0 6px' }}>{it.badge}</span>}
                      {it.shortcut && !it.badge && <span className="kbd" style={{ opacity: active ? 1 : 0.6 }}>{it.shortcut}</span>}
                    </>}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Bottom links */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
            <SideLink path="/backoffice/settings" icon={IconSettings} label={t('settings.title')} collapsed={collapsed}/>
            <SideLink path="/backoffice/settings/master-data" icon={IconGrid} label={t('nav.masterData')} collapsed={collapsed}/>
            <SideLink path="/backoffice/settings/document-numbering" icon={IconReceipt} label={t('nav.documentNumbering')} collapsed={collapsed}/>
            <SideLink path="/backoffice/settings/hardware" icon={IconPrint} label={t('nav.hardwarePrinting')} collapsed={collapsed}/>
            <SideLink path="/backoffice/audit" icon={IconCheckCircle} label={t('nav.auditCenter')} collapsed={collapsed}/>
            <SideLink path="/help" icon={IconHelp} label={t('Support', 'ช่วยเหลือ')} collapsed={collapsed}/>
            {role === 'super' && <SideLink path="/backoffice/audit-log" icon={IconBook} label={t('Audit Log', 'บันทึกเหตุการณ์')} collapsed={collapsed}/>}
          </div>
        </nav>

        {/* User */}
        <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {collapsed ? (
            <button onClick={onToggleCollapse} title="Expand sidebar" style={{ display: 'grid', placeItems: 'center', margin: '0 auto' }} data-no-toast>
              <Avatar name={userName} size={36}/>
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={userName} size={32}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ROLES.find(r => r.id === role)?.label || session?.role || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => navigate('/pos/terminal')} className="btn btn-secondary btn-sm" style={{ flex: 1, height: 30, fontSize: 12 }}>
                  <IconPOS size={14}/> Open POS
                </button>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ height: 30, width: 30, padding: 0 }} title="Log out">
                  <IconChevRight size={14}/>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
      <style>{`
        @media (min-width: 1024px) {
          .sidebar-overlay { display: none !important; }
          .sidebar { transform: translateX(0) !important; }
        }
        @media (max-width: 1023px) {
          .sidebar { transform: translateX(${open ? '0' : '-100%'}); }
        }
      `}</style>
    </>
  );
};

const SideLink = ({ path, icon: I, label, collapsed }) => {
  const { route, navigate } = useApp();
  const active = route === path;
  return (
    <button
      onClick={() => navigate(path)}
      title={collapsed ? label : undefined}
      style={{
        width: '100%', padding: collapsed ? '10px 0' : '7px 10px',
        borderRadius: 'var(--r-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 10,
        fontSize: 13.5, fontWeight: active ? 500 : 400,
        color: active ? 'var(--matcha-700)' : 'var(--text-secondary)',
        background: active ? 'var(--matcha-50)' : 'transparent',
        transition: 'all 180ms',
        textAlign: 'left',
      }}
    >
      <I size={collapsed ? 18 : 16}/>
      {!collapsed && <span>{label}</span>}
    </button>
  );
};

// ----- Topbar -----
const Topbar = ({ onToggleSidebar }) => {
  const { theme, setTheme, setCmdOpen, navigate, lang, setLang } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);

  const { data: notifications = [], refetch } = trpc.notifications.list.useQuery(undefined, {
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <header
      className="glass"
      data-no-toast
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 60,
        padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border-default)',
        borderLeft: 'none', borderRight: 'none', borderTop: 'none',
      }}
    >
      <button
        className="btn btn-ghost btn-icon"
        onClick={onToggleSidebar}
        aria-label="Menu"
        style={{ marginLeft: -8 }}
      >
        <IconMenuLines size={18}/>
      </button>

      <button
        onClick={() => setCmdOpen(true)}
        className="cmd-button"
        style={{
          flex: 1, maxWidth: 480,
          height: 38, padding: '0 12px',
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-default)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, color: 'var(--text-tertiary)',
        }}
      >
        <IconSearch size={15}/>
        <span style={{ flex: 1, textAlign: 'left' }}>Search orders, items, SOPs…</span>
        <span className="kbd">⌘K</span>
      </button>

      <div style={{ flex: 1 }}/>

      <button
        className="btn btn-ghost btn-icon"
        onClick={() => setAppsOpen(true)}
        aria-label="App switcher"
        title="All apps"
        data-no-toast
      >
        <IconGrid size={18}/>
      </button>

      <button
        onClick={() => setLang(lang === 'th' ? 'en' : 'th')}
        className="btn btn-ghost"
        style={{ height: 36, padding: '0 10px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--text-secondary)' }}
        title="Toggle language"
        data-no-toast
      >
        {lang === 'th' ? 'TH' : 'EN'}
      </button>

      <button
        className="btn btn-ghost btn-icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        title="Toggle theme (⌘D)"
        data-no-toast
      >
        {theme === 'dark' ? <IconSun size={18}/> : <IconMoon size={18}/>}
      </button>

      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
        >
          <span style={{ position: 'relative' }}>
            <IconBell size={18}/>
            {hasUnread && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--matcha-500)', border: '2px solid var(--bg-surface)' }}/>
            )}
          </span>
        </button>
        {notifOpen && <NotifDropdown notifications={notifications} refetch={refetch} onClose={() => setNotifOpen(false)}/>}
      </div>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setUserOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 4, borderRadius: 999 }}
        >
          <Avatar name="Yuki Tanaka" size={32}/>
        </button>
        {userOpen && <UserDropdown onClose={() => setUserOpen(false)}/>}
      </div>
      <AppSwitcher open={appsOpen} onClose={() => setAppsOpen(false)}/>
    </header>
  );
};

const NotifDropdown = ({ notifications, refetch, onClose }) => {
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markRead.mutate({ ids: [n.id] });
    }
  };

  const getIconInfo = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('stock') || t.includes('คลัง')) {
      return { Icon: IconBox, color: 'var(--warning)' };
    }
    if (t.includes('po') || t.includes('สั่งซื้อ') || t.includes('ใบเสร็จ')) {
      return { Icon: IconReceipt, color: 'var(--matcha-600)' };
    }
    if (t.includes('sop') || t.includes('สูตร') || t.includes('ขั้นตอน')) {
      return { Icon: IconCheckCircle, color: 'var(--info)' };
    }
    return { Icon: IconStaff, color: 'var(--matcha-600)' };
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }}/>
      <div className="anim-fade" style={{
        position: 'absolute', top: '100%', right: 0,
        marginTop: 8, width: 360, zIndex: 61,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Notifications</div>
          {notifications.some(n => !n.isRead) && (
            <button className="btn btn-ghost btn-xs" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              {markAllRead.isPending ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No notifications yet
            </div>
          ) : (
            notifications.map((n, i) => {
              const { Icon, color } = getIconInfo(n.title);
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-default)',
                    cursor: n.isRead ? 'default' : 'pointer',
                    background: n.isRead ? 'transparent' : 'rgba(34, 197, 94, 0.05)',
                    transition: 'background 150ms',
                  }}
                  className="notif-item"
                >
                  <span style={{ color: color, marginTop: 2 }}><Icon size={18}/></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {n.title}
                      {!n.isRead && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)' }}/>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{n.content}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4 }}>{formatTime(n.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-default)', textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={onClose}>View all activity</button>
        </div>
      </div>
    </>
  );
};

const UserDropdown = ({ onClose }) => {
  const { navigate, setStaff } = useApp();
  const session = getSession();
  const userName = session?.firstName
    ? `${session.firstName}${session.lastName ? ' ' + session.lastName : ''}`
    : (session?.employeeCode || 'Guest');
  const userEmail = session?.employeeCode || '—';
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }}/>
      <div className="anim-fade" style={{
        position: 'absolute', top: '100%', right: 0,
        marginTop: 8, width: 240, zIndex: 61,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--r-md)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{userName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{userEmail}</div>
        </div>
        <div style={{ padding: 6 }}>
          {[
            { label: 'Profile', icon: IconUser, path: '/settings' },
            { label: 'Settings', icon: IconSettings, path: '/settings' },
            { label: 'Branches', icon: IconBuilding, path: '/branch-select' },
            { label: 'Help', icon: IconHelp, path: '/help' },
          ].map((it) => {
            const I = it.icon;
            return (
              <button key={it.label} onClick={() => { navigate(it.path); onClose(); }} style={{ width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, borderRadius: 6 }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <I size={15}/>
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: 6, borderTop: '1px solid var(--border-default)' }}>
          <button onClick={() => { clearSession(); setStaff?.(null); navigate('/login'); }} style={{ width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--danger)', borderRadius: 6 }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <IconChevRight size={15}/>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </>
  );
};

// ----- Role switcher (dev tool, floating bottom-right) -----
const RoleSwitcher = () => {
  const { role, setRole, staff } = useApp();
  const [open, setOpen] = useState(false);
  const current = ROLES.find((r) => r.id === role);

  // Only show dev role switcher for the primary super_admin (HMC-0001)
  if (!staff || staff.employeeCode !== 'HMC-0001') return null;
  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 70 }}>
      {open && (
        <div className="anim-fade" style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
          width: 220,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: 6,
        }}>
          <div className="t-caption" style={{ padding: '6px 8px', color: 'var(--text-quaternary)' }}>Dev · Role</div>
          {ROLES.map((r) => (
            <button key={r.id} onClick={() => { setRole(r.id); setOpen(false); }} style={{
              width: '100%', padding: '8px 10px',
              display: 'flex', alignItems: 'center', gap: 10,
              borderRadius: 6, fontSize: 13,
              background: role === r.id ? 'var(--bg-subtle)' : 'transparent',
              textAlign: 'left',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }}/>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.sub}</div>
              </span>
              {role === r.id && <IconCheck size={14} style={{ color: 'var(--matcha-600)' }}/>}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass"
        style={{
          padding: '8px 12px', borderRadius: 999,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 500,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: current.color, boxShadow: `0 0 8px ${current.color}` }}/>
        <span>{current.label}</span>
        <IconChevUp size={12} style={{ opacity: 0.5 }}/>
      </button>
    </div>
  );
};

// ----- Command Palette -----
const CommandPalette = () => {
  const { cmdOpen, setCmdOpen, navigate, role, t } = useApp();
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { if (cmdOpen) setTimeout(() => inputRef.current?.focus(), 50); else setQ(''); }, [cmdOpen]);

  const all = useMemo(() => {
    const items = [];
    NAV.filter(s => !s.roles || s.roles.includes(role)).forEach((s) => {
      s.items.filter(i => !i.roles || i.roles.includes(role)).forEach((it) => {
        items.push({ group: t(s.labelKey), label: t(it.labelKey), icon: it.icon, path: it.path, shortcut: it.shortcut });
      });
    });
    items.push(
      { group: 'Actions', label: 'New Order', icon: 'IconPlus', path: '/pos', shortcut: '⌘N' },
      { group: 'Actions', label: 'Toggle Dark Mode', icon: 'IconMoon', action: 'theme', shortcut: '⌘D' },
      { group: 'Actions', label: 'Print Last Receipt', icon: 'IconPrint', path: '/pos/receipt', shortcut: '⌘P' },
      { group: 'Actions', label: 'Switch Branch', icon: 'IconBuilding', path: '/branch-select', shortcut: '⌘B' },
      { group: 'Settings', label: 'Profile', icon: 'IconUser', path: '/settings' },
      { group: 'Settings', label: 'Hardware', icon: 'IconScanner', path: '/settings' },
      { group: 'Help', label: 'Keyboard Shortcuts', icon: 'IconCommand', action: 'help', shortcut: '?' },
    );
    return items;
  }, [role]);

  const filtered = useMemo(() => {
    if (!q) return all;
    const lower = q.toLowerCase();
    return all.filter((it) => it.label.toLowerCase().includes(lower) || it.group.toLowerCase().includes(lower));
  }, [q, all]);

  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach((it) => { (m[it.group] = m[it.group] || []).push(it); });
    return m;
  }, [filtered]);

  if (!cmdOpen) return null;

  return (
    <div
      onClick={() => setCmdOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(20,30,20,0.36)',
        backdropFilter: 'blur(12px)',
        display: 'grid', placeItems: 'start center',
        paddingTop: '12vh',
        animation: 'fadeIn 200ms var(--ease-out-expo)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 92vw)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          animation: 'bounceIn 360ms var(--ease-out-expo)',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconSearch size={18} style={{ color: 'var(--text-tertiary)' }}/>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            style={{ flex: 1, height: 36, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: 'var(--text-primary)' }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div style={{ maxHeight: 440, overflow: 'auto', padding: '8px 0' }}>
          {Object.keys(grouped).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>No results</div>
          ) : Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ padding: '4px 8px' }}>
              <div className="t-caption" style={{ padding: '6px 12px', color: 'var(--text-quaternary)' }}>{group}</div>
              {items.map((it) => {
                const I = I[it.icon] || IconChevRight;
                return (
                  <button
                    key={it.label + group}
                    onClick={() => { if (it.path) navigate(it.path); setCmdOpen(false); }}
                    style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 'var(--r-subtle)', fontSize: 14 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <I size={16} style={{ color: 'var(--text-tertiary)' }}/>
                    <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                    {it.shortcut && <span className="kbd">{it.shortcut}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span><span className="kbd">↑↓</span> Navigate</span>
          <span><span className="kbd">↵</span> Open</span>
          <span><span className="kbd">Esc</span> Close</span>
        </div>
      </div>
    </div>
  );
};

// ----- App Switcher (accessible from everywhere) -----
const AppSwitcher = ({ open, onClose }) => {
  const { navigate, role } = useApp();
  const { data: myTasks = [] } = trpc.sop.listMyTasks.useQuery(
    { status: 'pending' },
    { enabled: open, staleTime: 30000 }
  );
  const pendingTaskCount = myTasks.filter((t) => t.status === 'pending' || t.status === 'overdue').length;

  if (!open) return null;
  const apps = [
    { path: '/', label: 'Dashboard', icon: IconHome, color: 'var(--matcha-600)', desc: 'Overview' },
    { path: '/pos', label: 'POS Terminal', icon: IconPOS, color: 'var(--matcha-700)', desc: 'Take orders' },
    { path: '/kitchen', label: 'Kitchen', icon: IconKitchen, color: '#d97706', desc: 'Order queue' },
    { path: '/orders', label: 'Orders', icon: IconOrders, color: 'var(--info)', desc: 'History' },
    { path: '/admin/menu', label: 'Menu', icon: IconMenu, color: 'var(--matcha-600)', desc: 'Items + recipes' },
    { path: '/admin/staff', label: 'Staff', icon: IconStaff, color: '#9333ea', desc: 'Team + permissions' },
    { path: '/inventory', label: 'Inventory', icon: IconInventory, color: 'var(--matcha-600)', desc: 'Stock + supply' },
    { path: '/suppliers', label: 'Suppliers', icon: IconSupplier, color: '#0891b2', desc: 'Vendors + POs' },
    { path: '/sop', label: 'SOP Library', icon: IconBook, color: 'var(--matcha-700)', desc: 'Knowledge' },
    { path: '/sop/my-tasks', label: 'My Tasks', icon: IconCheckList, color: 'var(--gold)', desc: 'Personal training', badge: pendingTaskCount > 0 ? pendingTaskCount : undefined },
    { path: '/admin/reports', label: 'Reports', icon: IconReports, color: 'var(--matcha-700)', desc: 'Analytics' },
    { path: '/franchise', label: 'Branches', icon: IconFranchise, color: '#dc2626', desc: 'All locations', roles: ['super'] },
    { path: '/settings', label: 'Settings', icon: IconSettings, color: 'var(--text-secondary)', desc: 'Preferences' },
  ].filter((a) => !a.roles || a.roles.includes(role));

  return (
    <div
      data-no-toast
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 180,
        background: 'rgba(20,30,20,0.42)', backdropFilter: 'blur(16px)',
        display: 'grid', placeItems: 'center',
        padding: 24,
        animation: 'fadeIn 240ms var(--ease-out-expo)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(820px, 100%)',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          animation: 'bounceIn 360ms var(--ease-out-expo)',
        }}
      >
        <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
          <div>
            <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>Quick access</div>
            <div className="t-h3" style={{ fontWeight: 600, marginTop: 4 }}>Jump to anywhere</div>
          </div>
          <button data-no-toast onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close"><IconX size={18}/></button>
        </div>
        <div style={{ padding: '0 20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {apps.map((app) => {
              const I = app.icon;
              return (
                <button
                  key={app.path}
                  data-no-toast
                  onClick={() => { navigate(app.path); onClose(); }}
                  style={{
                    padding: 18,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--r-md)',
                    textAlign: 'left',
                    transition: 'transform 200ms var(--ease-out-expo), box-shadow 200ms, border-color 200ms',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--matcha-300)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
                  <span style={{ display: 'inline-grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: app.color + '14', color: app.color, marginBottom: 12 }}>
                    <I size={20}/>
                  </span>
                  {app.badge && (
                    <span style={{ position: 'absolute', top: 14, right: 14, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--matcha-600)', color: 'white', fontSize: 10, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{app.badge}</span>
                  )}
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{app.label}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{app.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-tertiary)', flex: 'none' }}>
          <span>Tip: press <span className="kbd">⌘K</span> to search instead</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
};

// ----- POS Mode Shell (fullscreen, no admin sidebar) -----
const POSShell = ({ children }) => {
  const { route, navigate, branch, theme, setTheme, setCmdOpen, lang, setLang, t, staff } = useApp();
  const [appsOpen, setAppsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  
  const userName = staff?.firstName
    ? `${staff.firstName}${staff.lastName ? ' ' + staff.lastName : ''}`
    : (staff?.employeeCode || 'Guest');

  const tabs = [
    { path: '/pos/terminal', label: t('pos.terminal'), icon: IconPOS },
    { path: '/pos/kitchen', label: t('nav.kitchen'), icon: IconKitchen },
    { path: '/pos/orders', label: t('nav.orders'), icon: IconOrders },
    { path: '/sop/my-tasks', label: t('sop.myTasks'), icon: IconCheckList },
  ];
  // Hide POS shell on payment/receipt screens (focused flow)
  const focused = route === '/pos/payment' || route === '/pos/receipt';
  if (focused) return <>{children}</>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <header className="glass" data-no-toast style={{
        height: 56, padding: '0 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky', top: 0, zIndex: 30,
      }}>
        <Logo size="sm" subtitle={false}/>
        <span style={{ width: 1, height: 24, background: 'var(--border-default)' }}/>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((t) => {
            const I = t.icon;
            const active = route === t.path || (t.path === '/pos/terminal' && (route === '/pos' || route === '/pos/terminal'));
            return (
              <button key={t.path} onClick={() => navigate(t.path)} style={{
                height: 40, padding: '0 14px',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                borderRadius: 'var(--r-default)',
                background: active ? 'var(--matcha-50)' : 'transparent',
                color: active ? 'var(--matcha-700)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: 500,
                transition: 'all 200ms var(--ease-out-expo)',
              }}>
                <I size={16}/> {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }}/>
        <button className="hide-on-sunmi" onClick={() => setCmdOpen(true)} style={{
          height: 36, padding: '0 12px',
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--r-default)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--text-tertiary)',
        }}>
          <IconSearch size={14}/> Search <span className="kbd">⌘K</span>
        </button>
        <button
          className="hide-on-sunmi"
          onClick={() => navigate('/branch-select')}
          style={{
            height: 36,
            padding: '0 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--text-secondary)',
            background: 'var(--bg-muted)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-default)',
            cursor: 'pointer',
            transition: 'all 200ms var(--ease-out-expo)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--matcha-50)';
            e.currentTarget.style.color = 'var(--matcha-700)';
            e.currentTarget.style.borderColor = 'var(--matcha-200)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-muted)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
          title="Switch Branch"
        >
          <IconBuilding size={14}/>
          <span><b style={{ color: 'var(--text-primary)' }}>{branch.name}</b> · Terminal 1</span>
        </button>
        <button className="btn btn-ghost btn-icon hide-on-sunmi" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <IconSun size={18}/> : <IconMoon size={18}/>}
        </button>
        <button className="btn btn-ghost btn-icon hide-on-sunmi" onClick={() => setAppsOpen(true)} title="All apps" aria-label="App switcher" data-no-toast>
          <IconGrid size={18}/>
        </button>
        <button className="btn btn-ghost hide-on-sunmi" onClick={() => setLang(lang === 'th' ? 'en' : 'th')} style={{ height: 32, padding: '0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }} title="Toggle language" data-no-toast>
          {lang === 'th' ? 'TH' : 'EN'}
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 4, borderRadius: 999 }}
            title="User menu"
          >
            <Avatar name={userName} size={32}/>
          </button>
          {userOpen && <UserDropdown onClose={() => setUserOpen(false)}/>}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          <IconChevLeft size={14}/> {t('pos.exitPOS')}
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      <CommandPalette/>
      <AppSwitcher open={appsOpen} onClose={() => setAppsOpen(false)}/>
    </div>
  );
};

// ----- Layout wrapper -----
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hibi-sidebar-collapsed') === '1');
  const { route } = useApp();

  useEffect(() => {
    localStorage.setItem('hibi-sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  // Keyboard shortcut: ⌘\ to toggle
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === '\\') { e.preventDefault(); setCollapsed(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // POS mode: dedicated fullscreen experience for the cashier terminal
  const posRoutes = ['/pos', '/pos/terminal', '/pos/payment', '/pos/receipt', '/kitchen', '/pos/kitchen', '/orders', '/pos/orders'];
  const isPOS = posRoutes.includes(route);

  // Pure-fullscreen pages (no shell at all)
  const fullBleed = ['/', '/login', '/pos/login', '/backoffice/login', '/branch-select'].includes(route);

  if (fullBleed) return <>{children}</>;

  if (isPOS) return (
    <>
      <POSShell>{children}</POSShell>
      <RoleSwitcher/>
    </>
  );

  const sidebarW = collapsed ? 72 : 256;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapse={() => setCollapsed(v => !v)}/>
      <div style={{ flex: 1, minWidth: 0 }} className="main-area" data-collapsed={collapsed ? '1' : '0'}>
        <Topbar onToggleSidebar={() => {
          if (window.innerWidth >= 1024) setCollapsed(v => !v);
          else setSidebarOpen(v => !v);
        }}/>
        <main style={{ position: 'relative' }}>{children}</main>
      </div>
      <RoleSwitcher/>
      <CommandPalette/>
      <style>{`
        @media (min-width: 1024px) {
          .main-area { margin-left: ${sidebarW}px !important; transition: margin-left 280ms var(--ease-out-expo); }
        }
        @media (max-width: 1023px) {
          .main-area { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};


// Exports
export { NAV, ROLES };
export { Logo, Sidebar, Topbar, RoleSwitcher, CommandPalette, AppLayout, POSShell, AppSwitcher };
