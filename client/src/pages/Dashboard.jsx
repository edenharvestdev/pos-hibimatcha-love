// ============================================
// Page: dashboard
// ============================================

import React, { useState, useMemo } from "react";
import { IconPlus } from "@/icons";
import { useApp, Checkbox, CountUp, Avatar, Sparkline, BarChart } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return { en: 'Good night', jp: '夜', icon: '🌙' };
  if (h < 11) return { en: 'Good morning', jp: '朝', icon: '☀️' };
  if (h < 14) return { en: 'Good afternoon', jp: '昼', icon: '🍵' };
  if (h < 18) return { en: 'Good afternoon', jp: '夕', icon: '☕' };
  return { en: 'Good evening', jp: '夜', icon: '🌙' };
};

export const PageDashboard = () => {
  const { branch, navigate, staff, t } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId || undefined;
  const g = greeting();

  const { data: stats, isLoading: statsLoading } = trpc.reports.getDashboardStats.useQuery(
    { branchId },
    { refetchInterval: 30000 }
  );
  const { data: topItems } = trpc.reports.getTopItemsReport.useQuery(
    { branchId, limit: 3 },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: recentOrders } = trpc.orders.list.useQuery(
    { branchId, limit: 6, page: 1 },
    { refetchInterval: 15000 }
  );
  const { data: lowStockItems = [] } = trpc.inventory.listStock.useQuery(
    { branchId: branchId ?? 0, lowStockOnly: true },
    { enabled: !!branchId, staleTime: 60000 }
  );

  const revData = [320,440,520,610,720,890,1020,1180,1340,1520,1680,1490,1320,1180,1090,980,1110,1250,1420,1380,1280,1100,890,720];
  const todayRevenue = stats?.todayRevenue ?? 0;
  const todayOrders = stats?.todayOrders ?? 0;
  const avgOrderValue = stats?.averageOrderValue ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const lowStockCount = stats?.lowStockCount ?? lowStockItems.length ?? 0;

  const topItemsList = useMemo(() => (topItems ?? []).slice(0, 3), [topItems]);

  const orderFeed = useMemo(() => (recentOrders?.orders ?? []).slice(0, 6).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.totalAmount ?? 0),
    time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    type: o.orderType ?? 'dine-in',
    status: o.status,
    items: o.items?.length ?? 0,
  })), [recentOrders]);

  const statusColor = (s) => s === 'completed' ? 'var(--matcha-600)' : s === 'pending' ? 'var(--warning)' : s === 'cancelled' ? 'var(--danger)' : 'var(--info)';

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="t-caption jp" style={{ color: 'var(--matcha-700)' }}>
            {g.jp} · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div className="page-title-row" style={{ marginTop: 8 }}>
          <div>
            <h1 className="page-title">{g.icon} {g.en}, {staff?.firstName || 'there'}</h1>
            <p className="page-desc">Here's what's happening at <b>{branch.name}</b> today.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/backoffice/reports')}>📊 Reports</button>
            <button className="btn btn-primary" onClick={() => navigate('/pos/terminal')}><IconPlus size={16}/> {t('receipt.newOrder')}</button>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: 16 }}>

        {/* HERO: Today's revenue */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{
            padding: 28,
            background: 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface) 60%)',
            position: 'relative', overflow: 'hidden', height: '100%',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, background: 'radial-gradient(circle, rgba(34,197,94,0.22), transparent 70%)' }}/>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="t-caption" style={{ color: 'var(--matcha-700)' }}>{t('dashboard.todaySales')}</div>
                <span className="pill pill-matcha" style={{ fontSize: 11 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)', animation: 'pulse-soft 1.6s ease-in-out infinite' }}/>
                  Live
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                {statsLoading ? (
                  <div className="skel" style={{ width: 240, height: 56, borderRadius: 8 }}/>
                ) : (
                  <>
                    <span style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em' }} className="tabular">฿<CountUp to={todayRevenue}/></span>
                    <span style={{ color: 'var(--matcha-700)', fontWeight: 500, fontSize: 14 }}>today</span>
                  </>
                )}
              </div>
              <div className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
                {todayOrders} orders · avg ฿{Math.round(avgOrderValue).toLocaleString()} per order
              </div>
              <div style={{ height: 120, position: 'relative' }}>
                <svg viewBox="0 0 720 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--matcha-500)" stopOpacity="0.45"/>
                      <stop offset="100%" stopColor="var(--matcha-500)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {(() => {
                    const max = Math.max(...revData);
                    const pts = revData.map((v, i) => [i * (720 / (revData.length - 1)), 120 - (v / max) * 100 - 8]);
                    const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
                    return (
                      <>
                        <path d={`${d} L 720 120 L 0 120 Z`} fill="url(#revGrad)"/>
                        <path d={d} stroke="var(--matcha-600)" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        {pts.map((p, i) => (i === pts.length - 1) && <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--matcha-600)" stroke="var(--bg-surface)" strokeWidth="2"/>)}
                      </>
                    );
                  })()}
                </svg>
                <div style={{ position: 'absolute', bottom: -22, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-quaternary)' }}>
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats column */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 16 }} className="dash-span-6-mobile">
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div className="t-caption">{t('dashboard.totalOrders')}</div>
              {pendingOrders > 0 && <span className="pill pill-warning" style={{ fontSize: 10 }}>⚡ {pendingOrders} pending</span>}
            </div>
            <div className="tabular" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1 }}>
              {statsLoading ? '–' : <CountUp to={todayOrders}/>}
            </div>
            <div style={{ marginTop: 10 }}><BarChart data={revData.slice(0, 12)} w={240} h={32}/></div>
          </div>

          <div className="card" style={{
            padding: 20, flex: 1,
            borderColor: lowStockCount > 0 ? 'rgba(217,119,6,0.3)' : 'var(--border-default)',
            background: lowStockCount > 0 ? 'linear-gradient(135deg, #fffbeb, var(--bg-surface))' : undefined,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div className="t-caption">{t('stock.lowAlert')}</div>
              {lowStockCount > 0 && <span className="pill pill-warning" style={{ fontSize: 10 }}>{lowStockCount}</span>}
            </div>
            <div className="tabular" style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1, color: lowStockCount > 0 ? 'var(--warning)' : 'var(--matcha-600)' }}>
              {statsLoading ? '–' : lowStockCount}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {lowStockCount > 0 ? 'items need restocking' : 'All stocked up ✓'}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%', fontSize: 12 }} onClick={() => navigate('/backoffice/inventory')}>
              View inventory →
            </button>
          </div>
        </div>

        {/* Top selling */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="t-h4" style={{ fontWeight: 600 }}>{t('dashboard.topItems')}</div>
                <div className="muted" style={{ fontSize: 13 }}>By revenue · today</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/backoffice/orders')}>View all →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topItemsList.length > 0 ? topItemsList.map((it, i) => (
                <div key={it.menuItemId ?? i} style={{
                  display: 'flex', gap: 12, padding: '10px 12px',
                  borderRadius: 'var(--r-default)', background: 'var(--bg-muted)',
                  alignItems: 'center',
                  animation: `slideUp 400ms var(--ease-out-expo) ${i * 80}ms both`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--matcha-100)', color: 'var(--matcha-800)', display: 'grid', placeItems: 'center', flex: 'none', fontSize: 14, fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name || it.menuItemName || `Item #${it.menuItemId}`}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{it.categoryName ?? '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>฿{Number(it.totalRevenue ?? 0).toLocaleString()}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{it.totalQuantity ?? 0} sold</div>
                  </div>
                </div>
              )) : (
                [
                  { name: 'Iced Matcha Latte', cat: 'Signature', qty: 38, rev: 7600 },
                  { name: 'Hojicha Affogato', cat: 'Dessert', qty: 22, rev: 5060 },
                  { name: 'Ceremonial Usucha', cat: 'Traditional', qty: 14, rev: 4900 },
                ].map((it, i) => (
                  <div key={it.name} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 'var(--r-default)', background: 'var(--bg-muted)', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--matcha-100)', color: 'var(--matcha-800)', display: 'grid', placeItems: 'center', flex: 'none', fontSize: 14, fontWeight: 700 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{it.name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{it.cat}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular" style={{ fontSize: 14, fontWeight: 600 }}>฿{it.rev.toLocaleString()}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{it.qty} sold</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AOV + sparkline */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-6-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div className="t-caption">{t('dashboard.avgOrder')}</div>
            <div className="tabular" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>
              ฿{statsLoading ? '–' : Math.round(avgOrderValue).toLocaleString()}
            </div>
            <div style={{ color: 'var(--matcha-700)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>Per order avg</div>
            <div style={{ marginTop: 14 }}><Sparkline data={[280, 295, 310, 305, 320, 335, Math.round(avgOrderValue) || 343]} w={240} h={36}/></div>
          </div>
        </div>

        {/* Recent orders feed */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div className="t-h4" style={{ fontWeight: 600 }}>{t('dashboard.recentOrders')}</div>
                <div className="muted" style={{ fontSize: 13 }}>Live feed · last orders</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--matcha-700)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)', animation: 'pulse-soft 1.6s ease-in-out infinite' }}/>
                Live
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {orderFeed.length > 0 ? orderFeed.map((o, i) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-default)',
                  animation: `slideUp 400ms var(--ease-out-expo) ${i * 60}ms both`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--matcha-50)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none' }} className="tabular">
                    <span style={{ fontSize: 11, fontWeight: 600 }}>#{o.id}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{o.items} item{o.items !== 1 ? 's' : ''} · <span style={{ color: 'var(--text-tertiary)' }}>{o.type}</span></div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.time}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `color-mix(in srgb, ${statusColor(o.status)} 12%, transparent)`, color: statusColor(o.status), fontWeight: 600, textTransform: 'capitalize' }}>{o.status}</span>
                  <div className="tabular" style={{ fontSize: 14, fontWeight: 500 }}>฿{o.total.toLocaleString()}</div>
                </div>
              )) : (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🍵</div>
                  <div style={{ fontSize: 13 }}>No orders yet today</div>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/pos/terminal')}>Open POS Terminal</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Low stock detail */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="t-h4" style={{ fontWeight: 600 }}>{t('stock.lowAlert')}</div>
              {lowStockItems.length > 0 && <span className="pill pill-warning">{lowStockItems.length} items</span>}
            </div>
            {lowStockItems.length > 0 ? lowStockItems.slice(0, 4).map((s, i) => {
              const pct = Math.min(100, Math.round((s.availableStock / (s.item?.reorderPoint || 100)) * 100));
              return (
                <div key={s.id ?? i} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.item?.nameThai || s.item?.name || '—'}</div>
                    <div className="muted tabular" style={{ fontSize: 12 }}>{s.availableStock} {s.item?.unitOfMeasure}</div>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: pct + '%', background: pct < 25 ? 'var(--warning)' : 'var(--matcha-500)', borderRadius: 2, transition: 'width 800ms var(--ease-out-expo)' }}/>
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--matcha-600)' }}>
                <div style={{ fontSize: 28 }}>✅</div>
                <div style={{ fontSize: 13, marginTop: 8, fontWeight: 500 }}>All stocks healthy</div>
              </div>
            )}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/backoffice/inventory')}>{t('nav.inventory')} →</button>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-span-6-mobile { grid-column: span 6 !important; }
          .dash-span-12-mobile { grid-column: span 12 !important; }
        }
        @media (max-width: 600px) {
          .dash-span-6-mobile, .dash-span-12-mobile { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  );
};
