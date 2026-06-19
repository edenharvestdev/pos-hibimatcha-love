// ============================================
// Main App - routing + global state
// ============================================

import React, { useState, useEffect } from "react";
import Pusher from "pusher-js";
import {
  AppCtx,
  ToastProvider,
  Avatar,
  Select,
  SectionHeader,
  EmptyState,
  TopActionBar,
  useHashRoute,
} from "@/components";
import { AppLayout } from "@/components/Shell";
import * as authStoreRef from "@/lib/authStore";
import { createT } from "@/lib/i18n";

// Icons used in inline pages
import {
  IconExport,
  IconBook,
  IconHelp,
  IconCommand,
  IconChevDown,
  EmptyZen,
} from "@/icons";

// All pages
import { PageLanding } from "@/pages/Landing";
import { PageLogin, PageBranchSelect, PageBootstrap } from "@/pages/Auth";
import { PageDashboard } from "@/pages/Dashboard";
import {
  PagePOS,
  PagePayment,
  PageReceipt,
  PageKitchen,
  PageOrders,
  PagePendingOrders,
} from "@/pages/POS";
import {
  PageAdminDash,
  PageAdminMenu,
  PageAdminCategories,
  PageAdminOptions,
  PageAdminDiscounts,
  PageAdminPayments,
  PageAdminStaff,
  PageAdminReports,
} from "@/pages/Admin";
import {
  PageInvOverview,
  PageInvItems,
  PageInvReceiving,
  PageInvCount,
  PageInvTransfer,
  PageInvMovements,
} from "@/pages/Inventory";
import {
  PageSuppliers,
  PageSupplierDetail,
  PagePurchaseOrders,
  PageFranchise,
  PageFranchiseNew,
  PageFranchiseDetail,
} from "@/pages/SuppliersAndFranchise";
import {
  PageSOPLibrary,
  PageSOPDetail,
  PageSOPEditor,
  PageSOPApprovalQueue,
  PageSOPCompliance,
  PageSOPVariants,
  PageSOPMyTasks,
  PageSOPMaterialUsage,
} from "@/pages/SOP";
import { PageSettings } from "@/pages/Settings";
import { PageDistribute } from "@/pages/Distribute";
import { PageDeliveryOrders } from "@/pages/DeliveryOrders";
import { PageRequisitions } from "@/pages/Requisitions";
import { PageExportDocuments } from "@/pages/ExportDocuments";
import PageExpenseReceipts from "@/pages/ExpenseReceipts";
import PageInventoryLots from "@/pages/InventoryLots";
import PageProduction from "@/pages/Production";
import { PageCustomerApp, PageCustomerProfile } from "@/pages/CustomerApp";
import { PagePnLDashboard } from "@/pages/PnLDashboard";
import { PageStaffKPI } from "@/pages/StaffKPI";
import { PageFranchiseWizard } from "@/pages/FranchiseWizard";
import { trpc } from "@/lib/trpc";
import { PageMasterData } from "@/pages/MasterData";
import { PageAuditLogCenter } from "@/pages/AuditLogCenter";
import { PageWasteManagement } from "@/pages/WasteManagement";
import { PageCustomers } from "@/pages/Customers";
import { PageInventoryForecast } from "@/pages/InventoryForecast";
import { PageCountSession } from "@/pages/CountSession";
import { PageFranchiseCompliance } from "@/pages/FranchiseCompliance";
import { PageAccounting } from "@/pages/Accounting";
import { PagePaymentMethods } from "@/pages/PaymentMethods";
import { PageDocumentSettings } from "@/pages/DocumentSettings";
import { PageHardwareSettings } from "@/pages/HardwareSettings";

// ============================================
// Inline pages (small ones — kept here)
// ============================================

