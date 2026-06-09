// ============================================
// Page: dashboard
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { IconBowl,IconCupIced,IconPlus,IconWhisk } from "@/icons";
import { useApp,Checkbox,CountUp,Avatar,Sparkline,BarChart } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";


const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return { en: 'Good night', jp: '夜', icon: '🌙' };
  if (h < 11) return { en: 'Good morning', jp: '朝', icon: '☀' };
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
    { branchId, limit: 5 },
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: recentOrders } = trpc.orders.list.useQuery(
    { branchId, limit: 6, page: 1 },
    { refetchInterval: 15000 }
  );

  const revData = [320,440,520,610,720,890,1020,1180,1340,1520,1680,1490,1320,1180,1090,980,1110,1250,1420,1380,1280,1100,890,720];
  const todayRevenue = stats?.todayRevenue ?? 0;
  const todayOrders = stats?.todayOrders ?? 0;
  const avgOrderValue = stats?.averageOrderValue ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const lowStockCount = stats?.lowStockCount ?? 0;

  const orderFeed = useMemo(() => (recentOrders?.orders ?? []).slice(0, 6).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: Number(o.totalAmount ?? 0),
    time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    type: o.orderType ?? 'dine-in',
    status: o.status,
  })), [recentOrders]);

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="t-caption jp" style={{ color: 'var(--matcha-700)' }}>{g.jp} · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="page-title-row" style={{ marginTop: 8 }}>
          <div>
            <h1 className="page-title">{g.en}, {staff?.firstName || 'there'}</h1>
            <p className="page-desc">Here's what's happening at <b>{branch.name}</b> today.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/pos/terminal')}><IconPlus size={16}/> {t('receipt.newOrder')}</button>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: 16 }}>
        {/* HERO: Today's revenue */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{
            padding: 28,
            background: 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface) 60%)',
            position: 'relative', overflow: 'hidden',
            height: '100%',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, background: 'radial-gradient(circle, rgba(34,197,94,0.22), transparent 70%)' }}/>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="t-caption" style={{ color: 'var(--matcha-700)' }}>{t('dashboard.todaySales')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[t('today'), t('thisWeek'), t('thisMonth')].map((label, i) => (
                    <button key={label} style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 12,
                      background: i === 0 ? 'var(--bg-surface)' : 'transparent',
                      border: '1px solid ' + (i === 0 ? 'var(--border-default)' : 'transparent'),
                      color: i === 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.03em' }} className="tabular">฿<CountUp to={48720}/></span>
                <span style={{ color: 'var(--matcha-700)', fontWeight: 500, fontSize: 14 }}>+12.4%</span>
              </div>
              <div className="muted" style={{ marginBottom: 20 }}>vs. ฿43,328 yesterday · 142 orders served</div>

              {/* Hourly chart */}
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

        {/* Orders count */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-6-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div className="t-caption">{t('dashboard.totalOrders')}</div>
              <span className="pill pill-matcha"><span className="dot"/> Live</span>
            </div>
            <div className="tabular" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1 }}><CountUp to={142}/></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ color: 'var(--matcha-700)', fontSize: 13, fontWeight: 500 }}>+24</span>
              <span className="muted" style={{ fontSize: 13 }}>vs. yesterday</span>
            </div>
            <div style={{ marginTop: 16 }}><BarChart data={revData.slice(0, 12)} w={240} h={36}/></div>
          </div>
        </div>

        {/* Staff status */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-6-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div className="t-caption" style={{ marginBottom: 12 }}>{t('nav.staff')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: -8, marginBottom: 12 }}>
              {['Aoi T.', 'Ken M.', 'Mai S.', 'Ren K.', '+2'].map((n, i) => (
                <div key={n} style={{ marginLeft: i === 0 ? 0 : -8, position: 'relative', zIndex: 5 - i }}>
                  {i < 4 ? (
                    <Avatar name={n} size={36}/>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-muted)', display: 'grid', placeItems: 'center', border: '2px solid var(--bg-surface)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{n}</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span><b>6</b> <span className="muted">active</span></span>
              <span><b>2</b> <span className="muted">on break</span></span>
            </div>
          </div>
        </div>

        {/* AOV */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-6-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div className="t-caption">{t('dashboard.avgOrder')}</div>
            <div className="tabular" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>฿<CountUp to={343}/></div>
            <div style={{ color: 'var(--matcha-700)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>+฿18 ↑</div>
            <div style={{ marginTop: 14 }}><Sparkline data={[280, 295, 310, 305, 320, 335, 343]} w={240} h={36}/></div>
          </div>
        </div>

        {/* Top selling */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="t-h4" style={{ fontWeight: 600 }}>{t('dashboard.topItems')}</div>
                <div className="muted" style={{ fontSize: 13 }}>By revenue · across all categories</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/backoffice/orders')}>View all →</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {[
                { name: 'Iced Matcha Latte', cat: 'Signature', qty: 38, rev: 7600, icon: IconCupIced },
                { name: 'Hojicha Affogato', cat: 'Dessert', qty: 22, rev: 5060, icon: IconBowl },
                { name: 'Ceremonial Usucha', cat: 'Traditional', qty: 14, rev: 4900, icon: IconWhisk },
              ].map((it, i) => {
                const I = it.icon;
                return (
                  <div key={it.name} style={{ display: 'flex', gap: 12, padding: 10, borderRadius: 'var(--r-default)', background: 'var(--bg-muted)', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-surface)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none' }}><I size={22}/></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{it.cat}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
                        <span className="tabular">{it.qty} sold</span>
                        <span className="tabular">฿{it.rev.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Low stock */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="t-h4" style={{ fontWeight: 600 }}>{t('stock.lowAlert')}</div>
              <span className="pill pill-warning">3 items</span>
            </div>
            {[
              { name: 'Ceremonial Matcha', sub: '180g · 23%', val: 23 },
              { name: 'Oat Milk', sub: '6 L · 18%', val: 18 },
              { name: 'M-size Cold Cups', sub: '142 pcs · 32%', val: 32 },
            ].map((it, i) => (
              <div key={it.name} style={{ padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                  <div className="muted tabular" style={{ fontSize: 12 }}>{it.val}%</div>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: it.val + '%', background: it.val < 25 ? 'var(--warning)' : 'var(--matcha-500)', borderRadius: 2, transition: 'width 800ms var(--ease-out-expo)' }}/>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{it.sub}</div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate('/backoffice/inventory')}>{t('nav.inventory')} →</button>
          </div>
        </div>

        {/* Recent orders feed */}
        <div style={{ gridColumn: 'span 8' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div className="t-h4" style={{ fontWeight: 600 }}>{t('dashboard.recentOrders')}</div>
                <div className="muted" style={{ fontSize: 13 }}>Live feed · last 30 minutes</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--matcha-700)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--matcha-500)', animation: 'pulse-soft 1.6s ease-in-out infinite' }}/>
                Live
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {orderFeed.map((o, i) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-default)',
                  animation: `slideUp 400ms var(--ease-out-expo) ${i * 60}ms both`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--matcha-50)', color: 'var(--matcha-700)', display: 'grid', placeItems: 'center', flex: 'none' }} className="tabular"><span style={{ fontSize: 12, fontWeight: 600 }}>#{o.id}</span></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{o.items} item{o.items > 1 && 's'} · {o.type}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{o.time}</div>
                  </div>
                  <div className="tabular" style={{ fontSize: 14, fontWeight: 500 }}>฿{o.total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My tasks */}
        <div style={{ gridColumn: 'span 4' }} className="dash-span-12-mobile">
          <div className="card" style={{ padding: 22, height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="t-h4" style={{ fontWeight: 600 }}>My Tasks</div>
              <span className="pill">3 of 5</span>
            </div>
            {[
              { t: 'Acknowledge: Espresso prep SOP', due: 'Today', done: false, cat: 'SOP' },
              { t: 'Receive PO-0042 from Issan Co.', due: 'Today', done: false, cat: 'Inventory' },
              { t: 'Approve 2 SOP variants', due: 'Tomorrow', done: false, cat: 'Review' },
              { t: 'Read: Customer service guide', due: 'Mar 6', done: true, cat: 'SOP' },
              { t: 'Stock count: cold cups', due: 'Mar 8', done: true, cat: 'Inventory' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', alignItems: 'flex-start' }}>
                <Checkbox checked={t.done} onChange={() => {}}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.t}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    <span>{t.due}</span>
                    <span>·</span>
                    <span className="pill" style={{ height: 16, fontSize: 10, padding: '0 6px' }}>{t.cat}</span>
                  </div>
                </div>
              </div>
            ))}
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