const PageAuditLog = () => {
  const { data, isLoading } = trpc.auditLog.list.useQuery({ limit: 100 }, { staleTime: 15000 });
  const logs = data?.logs ?? [];

  // Group logs by date
  const grouped = logs.reduce((acc, log) => {
    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Unknown';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(log);
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">System / Audit Log</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">System Audit Log</h1>
            <p className="page-desc">{logs.length} events recorded</p>
          </div>
          <button className="btn btn-secondary"><IconExport size={16}/> Export PDF</button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading audit log…</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <p>No audit events recorded yet.</p>
        </div>
      ) : Object.entries(grouped).map(([day, entries]) => (
        <div key={day} style={{ marginBottom: 20 }}>
          <div className="t-caption" style={{ marginBottom: 10 }}>{day}</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {entries.map((a, i) => {
              const time = a.createdAt ? new Date(a.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
              const who = a.actorName ?? `${a.actorType ?? 'system'}#${a.actorId ?? ''}`;
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', gap: 14, padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'center', fontSize: 14 }}>
                  <Avatar name={who} size={32}/>
                  <div>
                    <div><b>{who}</b> <span style={{ color: 'var(--matcha-700)' }}>· {a.action}</span> · {a.entity}{a.entityId ? ` #${a.entityId}` : ''}</div>
                    {a.details && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}</div>}
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{a.ipAddress ?? '—'}</span>
                  <span className="muted tabular" style={{ fontSize: 12, textAlign: 'right' }}>{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const PageHelp = () => (
  <div className="page" style={{ maxWidth: 800 }}>
    <div className="page-header">
      <h1 className="page-title">Help & Support</h1>
      <p className="page-desc">We're here to help. Most questions answered within 4 hours.</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
      {[
        { i: IconBook, t: 'Documentation', s: 'Read the manual' },
        { i: IconHelp, t: 'Chat with us', s: 'Live support' },
        { i: IconCommand, t: 'Keyboard shortcuts', s: 'Press ? anywhere' },
      ].map((it) => {
        const I = it.i;
        return (
          <a key={it.t} href="#" className="card" style={{ padding: 20 }}>
            <span style={{ color: 'var(--matcha-700)' }}><I size={24}/></span>
            <div style={{ fontWeight: 600, marginTop: 12 }}>{it.t}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{it.s}</div>
          </a>
        );
      })}
    </div>
    <SectionHeader title="Frequently asked"/>
    <div className="card" style={{ overflow: 'hidden' }}>
      {[
        {
          q: 'How do I receive stock from a PO?',
          a: 'Go to Inventory → Receiving, select the approved PO, confirm quantities received, and submit. Stock updates automatically at your branch.',
        },
        {
          q: 'Can I sync menu changes across branches?',
          a: 'Menu items are managed at HQ. After creating or editing an item, use Distribute Center (or Franchise → branch → Menu tab) to push items to target branches.',
        },
        {
          q: 'How do SOP variants work?',
          a: 'Each branch can request a variant of the standard SOP. Submit a variant from SOP → My Variants; HQ reviews and approves in the Approval Queue.',
        },
        {
          q: 'What if my internet goes down?',
          a: 'POS caches your session locally. You can continue taking orders; sync resumes when connectivity returns. Install as PWA on iPad for best offline resilience.',
        },
        {
          q: 'How do I add a new payment method?',
          a: 'Super Admin: Backoffice → Payment Methods → Add method, then enable it per branch under branch payment settings.',
        },
      ].map(({ q, a }, i) => (
        <details key={i} style={{ padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
            {q}
            <IconChevDown size={16} style={{ color: 'var(--text-tertiary)' }}/>
          </summary>
          <div className="muted" style={{ paddingTop: 10, fontSize: 14, lineHeight: 1.6 }}>{a}</div>
        </details>
      ))}
    </div>
  </div>
);

const PageNotFound = ({ route }) => (
  <div className="page">
    <EmptyState illustration={<EmptyZen/>} title="Page not found" desc={`No route configured for "${route}". This shell focuses on the 37 core pages.`} action={
      <button className="btn btn-primary" onClick={() => location.hash = '/'}>← Back to dashboard</button>
    }/>
  </div>
);

// ============================================
// Routes
// ============================================

const ROUTES = {
  '/setup': () => <PageBootstrap/>,
  '/bootstrap': () => <PageBootstrap/>,
  '/login': () => <PageLogin/>,
  '/branch-select': () => <PageBranchSelect/>,
  '/': () => <PageLanding/>,
  // POS app
  '/pos/login': () => <PageLogin/>,
  '/pos': () => <PagePOS/>,
  '/pos/terminal': () => <PagePOS/>,
  '/pos/payment': () => <PagePayment/>,
  '/pos/receipt': () => <PageReceipt/>,
  '/pos/kitchen': () => <PageKitchen/>,
  '/kitchen': () => <PageKitchen/>,
  '/pos/orders': () => <PageOrders/>,
  '/pos/pending': () => <PagePendingOrders/>,
  '/orders': () => <PageOrders/>,
  '/orders/pending': () => <PagePendingOrders/>,
  '/pos/delivery': () => <PageDeliveryOrders/>,
  '/backoffice/delivery': () => <PageDeliveryOrders/>,
  '/customer': () => <PageCustomerApp/>,
  '/customer/profile': () => <PageCustomerProfile/>,
  // Backoffice app
  '/backoffice/login': () => <PageLogin/>,
  '/backoffice': () => <PageDashboard/>,
  '/backoffice/distribute': () => <PageDistribute/>,
  '/backoffice/pnl': () => <PagePnLDashboard/>,
  '/backoffice/kpi': () => <PageStaffKPI/>,
  '/backoffice/menu': () => <PageAdminMenu/>,
  '/backoffice/categories': () => <PageAdminCategories/>,
  '/backoffice/options': () => <PageAdminOptions/>,
  '/backoffice/discounts': () => <PageAdminDiscounts/>,
  '/backoffice/payments': () => <PagePaymentMethods defaultTab="methods"/>,
  '/backoffice/payments/methods': () => <PagePaymentMethods defaultTab="methods"/>,
  '/backoffice/payments/permissions': () => <PagePaymentMethods defaultTab="permissions"/>,
  '/backoffice/payments/settlements': () => <PagePaymentMethods defaultTab="settlements"/>,
  '/backoffice/staff': () => <PageAdminStaff/>,
  '/backoffice/reports': () => <PageAdminReports/>,
  '/backoffice/orders': () => <PageOrders/>,
  '/backoffice/orders/pending': () => <PagePendingOrders/>,
  '/backoffice/audit-log': () => <PageAuditLog/>,
  '/backoffice/inventory': () => <PageInvOverview/>,
  '/backoffice/inventory/items': () => <PageInvItems/>,
  '/backoffice/inventory/receiving': () => <PageInvReceiving/>,
  '/backoffice/inventory/count': () => <PageInvCount/>,
  '/backoffice/inventory/transfer': () => <PageInvTransfer/>,
  '/backoffice/inventory/movements': () => <PageInvMovements/>,
  '/backoffice/requisitions': () => <PageRequisitions/>,
  '/backoffice/documents': () => <PageExportDocuments/>,
  '/backoffice/expense-receipts': () => <PageExpenseReceipts/>,
  '/backoffice/inventory-lots': () => <PageInventoryLots/>,
  '/backoffice/production': () => <PageProduction/>,
  '/backoffice/suppliers': () => <PageSuppliers/>,
  '/backoffice/purchase-orders': () => <PagePurchaseOrders/>,
  '/backoffice/franchise': () => <PageFranchise/>,
  '/backoffice/franchise/new': () => <PageFranchiseNew/>,
  '/backoffice/franchise/wizard': () => <PageFranchiseWizard/>,
  '/backoffice/sop': () => <PageSOPLibrary/>,
  '/backoffice/sop/new': () => <PageSOPEditor/>,
  '/backoffice/sop/approval-queue': () => <PageSOPApprovalQueue/>,
  '/backoffice/sop/compliance': () => <PageSOPCompliance/>,
  '/backoffice/sop/my-variants': () => <PageSOPVariants/>,
  '/backoffice/sop/my-tasks': () => <PageSOPMyTasks/>,
  '/backoffice/sop/material-usage': () => <PageSOPMaterialUsage/>,
  '/backoffice/settings': () => <PageSettings/>,
  '/backoffice/settings/master-data': () => <PageMasterData/>,
  '/backoffice/settings/document-numbering': () => <PageDocumentSettings/>,
  '/backoffice/settings/hardware': () => <PageHardwareSettings/>,
  '/backoffice/audit': () => <PageAuditLogCenter/>,
  '/backoffice/waste': () => <PageWasteManagement/>,
  '/backoffice/customers': () => <PageCustomers defaultTab="directory"/>,
  '/backoffice/customers/segments': () => <PageCustomers defaultTab="segments"/>,
  '/backoffice/inventory/forecast': () => <PageInventoryForecast/>,
  '/backoffice/inventory/count-session': () => <PageCountSession/>,
  '/backoffice/franchise/royalty': () => <PageFranchiseCompliance defaultTab="royalty"/>,
  '/backoffice/franchise/compliance': () => <PageFranchiseCompliance defaultTab="compliance"/>,
  '/backoffice/accounting/ap': () => <PageAccounting defaultTab="ap"/>,
  '/backoffice/accounting/ar': () => <PageAccounting defaultTab="ar"/>,
  '/backoffice/accounting/cashflow': () => <PageAccounting defaultTab="cashflow"/>,
  // Legacy aliases
  '/admin': () => <PageAdminDash/>,
  '/admin/pnl': () => <PagePnLDashboard/>,
  '/admin/kpi': () => <PageStaffKPI/>,
  '/admin/menu': () => <PageAdminMenu/>,
  '/admin/categories': () => <PageAdminCategories/>,
  '/admin/options': () => <PageAdminOptions/>,
  '/admin/discounts': () => <PageAdminDiscounts/>,
  '/admin/payment-methods': () => <PageAdminPayments/>,
  '/admin/staff': () => <PageAdminStaff/>,
  '/admin/reports': () => <PageAdminReports/>,
  '/admin/audit-log': () => <PageAuditLog/>,
  '/inventory': () => <PageInvOverview/>,
  '/inventory/items': () => <PageInvItems/>,
  '/inventory/receiving': () => <PageInvReceiving/>,
  '/inventory/count': () => <PageInvCount/>,
  '/inventory/transfer': () => <PageInvTransfer/>,
  '/inventory/movements': () => <PageInvMovements/>,
  '/suppliers': () => <PageSuppliers/>,
  '/suppliers/1': () => <PageSupplierDetail/>,
  '/purchase-orders': () => <PagePurchaseOrders/>,
  '/franchise': () => <PageFranchise/>,
  '/franchise/new': () => <PageFranchiseNew/>,
  '/franchise/1': () => <PageFranchiseDetail/>,
  '/sop': () => <PageSOPLibrary/>,
  '/sop/new': () => <PageSOPEditor/>,
  '/sop/approval-queue': () => <PageSOPApprovalQueue/>,
  '/sop/acknowledgments': () => <PageSOPCompliance/>,
  '/sop/compliance': () => <PageSOPCompliance/>,
  '/sop/my-variants': () => <PageSOPVariants/>,
  '/sop/my-tasks': () => <PageSOPMyTasks/>,
  '/sop/material-usage': () => <PageSOPMaterialUsage/>,
  '/settings': () => <PageSettings/>,
  '/help': () => <PageHelp/>,
};

const Router = ({ route }) => {
  const [path] = route.split('?');
  if (path.startsWith('/backoffice/sop/') && !ROUTES[path]) return <PageSOPDetail/>;
  if (path.startsWith('/backoffice/franchise/') && !ROUTES[path]) return <PageFranchiseDetail/>;
  if (path.startsWith('/backoffice/suppliers/') && !ROUTES[path]) return <PageSupplierDetail/>;
  if (path.startsWith('/sop/') && !ROUTES[path]) return <PageSOPDetail/>;
  if (path.startsWith('/franchise/') && !ROUTES[path]) return <PageFranchiseDetail/>;
  if (path.startsWith('/suppliers/') && !ROUTES[path]) return <PageSupplierDetail/>;

  const Page = ROUTES[path];
  if (Page) return <Page/>;
  return <PageNotFound route={path}/>;
};

// ============================================
// App
// ============================================

// ============================================
// Route Guard — enforce role-based access
// ============================================
// - super_admin    → full access everywhere
// - staff_admin    → backoffice + POS, but no super-only pages
// - staff          → POS-only (kitchen, orders, terminal, receipt, payment, my-tasks)
const PUBLIC_PATHS = ['/login', '/setup', '/bootstrap', '/pos/login', '/backoffice/login', '/branch-select'];
const STAFF_ALLOWED_PATHS = [
  '/pos', '/pos/terminal', '/pos/payment', '/pos/receipt', '/pos/kitchen', '/pos/orders', '/pos/pending', '/pos/delivery',
  '/kitchen', '/orders', '/orders/pending',
  '/sop', '/sop/my-tasks', '/sop/my-variants',
  '/settings',
];
const STAFF_ALLOWED_PREFIXES = ['/pos/', '/sop/'];
const SUPER_ONLY_PATHS = [
  '/backoffice/sop/approval-queue',
  '/backoffice/audit-log',
  '/admin/audit-log',
];
const SUPER_ONLY_PREFIXES = ['/backoffice/franchise'];

function isPathAllowedForRole(path, role) {
  if (PUBLIC_PATHS.includes(path)) return true;
  if (role === 'super') return true;
  if (role === 'admin') {
    if (SUPER_ONLY_PATHS.includes(path)) return false;
    if (SUPER_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return false;
    return true;
  }
  // staff role: POS-only
  if (STAFF_ALLOWED_PATHS.includes(path)) return true;
  if (STAFF_ALLOWED_PREFIXES.some((p) => path.startsWith(p))) return true;
  return false;
}

function landingPathForRole(role) {
  if (role === 'staff') return '/pos/terminal';
  return '/';
}

const RealtimeSync = ({ branchId }) => {
  const utils = trpc.useUtils();
  const { data: config } = trpc.branchSettings.getPusherConfig.useQuery(
    undefined,
    { enabled: !!branchId, staleTime: Infinity }
  );

  useEffect(() => {
    if (!branchId || !config?.key || config.key === "mock_key" || config.key.includes("your-pusher-key")) {
      return;
    }

    try {
      const pusher = new Pusher(config.key, {
        cluster: config.cluster || "ap1",
        forceTLS: true,
      });

      const channelName = `branch-${branchId}`;
      const channel = pusher.subscribe(channelName);

      channel.bind("new_order", (data) => {
        console.log("[Realtime] Event: new_order", data);
        utils.orders.list.invalidate();
        utils.orders.listHeld.invalidate();
        utils.kitchen.listTickets.invalidate();

        const ev = new CustomEvent("hibi-toast", {
          detail: {
            label: `มีคำสั่งซื้อใหม่ #${data?.orderNumber || data?.id || ""} เข้ามา!`,
            type: "success",
          },
        });
        window.dispatchEvent(ev);

        // Chime sound
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.15);
          setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.25);
          }, 150);
        } catch (soundErr) {
          console.warn("Audio Context failed:", soundErr);
        }
      });

      channel.bind("order_updated", (data) => {
        console.log("[Realtime] Event: order_updated", data);
        utils.orders.list.invalidate();
        utils.orders.getById.invalidate({ id: data?.id });
        utils.kitchen.listTickets.invalidate();

        const ev = new CustomEvent("hibi-toast", {
          detail: {
            label: `ออเดอร์ #${data?.orderNumber || data?.id || ""} อัปเดตสถานะเป็น: ${data?.status || ""}`,
            type: "info",
          },
        });
        window.dispatchEvent(ev);
      });

      channel.bind("stock_low", (data) => {
        console.log("[Realtime] Event: stock_low", data);
        utils.inventory.listStock.invalidate();
        utils.reports.getDashboardStats.invalidate();

        const ev = new CustomEvent("hibi-toast", {
          detail: {
            label: `⚠️ วัตถุดิบใกล้หมด: ${data?.itemName || ""} (เหลือ ${data?.currentStock ?? 0} ${data?.unit || ""})`,
            type: "warning",
          },
        });
        window.dispatchEvent(ev);
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
        pusher.disconnect();
      };
    } catch (e) {
      console.error("[RealtimeSync] connection error:", e);
    }
  }, [branchId, config, utils]);

  return null;
};

const App = () => {
  const [route, setRoute] = useHashRoute();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('hibi-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  // Initial role: from localStorage cache, but will be overridden by session on mount
  const [role, setRole] = useState(() => localStorage.getItem('hibi-role') || 'super');
  const [branch, setBranchState] = useState(() => {
    // Hydrate branch from localStorage (single source of truth)
    try {
      const saved = localStorage.getItem('hibi-branch');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Fallback: try to get from authStore session
    const sess = authStoreRef.getSession();
    if (sess?.currentBranchId) return { id: sess.currentBranchId, name: 'Branch', sub: '', type: 'Branch' };
    
    const defaultBrand = import.meta.env.VITE_BRAND_NAME || 'Hibi Matcha';
    return { id: null, name: defaultBrand, sub: 'HQ', type: 'HQ' };
  });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [lang, setLangState] = useState(() => localStorage.getItem('hibi-lang') || 'en');
  const [staffSession, setStaffSession] = useState(() => {
    // Hydrate from authStore on first render (key: hibi-staff-token)
    try {
      const stored = localStorage.getItem('hibi-staff-token');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch { return null; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('hibi-theme', theme);
  }, [theme]);
  useEffect(() => { localStorage.setItem('hibi-role', role); }, [role]);

  // Route guard: enforce role-based access on every route change
  useEffect(() => {
    const [path] = route.split('?');
    // Allow public paths regardless of auth
    if (PUBLIC_PATHS.includes(path) || path.startsWith('/customer')) return;
    // If not logged in → redirect to login
    if (!staffSession) {
      if (path !== '/login' && path !== '/') {
        setRoute('/login');
      }
      return;
    }
    // Logged in → enforce role permissions
    if (!isPathAllowedForRole(path, role)) {
      setRoute(landingPathForRole(role));
      return;
    }
    // Force password/PIN change before using the system
    const liveSession = authStoreRef.getSession();
    const mustChangePwd = liveSession?.mustChangePassword;
    const mustChangePin = liveSession?.mustChangePin;
    if ((mustChangePwd || mustChangePin) && !path.startsWith('/settings/security')) {
      setRoute('/settings/security?force=1');
    }
  }, [route, role, staffSession]);
  useEffect(() => { localStorage.setItem('hibi-lang', lang); document.documentElement.lang = lang; }, [lang]);

  const setLang = (l) => setLangState(l);
  const t = createT(lang);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
      if (mod && e.key === 'd') { e.preventDefault(); setTheme(prev => prev === 'dark' ? 'light' : 'dark'); }
      if (e.key === 'Escape' && cmdOpen) setCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen]);

  useEffect(() => {
    let lastFire = 0;
    const handler = (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      if (btn.closest('[data-no-toast]')) return;
      const label = (btn.getAttribute('aria-label') || btn.title || btn.textContent.trim()).slice(0, 40);
      if (!label) return;
      const now = Date.now();
      if (now - lastFire < 700) return;
      const beforeHash = location.hash;
      const beforeModalCount = document.querySelectorAll('aside[aria-hidden]').length;
      setTimeout(() => {
        if (location.hash !== beforeHash) return;
        if (document.querySelectorAll('aside[aria-hidden]').length !== beforeModalCount) return;
        lastFire = now;
        const ev = new CustomEvent('hibi-toast', { detail: { label, type: 'success' } });
        window.dispatchEvent(ev);
      }, 80);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const setBranch = (b) => {
    setBranchState(b);
    // Persist to localStorage as single source of truth
    if (b?.id) {
      localStorage.setItem('hibi-branch', JSON.stringify(b));
    }
    // Sync authStore so POS and other pages read the correct branchId
    const sess = authStoreRef.getSession();
    const setSessionFn = authStoreRef.setSession;
    if (sess && b?.id) {
      setSessionFn({ ...sess, currentBranchId: b.id });
    }
  };
  const navigate = (path) => setRoute(path);

  // Sync role from staff session when logged in
  useEffect(() => {
    if (staffSession?.role === 'super_admin') setRole('super');
    else if (staffSession?.role === 'staff_admin') setRole('admin');
    else if (staffSession?.role === 'staff') setRole('staff');
  }, [staffSession]);

  const setStaff = (s) => {
    if (s) {
      setStaffSession(s);
      if (s.role === 'super_admin') setRole('super');
      else if (s.role === 'staff_admin') setRole('admin');
      else setRole('staff');
    } else {
      setStaffSession(null);
    }
  };

  const ctx = { route, navigate, theme, setTheme, role, setRole, branch, setBranch, cmdOpen, setCmdOpen, lang, setLang, t, staff: staffSession, setStaff };

  return (
    <AppCtx.Provider value={ctx}>
      <ToastProvider>
        <RealtimeSync branchId={branch?.id}/>
        <AppLayout>
          <Router route={route}/>
        </AppLayout>
      </ToastProvider>
    </AppCtx.Provider>
  );
};

export default App;
