// ============================================
// Page: sop
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { IconBell,IconBookmark,IconBox,IconCategories,IconCheck,IconCheckCircle,IconCheckList,IconChevRight,IconCommand,IconEdit,IconError,IconExport,IconImport,IconInfo,IconLeaf,IconList,IconMenu,IconPlus,IconSearch,IconWarning,IconWhisk,IconTrash,IconX,IconChevUp,IconChevDown } from "@/icons";
import { useApp,Drawer,Select,Toggle,Checkbox,Tabs,TopActionBar,Placeholder,SectionHeader,Avatar,Sparkline } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { getAutomation } from "@/lib/automationSettings";

const Stat = ({ label, value, color }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
  </div>
);


// ----- SOP Library -----
export const PageSOPLibrary = () => {
  const { navigate, role, route, branch } = useApp();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'hq_audit'
  // Detect whether we're in the staff-facing route (/sop) vs backoffice (/backoffice/sop)
  const isStaffView = role === 'staff' || (route || '').startsWith('/sop');
  const detailPrefix = isStaffView ? '/sop' : '/backoffice/sop';
  const canWrite = role === 'super' || role === 'admin';
  const archiveSop = trpc.sop.archive.useMutation({ onSuccess: () => refetchSops() });

  const { data: sops = [], isLoading, refetch: refetchSops } = trpc.sop.list.useQuery(
    { search: search || undefined, status: canWrite ? undefined : 'published', branchId: branch?.id || undefined },
    { staleTime: 15000 }
  );
  const { data: categories = [] } = trpc.sop.listCategories.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });

  const { data: complianceReport, isLoading: complianceLoading } = trpc.sop.getComplianceReport.useQuery(
    {},
    { enabled: activeTab === 'hq_audit' && role === 'super', staleTime: 15000 }
  );

  const filtered = activeCat === 'all' ? sops : sops.filter((s) => s.categoryId === activeCat);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Knowledge / SOP Library</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">SOP Library</h1>
            <p className="page-desc">{sops.length} SOPs · {categories.length} categories</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canWrite && <button className="btn btn-primary" onClick={() => navigate('/backoffice/sop/new')}><IconPlus size={16}/> Write SOP</button>}
            {isStaffView && <button className="btn btn-secondary" onClick={() => navigate('/sop/my-tasks')}><IconCheckList size={16}/> My Tasks</button>}
          </div>
        </div>
      </div>

      {role === 'super' && (
        <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-default)', marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('library')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'library' ? 'var(--matcha-600)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'library' ? '2px solid var(--matcha-600)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            SOP Library
          </button>
          <button
            onClick={() => setActiveTab('hq_audit')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === 'hq_audit' ? 'var(--matcha-600)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'hq_audit' ? '2px solid var(--matcha-600)' : '2px solid transparent',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            HQ Audit Dashboard
          </button>
        </div>
      )}

      {activeTab === 'library' && (
        <>
          <div className="card" style={{ padding: 6, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ paddingLeft: 16, color: 'var(--text-tertiary)' }}><IconSearch size={20}/></span>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs by title, content, tags…" style={{ border: 'none', boxShadow: 'none', height: 48, fontSize: 16, flex: 1, background: 'transparent' }}/>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflow: 'auto', paddingBottom: 4 }}>
            <button onClick={() => setActiveCat('all')} className={activeCat === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} style={{ whiteSpace: 'nowrap' }}>All</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={activeCat === c.id ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} style={{ whiteSpace: 'nowrap' }}>{c.name}</button>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {[1,2,3].map((i) => <div key={i} className="card" style={{ height: 260, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
              <IconBox size={36} style={{ opacity: 0.3 }}/>
              <p style={{ marginTop: 12, fontWeight: 500 }}>No SOPs yet</p>
              <p style={{ fontSize: 13 }}>{canWrite ? 'Create your first standard operating procedure.' : 'No SOPs have been published yet.'}</p>
              {canWrite && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/backoffice/sop/new')}><IconPlus size={14}/> Write SOP</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((s, i) => {
                const catName = catMap.get(s.categoryId) ?? 'Uncategorized';
                const author = s.authorStaffId ? `Staff #${s.authorStaffId}` : '—';
                const date = s.publishedAt ? new Date(s.publishedAt).toLocaleDateString() : '—';
                return (
                  <div key={s.id} className="card" style={{ overflow: 'hidden', position: 'relative', animation: `slideUp 360ms var(--ease-out-expo) ${i * 50}ms both`, transition: 'transform 240ms, box-shadow 240ms' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--glow-soft)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
                    <div onClick={() => navigate(`${detailPrefix}/${s.id}`)} style={{ position: 'relative', cursor: 'pointer' }}>
                      <Placeholder ratio="16/9" radius={0} label={catName}/>
                      {s.status === 'draft' && (
                        <span className="pill pill-warning" style={{ position: 'absolute', top: 10, left: 10, fontSize: 10 }}>DRAFT</span>
                      )}
                    </div>
                    {canWrite && (
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 2 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/backoffice/sop/new?id=${s.id}`); }}
                          className="btn btn-secondary btn-icon"
                          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.95)' }}
                          title="Edit SOP"
                        ><IconEdit size={12}/></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Archive "${s.title}"?`)) archiveSop.mutate({ id: s.id });
                          }}
                          className="btn btn-secondary btn-icon"
                          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.95)', color: 'var(--danger)' }}
                          title="Archive SOP"
                        ><IconError size={12}/></button>
                      </div>
                    )}
                    <div onClick={() => navigate(`${detailPrefix}/${s.id}`)} style={{ padding: 18, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span className="pill">{catName}</span>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                      {s.subtitle && <div className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.subtitle}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                        <Avatar name={author} size={20}/>
                        <span>{author}</span>
                        <span>·</span>
                        <span>{date}</span>
                        {s.version && <><span>·</span><span>v{s.version}</span></>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'hq_audit' && (
        <div>
          {complianceLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }} className="muted">Loading Compliance Audit Data...</div>
          ) : !complianceReport ? (
            <div style={{ textAlign: 'center', padding: 40 }} className="muted">Failed to load compliance data.</div>
          ) : (
            <div style={{ animation: 'fadeIn 240ms ease-out' }}>
              {/* Summary Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>OVERALL COMPLIANCE</div>
                  <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--matcha-700)', marginTop: 4 }}>{complianceReport.rate}%</div>
                  <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                    <div style={{ width: `${complianceReport.rate}%`, height: '100%', background: 'var(--matcha-500)' }}/>
                  </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>TOTAL SOPS</div>
                  <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>{complianceReport.totalSops}</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>ACTIVE STAFF</div>
                  <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>{complianceReport.totalStaff}</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>ACKNOWLEDGED / PENDING</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 12 }}>
                    <span style={{ color: 'var(--matcha-700)' }}>{complianceReport.acknowledged}</span> / <span style={{ color: 'var(--danger)' }}>{complianceReport.pending}</span>
                  </div>
                </div>
              </div>

              {/* Compliance Matrix Table */}
              <div className="card" style={{ padding: 24, overflowX: 'auto' }}>
                <div className="t-h4" style={{ fontWeight: 600, marginBottom: 16 }}>Acknowledgment Compliance Matrix</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Staff Member</th>
                      {complianceReport.items.map((it) => (
                        <th key={it.sop.id} style={{ padding: '12px 8px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.sop.title}>
                          {it.sop.title}
                        </th>
                      ))}
                      <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right' }}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceReport.staffList.map((st) => {
                      const staffAcks = complianceReport.acknowledgments.filter((a) => a.staffId === st.id);
                      const requiredSops = complianceReport.items.map((it) => it.sop);
                      const ackedCount = requiredSops.filter((sop) => staffAcks.some((a) => a.sopId === sop.id)).length;
                      const pct = requiredSops.length > 0 ? Math.round((ackedCount / requiredSops.length) * 100) : 100;

                      return (
                        <tr key={st.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 8px', fontSize: 13, fontWeight: 500 }}>
                            <div>{st.firstName} {st.lastName}</div>
                            <div className="muted" style={{ fontSize: 11 }}>Code: {st.employeeCode || '#'+st.id}</div>
                          </td>
                          {requiredSops.map((sop) => {
                            const hasAck = staffAcks.some((a) => a.sopId === sop.id);
                            return (
                              <td key={sop.id} style={{ padding: '14px 8px' }}>
                                {hasAck ? (
                                  <span style={{ color: 'var(--matcha-600)', display: 'inline-flex', alignItems: 'center' }} title="Acknowledged">
                                    <IconCheckCircle size={18} />
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-quaternary)', display: 'inline-flex', alignItems: 'center' }} title="Pending acknowledgment">
                                    <IconError size={18} />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '14px 8px', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>
                            <span style={{ color: pct === 100 ? 'var(--matcha-700)' : 'var(--text-secondary)' }}>
                              {ackedCount}/{requiredSops.length} ({pct}%)
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ----- SOP Detail (reading) -----
// Drawer that lets an admin link an SOP to a set of menu items.
// Reads current linked items + lets you toggle each menu item by checkbox.
const SopLinkMenuDrawer = ({ open, onClose, sopId, sopTitle }) => {
  const { data: allMenu = [] } = trpc.menu.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true, enabled: open });
  const { data: linkedItems = [], refetch } = trpc.menu.listBySop.useQuery(
    { sopId }, { enabled: open && !!sopId, staleTime: 0 }
  );
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('');
  const linkMut = trpc.menu.linkSopToMenuItems.useMutation({
    onSuccess: () => { refetch(); onClose(); },
    onError: (e) => alert(e.message || 'Link failed'),
  });

  // Reset selection when opening with current linked items
  useEffect(() => {
    if (open) {
      setSelected(new Set(linkedItems.map((it) => it.id)));
    }
  }, [open, linkedItems.length]);

  const filtered = allMenu.filter((it) => !filter ||
    it.name?.toLowerCase().includes(filter.toLowerCase()) ||
    it.sku?.toLowerCase().includes(filter.toLowerCase())
  );

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const save = () => {
    const currentlyLinked = new Set(linkedItems.map((it) => it.id));
    const toLink = Array.from(selected).filter((id) => !currentlyLinked.has(id));
    const toUnlink = Array.from(currentlyLinked).filter((id) => !selected.has(id));
    if (toLink.length === 0 && toUnlink.length === 0) { onClose(); return; }
    // Two calls: link + unlink
    const tasks = [];
    if (toLink.length > 0) tasks.push(linkMut.mutateAsync({ sopId, menuItemIds: toLink }));
    if (toUnlink.length > 0) tasks.push(linkMut.mutateAsync({ sopId: null, menuItemIds: toUnlink }));
    Promise.all(tasks).catch(() => {});
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Link SOP to menu items"
      subtitle={sopTitle}
      width={560}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={linkMut.isPending}>
          {linkMut.isPending ? 'Saving…' : `Save (${selected.size} item${selected.size === 1 ? '' : 's'})`}
        </button>
      </>}
    >
      <div style={{ padding: 12, background: 'var(--matcha-50)', borderRadius: 'var(--r-default)', fontSize: 13, color: 'var(--matcha-700)', marginBottom: 16 }}>
        Picked menu items will show this SOP as "How to prepare" in the POS option sheet.
        Each item can only link to one SOP.
      </div>
      <input
        className="input"
        placeholder="Search menu items…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      <div className="card" style={{ padding: 0, overflow: 'auto', maxHeight: 460 }}>
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 20, textAlign: 'center', fontSize: 13 }}>
            {allMenu.length === 0 ? 'No menu items yet.' : 'No matches for that search.'}
          </div>
        ) : filtered.map((it, i) => {
          const on = selected.has(it.id);
          return (
            <div
              key={it.id}
              onClick={() => toggle(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', cursor: 'pointer',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-default)',
                background: on ? 'var(--matcha-50)' : 'transparent',
              }}
            >
              <Checkbox checked={on} onChange={() => {}}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{it.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{it.sku} · ฿{it.basePrice}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
};

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

export const PageSOPDetail = () => {
  const { navigate, route } = useApp();
  const [acked, setAcked] = useState(false);
  const [autoAckTriggered, setAutoAckTriggered] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);

  // Extract SOP id from route like /backoffice/sop/42 or /sop/42
  const sopId = useMemo(() => {
    const path = (route || '').split('?')[0];
    const m = path.match(/\/sop\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [route]);

  const { data: sop, isLoading } = trpc.sop.getById.useQuery(
    { id: sopId ?? 0 },
    { enabled: !!sopId }
  );
  const acknowledge = trpc.sop.acknowledge.useMutation({
    onSuccess: () => setAcked(true),
    onError: (e) => alert(e.message),
  });

  // Automation: auto-acknowledge — gated by Settings → Automation toggle.
  // Manual Acknowledge button always works as fallback.
  useEffect(() => {
    if (!getAutomation().autoAcknowledgeSOP) return;
    if (!sop?.id || !sop?.requiresAcknowledgment || acked) return;
    const startedAt = Date.now();
    const onScroll = () => {
      const scrollPos = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const nearBottom = scrollPos >= docHeight - 100;
      const onPageLongEnough = Date.now() - startedAt > 5000;
      if (nearBottom && onPageLongEnough && !autoAckTriggered) {
        setAutoAckTriggered(true);
        acknowledge.mutate({ sopId: sop.id });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sop?.id, sop?.requiresAcknowledgment, acked, autoAckTriggered]);

  const updated = sop?.updatedAt ? new Date(sop.updatedAt).toLocaleDateString() : '—';

  if (!sopId) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">No SOP specified</div>;
  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading SOP…</div>;
  if (!sop) return <div style={{ padding: 40, textAlign: 'center' }} className="muted">SOP not found</div>;

  return (
    <div style={{ position: 'relative' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        {sop.coverImageUrl ? (
          <img src={sop.coverImageUrl} alt={sop.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--matcha-600), var(--matcha-800))' }}/>
        )}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'radial-gradient(circle at 30% 40%, var(--matcha-400), transparent 50%), radial-gradient(circle at 70% 70%, var(--gold), transparent 50%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))' }}/>
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '32px 40px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Knowledge / SOP Library</div>
          <div className="t-display" style={{ fontWeight: 600, maxWidth: 800 }}>{sop.title}</div>
          {sop.subtitle && <div style={{ marginTop: 12, fontSize: 16, opacity: 0.85, maxWidth: 640 }}>{sop.subtitle}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, fontSize: 13, opacity: 0.85, flexWrap: 'wrap' }}>
            <span>Version {sop.version ?? 1}</span>
            <span>·</span>
            <span>Updated {updated}</span>
            <span>·</span>
            <span>{sop.status}</span>
            {sop.requiresAcknowledgment && (
              <>
                <span>·</span>
                <button
                  onClick={() => acknowledge.mutate({ sopId: sop.id })}
                  disabled={acked || acknowledge.isPending}
                  className="btn btn-primary btn-sm"
                  style={{ background: acked ? 'var(--matcha-700)' : undefined }}
                >
                  {acked ? <><IconCheck size={14}/> Acknowledged</> : (acknowledge.isPending ? 'Acknowledging…' : 'Acknowledge')}
                </button>
              </>
            )}
            {(getSession()?.role === 'super_admin' || getSession()?.role === 'staff_admin') && (
              <>
                <span>·</span>
                <button
                  onClick={() => setLinkMenuOpen(true)}
                  className="btn btn-secondary btn-sm"
                  title="Link this SOP to menu items so baristas see it on POS"
                >
                  <IconMenu size={14}/> Push to POS menu
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Link-to-menu drawer */}
      <SopLinkMenuDrawer
        open={linkMenuOpen}
        onClose={() => setLinkMenuOpen(false)}
        sopId={sop.id}
        sopTitle={sop.title}
      />

      <div style={{ maxWidth: 1200, margin: '-40px auto 0', padding: '0 40px 80px', position: 'relative', display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr) 240px', gap: 32 }} className="sop-grid">
        {/* TOC */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }} className="sop-aside">
          <div className="t-caption" style={{ marginBottom: 12 }}>Contents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { l: 'Introduction', active: true },
              { l: 'Equipment & ingredients' },
              { l: 'Step-by-step', sub: ['Sift', 'Add water', 'Whisk', 'Serve'] },
              { l: 'Common mistakes' },
              { l: 'Pro tips' },
              { l: 'FAQ' },
            ].map((it, i) => (
              <div key={it.l}>
                <a href="#" style={{ display: 'block', padding: '6px 10px', fontSize: 13, fontWeight: it.active ? 500 : 400, color: it.active ? 'var(--matcha-700)' : 'var(--text-secondary)', background: it.active ? 'var(--matcha-50)' : 'transparent', borderRadius: 6, borderLeft: '2px solid ' + (it.active ? 'var(--matcha-600)' : 'transparent') }}>{it.l}</a>
                {it.sub && it.sub.map((s) => <a key={s} href="#" style={{ display: 'block', padding: '4px 10px 4px 22px', fontSize: 12, color: 'var(--text-tertiary)' }}>{s}</a>)}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <div style={{ marginBottom: 4 }}>Reading progress · 32%</div>
            <div style={{ height: 3, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: '32%', height: '100%', background: 'var(--matcha-500)' }}/>
            </div>
          </div>
        </aside>

        {/* Content */}
        <article className="card" style={{ padding: 48, fontSize: 16, lineHeight: 1.8, color: 'var(--text-primary)', maxWidth: 780, justifySelf: 'center' }}>
          {sop.videoUrl && (
            <div style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-default)', background: 'black' }}>
              {(() => {
                const ytUrl = getYoutubeEmbedUrl(sop.videoUrl);
                if (ytUrl) {
                  return (
                    <iframe
                      width="100%"
                      height="360"
                      src={ytUrl}
                      title="SOP Video Tutorial"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{ display: 'block' }}
                    />
                  );
                }
                return (
                  <video
                    src={sop.videoUrl}
                    controls
                    style={{ width: '100%', display: 'block', maxHeight: 400 }}
                  />
                );
              })()}
            </div>
          )}
          {(() => {
            const c = sop.content;
            if (!c) {
              return <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No content yet.</p>;
            }
            if (typeof c === 'string') {
              return <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{c}</div>;
            }
            if (Array.isArray(c)) {
              return c.map((block, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  {block.type === 'heading' && <h2 style={{ fontSize: 24, fontWeight: 600, margin: '24px 0 12px' }}>{block.text}</h2>}
                  {block.type === 'paragraph' && <p style={{ color: 'var(--text-secondary)' }}>{block.text}</p>}
                  {block.type === 'list' && block.items && (
                    <ul style={{ paddingLeft: 24, color: 'var(--text-secondary)' }}>
                      {block.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  )}
                  {block.type === 'callout' && (
                    <div style={{ background: 'var(--matcha-50)', border: '1px solid var(--matcha-200)', borderRadius: 'var(--r-md)', padding: '14px 18px', margin: '16px 0', display: 'flex', gap: 12 }}>
                      <span style={{ color: 'var(--matcha-700)' }}><IconInfo size={20}/></span>
                      <div style={{ fontSize: 14, color: 'var(--matcha-900)' }}>{block.text}</div>
                    </div>
                  )}
                </div>
              ));
            }
            // Fallback: render as JSON
            return <pre style={{ background: 'var(--bg-muted)', padding: 16, borderRadius: 8, fontSize: 13, overflow: 'auto' }}>{JSON.stringify(c, null, 2)}</pre>;
          })()}
        </article>

        {/* Right rail */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }} className="sop-aside">
          <div className="t-caption" style={{ marginBottom: 12 }}>Related</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {['Ice-cold matcha 101', 'Hojicha brewing basics', 'Latte art for matcha'].map((r) => (
              <a key={r} href="#" className="card" style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <IconLeaf size={16} style={{ color: 'var(--matcha-600)' }}/>
                {r}
              </a>
            ))}
          </div>
          <div className="t-caption" style={{ marginBottom: 12 }}>Acknowledged by</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: -8 }}>
            {['Aoi T.', 'Ken M.', 'Mai S.', 'Ren K.', 'Hana Y.', '+6'].map((n, i) => (
              <div key={n} style={{ marginLeft: i === 0 ? 0 : -6, position: 'relative', zIndex: 6 - i }}>
                {i < 5 ? <Avatar name={n} size={26}/> : (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-muted)', border: '2px solid var(--bg-surface)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>{n}</div>
                )}
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>11 of 13 staff complete</div>
        </aside>
      </div>

      {/* Sticky ack bar */}
      <div className="glass" style={{
        position: 'sticky', bottom: 0, zIndex: 30,
        padding: '14px 40px',
        borderTop: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        {acked ? (
          <>
            <span style={{ color: 'var(--matcha-600)' }}><IconCheckCircle size={20}/></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>Acknowledged on Mar 6, 2026 · 14:32</div>
              <div className="muted" style={{ fontSize: 12 }}>11 of 13 staff complete</div>
            </div>
            <button className="btn btn-secondary btn-sm">View activity</button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, fontSize: 14 }}>I have read and understood this SOP.</div>
            <button className="btn btn-primary" onClick={() => setAcked(true)}><IconCheck size={16}/> Acknowledge</button>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .sop-grid { grid-template-columns: 1fr !important; padding: 0 20px 60px !important; }
          .sop-aside { position: static !important; }
        }
      `}</style>
    </div>
  );
};

// ----- SOP Templates -----
const templateMatchaLatte = [
  {
    "type": "heading",
    "text": "อุปกรณ์ที่ต้องใช้ชงมัทฉะ"
  },
  {
    "type": "list",
    "items": [
      "แปรงตีชา Chasen (ไม้ไผ่)",
      "ถ้วยชงชา Chawan",
      "ช้อนตักชา Chashaku",
      "เครื่องชั่งดิจิทัล (ทศนิยม 1 ตำแหน่ง)",
      "ที่ร่อนผงชา"
    ]
  },
  {
    "type": "heading",
    "text": "ส่วนผสมและสัดส่วน"
  },
  {
    "type": "list",
    "items": [
      "ผงมัทฉะ Hibi Premium Match 4 กรัม",
      "น้ำร้อน (อุณหภูมิ 80 องศาเซลเซียส) 40 มิลลิลิตร",
      "นมสดแช่เย็นจัด 120 มิลลิลิตร",
      "น้ำเชื่อมปลอก 10 มิลลิลิตร (หากสั่งหวานปกติ)"
    ]
  },
  {
    "type": "heading",
    "text": "ขั้นตอนการปรุงปฏิบัติงาน"
  },
  {
    "type": "list",
    "items": [
      "ร่อนผงมัทฉะ 4 กรัมลงในถ้วย Chawan เพื่อไม่ให้ผงชาจับตัวเป็นก้อน",
      "เทน้ำร้อน 80 องศาลงไป 40 มิลลิลิตร",
      "ใช้แปรง Chasen ตีชาด้วยการขยับข้อมือเป็นรูปตัว W อย่างรวดเร็วประมาณ 15-20 วินาทีจนเกิดฟองเนียนละเอียด (Microfoam)",
      "เติมนมสดเย็นและน้ำเชื่อมลงในแก้วเสิร์ฟ จากนั้นค่อยๆ เทน้ำมัทฉะที่ตีเสร็จแล้วราดด้านบนให้เกิดชั้นสีที่สวยงาม"
    ]
  },
  {
    "type": "callout",
    "text": "ข้อควรระวัง: ห้ามใช้น้ำเดือดจัด 100 องศามาชงมัทฉะเด็ดขาด เพราะจะทำให้ชามีรสขมฝาดและสูญเสียกลิ่นหอมธรรมชาติ"
  }
];

const templateOpening = [
  {
    "type": "heading",
    "text": "เช็คลิสต์เตรียมความพร้อมก่อนเปิดร้าน (07:30 - 08:00 น.)"
  },
  {
    "type": "heading",
    "text": "1. การเตรียมระบบและเครื่อง POS"
  },
  {
    "type": "list",
    "items": [
      "เปิดเครื่อง POS และลิ้นชักเก็บเงิน",
      "ตรวจสอบระบบอินเทอร์เน็ตและเครื่องพิมพ์ใบเสร็จ (ทดสอบพิมพ์ Test Slip)",
      "นับเงินทอนตั้งต้นเข้าระบบจำนวน 3,000 บาท ถ้วน"
    ]
  },
  {
    "type": "heading",
    "text": "2. การเตรียมวัตถุดิบและอุปกรณ์บาร์"
  },
  {
    "type": "list",
    "items": [
      "เช็คอุณหภูมิตู้เย็นเก็บนมสดและวัตถุดิบแช่เย็น (ต้องอยู่ระหว่าง 2 - 4 องศาเซลเซียส)",
      "เติมนมสด ขนมเค้ก และไซรัปในชั้นวางบาร์ตามหลัก FIFO (มาก่อนใช้ก่อน)",
      "เปิดเครื่องทำน้ำแข็งและทำความสะอาดที่ตักน้ำแข็ง"
    ]
  },
  {
    "type": "callout",
    "text": "สำคัญ: หากพบวัตถุดิบหมดอายุหรือไม่ได้มาตรฐาน ให้รีบลงบันทึกในใบตัดจ่าย Inventory ทันทีและแจ้งผู้จัดการร้าน"
  }
];

const templateClosing = [
  {
    "type": "heading",
    "text": "เช็คลิสต์การเคลียร์ยอดและทำความสะอาดร้านหลังปิดบริการ"
  },
  {
    "type": "heading",
    "text": "1. การปิดยอดการเงิน (Reconcile Cash & Sales)"
  },
  {
    "type": "list",
    "items": [
      "กดพิมพ์รายงานปิดกะ (Shift Report) จาก POS",
      "นับยอดเงินสดในลิ้นชักและเปรียบเทียบกับยอดขายในระบบ",
      "ส่งยอดสรุปการเงินทาง Google Sheet และ LINE Group ของร้าน"
    ]
  },
  {
    "type": "heading",
    "text": "2. การดูแลความสะอาดบาร์ชงและร้าน"
  },
  {
    "type": "list",
    "items": [
      "ล้างทำความสะอาดอุปกรณ์ทุกชิ้น (แปรงไม้ไผ่ ถ้วยชงชา เครื่องชง) และผึ่งลมให้แห้ง",
      "เช็ดทำความสะอาดหน้าบาร์ เครื่อง POS และเคลียร์ขยะออกจากร้าน",
      "ตรวจสอบปลั๊กไฟ ปิดแอร์ และระบบไฟแสงสว่างทั้งหมดก่อนล็อคร้าน"
    ]
  },
  {
    "type": "callout",
    "text": "คำเตือน: ห้ามแช่แปรง Chasen ไว้ในน้ำข้ามคืนเด็ดขาด เพราะจะทำให้ไม้ไผ่ขึ้นราและชำรุดเสียหายได้ง่าย"
  }
];

const smartParseTextToBlocks = (text) => {
  const content = (text || '').trim();
  if (!content) return [{ type: 'paragraph', text: '' }];

  // Try to parse as JSON array first
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

  // Plain text fallback parsing
  const lines = content.split('\n');
  const parsedBlocks = [];
  let currentList = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentList) {
        parsedBlocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Check if list item
    const listMatch = trimmed.match(/^[-*•]\s+(.*)$/) || trimmed.match(/^\d+[\s.)-]+\s*(.*)$/);
    if (listMatch) {
      const itemText = listMatch[1];
      if (!currentList) {
        currentList = { type: 'list', items: [] };
      }
      currentList.items.push(itemText);
    } else {
      if (currentList) {
        parsedBlocks.push(currentList);
        currentList = null;
      }

      if (trimmed.startsWith('#')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        parsedBlocks.push({ type: 'heading', text: headingText });
      } else if (
        trimmed.toLowerCase().startsWith('warning:') ||
        trimmed.toLowerCase().startsWith('note:') ||
        trimmed.toLowerCase().startsWith('สำคัญ:') ||
        trimmed.startsWith('ระวัง:')
      ) {
        parsedBlocks.push({ type: 'callout', text: trimmed });
      } else {
        parsedBlocks.push({ type: 'paragraph', text: trimmed });
      }
    }
  }
  if (currentList) {
    parsedBlocks.push(currentList);
  }
  return parsedBlocks.length > 0 ? parsedBlocks : [{ type: 'paragraph', text: '' }];
};

// ----- SOP Editor (Notion-style) -----
export const PageSOPEditor = () => {
  const { navigate } = useApp();
  const session = getSession();

  // Parse `?id=N` from hash for edit mode
  const editId = useMemo(() => {
    const hash = window.location.hash || '';
    const q = hash.split('?')[1];
    if (!q) return null;
    const params = new URLSearchParams(q);
    const id = params.get('id');
    return id ? Number(id) : null;
  }, []);

  const isEditMode = editId != null;

  const { data: existing, isLoading: loadingExisting } = trpc.sop.getById.useQuery(
    { id: editId },
    { enabled: isEditMode, staleTime: 0 }
  );
  const { data: categories = [] } = trpc.sop.listCategories.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    titleThai: '',
    categoryId: null,
    content: '',
    requiresAcknowledgment: true,
    allowBranchVariants: false,
    acknowledgmentDeadlineDays: 7,
    tags: [],
    coverImageUrl: '',
    videoUrl: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [statusLabel, setStatusLabel] = useState('Draft');

  const [editorMode, setEditorMode] = useState('visual'); // visual | code
  const [blocks, setBlocks] = useState([{ type: 'paragraph', text: '' }]);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState(null);
  const codeTextareaRef = useRef(null);

  const applyTemplate = (templateBlocks) => {
    setBlocks(templateBlocks);
    setForm((f) => ({ ...f, content: JSON.stringify(templateBlocks, null, 2) }));
  };

  const handleListKeyDown = (e, blockIdx, itemIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...blocks];
      const items = [...(next[blockIdx].items || [])];
      items.splice(itemIdx + 1, 0, '');
      next[blockIdx] = { ...next[blockIdx], items };
      setBlocks(next);

      setTimeout(() => {
        const selector = `[data-block-idx="${blockIdx}"] input`;
        const inputs = document.querySelectorAll(selector);
        if (inputs[itemIdx + 1]) {
          inputs[itemIdx + 1].focus();
        }
      }, 10);
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const next = [...blocks];
      const items = [...(next[blockIdx].items || [])];
      if (items.length > 1) {
        items.splice(itemIdx, 1);
        next[blockIdx] = { ...next[blockIdx], items };
        setBlocks(next);

        setTimeout(() => {
          const selector = `[data-block-idx="${blockIdx}"] input`;
          const inputs = document.querySelectorAll(selector);
          const prevIdx = itemIdx - 1 >= 0 ? itemIdx - 1 : 0;
          if (inputs[prevIdx]) {
            inputs[prevIdx].focus();
          }
        }, 10);
      } else {
        next[blockIdx] = { type: 'paragraph', text: '' };
        setBlocks(next);
      }
    }
  };

  const insertTextAtCursor = (textToInsert) => {
    const textarea = codeTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    let currentContent = form.content.trim();

    if (!currentContent) {
      const formatted = `[\n  ${textToInsert.trim().replace(/^,|,$/g, '')}\n]`;
      setForm((f) => ({ ...f, content: formatted }));
      return;
    }

    const fullContent = form.content;
    const newContent = fullContent.substring(0, start) + textToInsert + fullContent.substring(end);
    setForm((f) => ({ ...f, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  // Hydrate form when loading existing SOP
  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || '',
        subtitle: existing.subtitle || '',
        titleThai: existing.titleThai || '',
        categoryId: existing.categoryId ?? null,
        content: typeof existing.content === 'string'
          ? existing.content
          : (existing.content ? JSON.stringify(existing.content, null, 2) : ''),
        requiresAcknowledgment: existing.requiresAcknowledgment !== false,
        allowBranchVariants: !!existing.allowBranchVariants,
        acknowledgmentDeadlineDays: existing.acknowledgmentDeadlineDays ?? 7,
        tags: Array.isArray(existing.tags) ? existing.tags : [],
        coverImageUrl: existing.coverImageUrl || '',
        videoUrl: existing.videoUrl || '',
      });
      setStatusLabel(existing.status === 'published' ? 'Published' : existing.status === 'archived' ? 'Archived' : 'Draft');

      // Hydrate blocks if JSON content
      let initialBlocks = [];
      let mode = 'visual';
      if (existing.content) {
        if (typeof existing.content === 'string') {
          try {
            const parsed = JSON.parse(existing.content);
            if (Array.isArray(parsed)) {
              initialBlocks = parsed;
            } else {
              mode = 'code';
            }
          } catch (e) {
            if (existing.content.trim()) {
              mode = 'code';
            }
          }
        } else if (Array.isArray(existing.content)) {
          initialBlocks = existing.content;
        }
      }
      setBlocks(initialBlocks.length > 0 ? initialBlocks : [{ type: 'paragraph', text: '' }]);
      setEditorMode(mode);
    }
  }, [existing?.id]);

  useEffect(() => {
    if (editorMode === 'visual') {
      setForm((f) => ({ ...f, content: JSON.stringify(blocks, null, 2) }));
    }
  }, [blocks, editorMode]);

  const createSop = trpc.sop.create.useMutation();
  const updateSop = trpc.sop.update.useMutation();
  const publishSop = trpc.sop.publish.useMutation();

  const buildPayload = () => {
    let parsedContent = form.content;
    if (typeof form.content === 'string') {
      try {
        parsedContent = JSON.parse(form.content);
      } catch (e) {
        // Keep as string
      }
    }
    return {
      title: form.title.trim(),
      titleThai: form.titleThai.trim() || undefined,
      subtitle: form.subtitle.trim() || undefined,
      categoryId: form.categoryId || undefined,
      content: parsedContent,
      requiresAcknowledgment: form.requiresAcknowledgment,
      allowBranchVariants: form.allowBranchVariants,
      acknowledgmentDeadlineDays: Number(form.acknowledgmentDeadlineDays) || undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
    };
  };

  const handleSaveDraft = async () => {
    if (!form.title.trim()) { alert('Please enter a title'); return; }
    try {
      if (isEditMode) {
        await updateSop.mutateAsync({ id: editId, ...buildPayload() });
      } else {
        const created = await createSop.mutateAsync(buildPayload());
        if (created?.id) {
          window.location.hash = `/backoffice/sop/new?id=${created.id}`;
        }
      }
      setSavedAt(new Date());
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) { alert('Please enter a title before publishing'); return; }
    if (!window.confirm('Publish this SOP? It will be visible to all assigned staff.')) return;
    try {
      let id = editId;
      if (!id) {
        const created = await createSop.mutateAsync(buildPayload());
        id = created?.id;
      } else {
        await updateSop.mutateAsync({ id: editId, ...buildPayload() });
      }
      if (id) {
        await publishSop.mutateAsync({ id });
        setStatusLabel('Published');
        setTimeout(() => navigate('/backoffice/sop'), 600);
      }
    } catch (err) {
      alert('Publish failed: ' + (err.message || 'Unknown error'));
    }
  };

  const isSaving = createSop.isPending || updateSop.isPending;
  const isPublishing = publishSop.isPending;

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { setTagInput(''); return; }
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput('');
  };
  const removeTag = (t) => setForm({ ...form, tags: form.tags.filter((x) => x !== t) });

  if (loadingExisting) {
    return <div style={{ padding: 60, textAlign: 'center' }} className="muted">Loading SOP…</div>;
  }

  const statusPillClass = statusLabel === 'Published' ? 'pill-matcha' : statusLabel === 'Archived' ? '' : 'pill-warning';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', minHeight: 'calc(100vh - 60px)' }} className="sop-editor-grid">
      <div style={{ overflow: 'auto' }}>
        <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 5 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/backoffice/sop')}>← Back</button>
          <span className={'pill ' + statusPillClass}><span className="dot"/> {statusLabel}</span>
          {savedAt && <span className="muted" style={{ fontSize: 12 }}>· Saved {new Date(savedAt).toLocaleTimeString()}</span>}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft} disabled={isSaving || isPublishing}>{isSaving ? 'Saving…' : 'Save Draft'}</button>
          {statusLabel !== 'Published' && (
            <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={isSaving || isPublishing}>{isPublishing ? 'Publishing…' : 'Publish'}</button>
          )}
        </div>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 40px' }}>
          <div style={{ height: 200, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, var(--matcha-100), var(--matcha-300))', marginBottom: 32, display: 'grid', placeItems: 'center', color: 'var(--matcha-800)' }}>
            <IconWhisk size={64}/>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Untitled SOP"
            style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.025em', margin: 0, outline: 'none', border: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)' }}
          />
          <input
            value={form.titleThai}
            onChange={(e) => setForm({ ...form, titleThai: e.target.value })}
            placeholder="ชื่อภาษาไทย (optional)"
            style={{ fontSize: 18, margin: '8px 0 4px', outline: 'none', border: 'none', background: 'transparent', width: '100%', color: 'var(--text-secondary)' }}
          />
          <input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Short subtitle or summary"
            className="muted"
            style={{ fontSize: 20, lineHeight: 1.4, margin: '12px 0 32px', outline: 'none', border: 'none', background: 'transparent', width: '100%' }}
          />

          {/* Editor Mode Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', padding: 3, gap: 2 }}>
              <button
                type="button"
                onClick={() => {
                  const parsed = smartParseTextToBlocks(form.content);
                  setBlocks(parsed);
                  setEditorMode('visual');
                }}
                className="btn btn-xs"
                style={{
                  background: editorMode === 'visual' ? 'var(--bg-surface)' : 'transparent',
                  color: editorMode === 'visual' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: editorMode === 'visual' ? 'var(--shadow-xs)' : 'none',
                  padding: '4px 12px',
                  fontSize: 12,
                }}
              >
                Visual Editor (ตัวสร้างบล็อก)
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('code')}
                className="btn btn-xs"
                style={{
                  background: editorMode === 'code' ? 'var(--bg-surface)' : 'transparent',
                  color: editorMode === 'code' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: editorMode === 'code' ? 'var(--shadow-xs)' : 'none',
                  padding: '4px 12px',
                  fontSize: 12,
                }}
              >
                Raw Text / JSON (โค้ดดิบ)
              </button>
            </div>
          </div>

          {/* Unified SOP Toolbar */}
          <div
            className="glass"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border-default)',
              marginBottom: 20,
              background: 'var(--bg-surface)',
            }}
          >
            {/* Left: Quick Actions */}
            {editorMode === 'visual' ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>แทรกบล็อก:</span>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'heading', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Heading
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'paragraph', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'list', items: [''] }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + List
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'callout', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Callout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>แทรกโค้ดดิบ:</span>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'heading', text: 'กรอกหัวข้อตรงนี้' }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Heading
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'paragraph', text: 'กรอกเนื้อหาตรงนี้' }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'list', items: ['รายการข้อที่ 1', 'รายการข้อที่ 2'] }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + List
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'callout', text: 'ข้อความเตือนหรือข้อเสนอแนะ' }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Callout
                </button>
                <span style={{ borderLeft: '1px solid var(--border-default)', height: 16, margin: '0 4px' }} />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = smartParseTextToBlocks(form.content);
                    setForm((f) => ({ ...f, content: JSON.stringify(parsed, null, 2) }));
                    setBlocks(parsed);
                  }}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px', color: 'var(--matcha-700)' }}
                  title="แปลงข้อความดิบหรือบทความให้เป็นโครงสร้าง JSON บล็อกที่ถูกต้อง"
                >
                  ⚡ แปลงเป็น JSON บล็อก
                </button>
              </div>
            )}

            {/* Right: Templates Dropdown */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                className="btn btn-secondary btn-xs"
                style={{ fontSize: 11, padding: '4px 10px', color: 'var(--matcha-700)', border: '1px solid var(--matcha-200)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <IconBookmark size={12} />
                เลือกเทมเพลตคู่มือ (SOP Templates)
                <IconChevDown size={10} />
              </button>

              {templateDropdownOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                    onClick={() => setTemplateDropdownOpen(false)}
                  />
                  <div
                    className="glass"
                    style={{
                      position: 'absolute',
                      top: '28px',
                      right: 0,
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--r-md)',
                      boxShadow: 'var(--shadow-md)',
                      padding: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      minWidth: '220px',
                      zIndex: 100,
                    }}
                  >
                    {[
                      { label: 'สูตรชงชา Matcha Latte', blocks: templateMatchaLatte },
                      { label: 'ขั้นตอนการเปิดร้าน (Opening)', blocks: templateOpening },
                      { label: 'ขั้นตอนการปิดร้าน (Closing)', blocks: templateClosing },
                    ].map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          if (window.confirm(`ต้องการใช้เทมเพลต "${t.label}" ใช่หรือไม่? เนื้อหาเดิมที่เขียนอยู่จะถูกแทนที่ทั้งหมด`)) {
                            applyTemplate(t.blocks);
                            setTemplateDropdownOpen(false);
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          fontSize: '12px',
                          borderRadius: 'var(--r-subtle)',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        📄 {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {editorMode === 'visual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {blocks.map((block, idx) => {
                const isHovered = hoveredIdx === idx;
                const isDropdownOpen = activeDropdownIdx === idx;
                const showControls = isHovered || isDropdownOpen;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => {
                      setHoveredIdx(null);
                      setActiveDropdownIdx(null);
                    }}
                    style={{
                      position: 'relative',
                      padding: '12px 16px',
                      borderRadius: 'var(--r-md)',
                      background: isHovered ? 'var(--bg-muted)' : 'transparent',
                      border: '1px solid ' + (isHovered ? 'var(--border-default)' : 'transparent'),
                      transition: 'background 150ms ease, border-color 150ms ease',
                      minHeight: '40px',
                    }}
                  >
                    {/* Floating Controls on Left */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-62px',
                        top: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        opacity: showControls ? 1 : 0,
                        pointerEvents: showControls ? 'auto' : 'none',
                        transition: 'opacity 150ms ease',
                        zIndex: 10,
                      }}
                    >
                      {/* Block Type Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdownIdx(isDropdownOpen ? null : idx)}
                          className="btn btn-secondary btn-icon"
                          style={{ width: '26px', height: '26px', borderRadius: '50%', padding: 0 }}
                          title="เปลี่ยนประเภทบล็อก"
                        >
                          {block.type === 'heading' && <span style={{ fontWeight: 'bold', fontSize: '10px' }}>H</span>}
                          {block.type === 'paragraph' && <span style={{ fontSize: '12px' }}>¶</span>}
                          {block.type === 'list' && <IconList size={12} />}
                          {block.type === 'callout' && <IconInfo size={12} />}
                        </button>

                        {isDropdownOpen && (
                          <>
                            <div
                              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                              onClick={() => setActiveDropdownIdx(null)}
                            />
                            <div
                              className="glass"
                              style={{
                                position: 'absolute',
                                top: '30px',
                                left: 0,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 'var(--r-md)',
                                boxShadow: 'var(--shadow-md)',
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                minWidth: '160px',
                                zIndex: 100,
                              }}
                            >
                              {[
                                { value: 'paragraph', label: 'ย่อหน้า (Paragraph)', icon: '¶' },
                                { value: 'heading', label: 'หัวข้อ (Heading)', icon: 'H' },
                                { value: 'list', label: 'รายการข้อ (List)', icon: <IconList size={12} /> },
                                { value: 'callout', label: 'กล่องเตือน (Callout)', icon: <IconInfo size={12} /> },
                              ].map((opt) => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    const next = [...blocks];
                                    const nextType = opt.value;
                                    let nextBlock = { type: nextType };
                                    if (nextType === 'list') {
                                      nextBlock.items = block.text ? block.text.split('\n') : [''];
                                    } else {
                                      nextBlock.text = block.text || (block.items ? block.items.join('\n') : '');
                                    }
                                    next[idx] = nextBlock;
                                    setBlocks(next);
                                    setActiveDropdownIdx(null);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 8px',
                                    fontSize: '12px',
                                    borderRadius: 'var(--r-subtle)',
                                    background: block.type === opt.value ? 'var(--matcha-50)' : 'transparent',
                                    color: block.type === opt.value ? 'var(--matcha-700)' : 'var(--text-primary)',
                                    border: 'none',
                                    width: '100%',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (block.type !== opt.value) e.currentTarget.style.background = 'var(--bg-muted)';
                                  }}
                                  onMouseLeave={(e) => {
                                    if (block.type !== opt.value) e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <span style={{ width: '16px', display: 'inline-flex', justifyContent: 'center' }}>{opt.icon}</span>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...blocks];
                          const temp = copy[idx];
                          copy[idx] = copy[idx - 1];
                          copy[idx - 1] = temp;
                          setBlocks(copy);
                        }}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '22px', height: '22px', borderRadius: '50%', padding: 0, opacity: idx === 0 ? 0.3 : 1 }}
                        title="ย้ายขึ้น"
                      >
                        <IconChevUp size={10} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === blocks.length - 1}
                        onClick={() => {
                          const copy = [...blocks];
                          const temp = copy[idx];
                          copy[idx] = copy[idx + 1];
                          copy[idx + 1] = temp;
                          setBlocks(copy);
                        }}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '22px', height: '22px', borderRadius: '50%', padding: 0, opacity: idx === blocks.length - 1 ? 0.3 : 1 }}
                        title="ย้ายลง"
                      >
                        <IconChevDown size={10} />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('ต้องการลบบล็อกนี้ใช่หรือไม่?')) {
                            setBlocks(blocks.filter((_, i) => i !== idx));
                          }
                        }}
                        className="btn btn-secondary btn-icon"
                        style={{ width: '22px', height: '22px', borderRadius: '50%', padding: 0, color: 'var(--danger)' }}
                        title="ลบบล็อก"
                      >
                        <IconTrash size={10} />
                      </button>
                    </div>

                    {/* Block Content Inputs */}
                    <div style={{ paddingLeft: '4px' }}>
                      {block.type === 'heading' && (
                        <input
                          type="text"
                          value={block.text || ''}
                          onChange={(e) => {
                            const next = [...blocks];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setBlocks(next);
                          }}
                          placeholder="หัวข้อ (Heading)..."
                          style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            width: '100%',
                            color: 'var(--text-primary)',
                            padding: '4px 0',
                          }}
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <textarea
                          value={block.text || ''}
                          onChange={(e) => {
                            const next = [...blocks];
                            next[idx] = { ...next[idx], text: e.target.value };
                            setBlocks(next);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="พิมพ์เนื้อหาย่อหน้าตรงนี้..."
                          rows={1}
                          style={{
                            fontSize: '15px',
                            lineHeight: '1.6',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            width: '100%',
                            color: 'var(--text-secondary)',
                            padding: '4px 0',
                            resize: 'none',
                            overflow: 'hidden',
                          }}
                        />
                      )}

                      {block.type === 'callout' && (
                        <div style={{
                          background: 'var(--matcha-50)',
                          borderLeft: '4px solid var(--matcha-500)',
                          borderRadius: 'var(--r-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          width: '100%',
                          marginTop: '4px',
                        }}>
                          <span style={{ color: 'var(--matcha-700)', marginTop: 2 }}><IconInfo size={18} /></span>
                          <textarea
                            value={block.text || ''}
                            onChange={(e) => {
                              const next = [...blocks];
                              next[idx] = { ...next[idx], text: e.target.value };
                              setBlocks(next);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={(e) => {
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="พิมพ์ข้อความแจ้งเตือนหรือข้อควรระวัง..."
                            rows={1}
                            style={{
                              fontSize: '14px',
                              lineHeight: '1.5',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              width: '100%',
                              color: 'var(--matcha-900)',
                              padding: 0,
                              resize: 'none',
                              overflow: 'hidden',
                            }}
                          />
                        </div>
                      )}

                      {block.type === 'list' && (
                        <div data-block-idx={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '4px' }}>
                          {(block.items || []).map((itemVal, itemIdx) => (
                            <div key={itemIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="muted" style={{ fontSize: 13, minWidth: 20, textAlign: 'right', userSelect: 'none' }}>
                                {itemIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={itemVal || ''}
                                onChange={(e) => {
                                  const next = [...blocks];
                                  const nextItems = [...(next[idx].items || [])];
                                  nextItems[itemIdx] = e.target.value;
                                  next[idx] = { ...next[idx], items: nextItems };
                                  setBlocks(next);
                                }}
                                onKeyDown={(e) => handleListKeyDown(e, idx, itemIdx)}
                                placeholder="รายละเอียดรายการ..."
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  outline: 'none',
                                  padding: '4px 0',
                                  fontSize: '14px',
                                  color: 'var(--text-secondary)',
                                  flex: 1,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...blocks];
                                  const items = (next[idx].items || []).filter((_, i) => i !== itemIdx);
                                  next[idx] = { ...next[idx], items: items.length > 0 ? items : [''] };
                                  setBlocks(next);
                                }}
                                className="btn btn-ghost"
                                style={{
                                  color: 'var(--danger)',
                                  width: 20,
                                  height: 20,
                                  minWidth: 20,
                                  padding: 0,
                                  borderRadius: '50%',
                                  opacity: isHovered ? 0.6 : 0,
                                  transition: 'opacity 150ms',
                                }}
                                title="ลบข้อนี้"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...blocks];
                              next[idx] = { ...next[idx], items: [...(next[idx].items || []), ''] };
                              setBlocks(next);
                              setTimeout(() => {
                                const inputs = document.querySelectorAll(`[data-block-idx="${idx}"] input`);
                                if (inputs.length > 0) {
                                  inputs[inputs.length - 1].focus();
                                }
                              }, 10);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{ alignSelf: 'flex-start', color: 'var(--matcha-600)', fontSize: 12, padding: '2px 8px', marginTop: 2 }}
                          >
                            + เพิ่มข้อใหม่
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Blocks Panel */}
              <div style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 24,
                padding: '16px',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--r-md)',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.02)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: 8 }}>+ เพิ่มบล็อกใหม่:</span>
                {[
                  { type: 'heading', label: 'หัวข้อ (Heading)', defaultVal: { type: 'heading', text: '' } },
                  { type: 'paragraph', label: 'ย่อหน้า (Paragraph)', defaultVal: { type: 'paragraph', text: '' } },
                  { type: 'list', label: 'รายการข้อ (List)', defaultVal: { type: 'list', items: [''] } },
                  { type: 'callout', label: 'กล่องเตือน (Callout)', defaultVal: { type: 'callout', text: '' } },
                ].map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => setBlocks([...blocks, b.defaultVal])}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'var(--bg-surface)', fontSize: 12 }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <textarea
              ref={codeTextareaRef}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder={`Start writing the SOP content here…\n\nYou can use plain text or JSON blocks like:\n\n[{ "type": "heading", "text": "Equipment" }, { "type": "list", "items": ["Chasen whisk", "Bowl"] }]`}
              style={{
                width: '100%',
                minHeight: 400,
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--r-md)',
                padding: 16,
                background: 'var(--bg-surface)',
                fontFamily: 'var(--font-mono)',
                resize: 'vertical',
              }}
            />
          )}
        </div>
      </div>

      <aside style={{ background: 'var(--bg-muted)', borderLeft: '1px solid var(--border-default)', padding: 24, overflow: 'auto' }}>
        <div className="t-caption" style={{ marginBottom: 14 }}>Properties</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row label="Category">
            <select
              className="input"
              value={form.categoryId ?? ''}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Row>
          <Row label="Tags">
            <div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {form.tags.map((t) => (
                  <span key={t} className="pill" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>{t} ×</span>
                ))}
              </div>
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
                style={{ fontSize: 12 }}
              />
            </div>
          </Row>
          <Row label="Required ack">
            <Toggle checked={form.requiresAcknowledgment} onChange={(v) => setForm({ ...form, requiresAcknowledgment: v })}/>
          </Row>
          <Row label="Deadline (days)">
            <input
              className="input"
              type="number"
              min="1"
              value={form.acknowledgmentDeadlineDays}
              onChange={(e) => setForm({ ...form, acknowledgmentDeadlineDays: e.target.value })}
            />
          </Row>
          <Row label="Branch variants">
            <Toggle checked={form.allowBranchVariants} onChange={(v) => setForm({ ...form, allowBranchVariants: v })}/>
          </Row>
          <Row label="Cover Image">
            <input
              className="input"
              placeholder="https://..."
              value={form.coverImageUrl || ''}
              onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
              style={{ fontSize: 12 }}
            />
          </Row>
          <Row label="Video URL">
            <input
              className="input"
              placeholder="https://... (mp4/YouTube)"
              value={form.videoUrl || ''}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              style={{ fontSize: 12 }}
            />
          </Row>
          <Row label="Status"><span className={'pill ' + statusPillClass}>{statusLabel}</span></Row>
        </div>

        {existing && (
          <>
            <div style={{ height: 24 }}/>
            <div className="t-caption" style={{ marginBottom: 14 }}>Meta</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <div>Author: Staff #{existing.authorStaffId}</div>
              <div>Version: {existing.version ?? 1}</div>
              <div>Created: {existing.createdAt ? new Date(existing.createdAt).toLocaleString() : '—'}</div>
              {existing.publishedAt && <div>Published: {new Date(existing.publishedAt).toLocaleString()}</div>}
            </div>
          </>
        )}
      </aside>
      <style>{`
        @media (max-width: 1100px) { .sop-editor-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

const Row = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, alignItems: 'center', fontSize: 13 }}>
    <div className="muted">{label}</div>
    <div>{children}</div>
  </div>
);

// ----- Approval Queue -----
export const PageSOPApprovalQueue = () => {
  const { data: variants = [], isLoading, refetch } = trpc.sop.listVariants.useQuery(
    { status: 'pending' },
    { staleTime: 15000 }
  );
  const approve = trpc.sop.approveVariant.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const reject = trpc.sop.rejectVariant.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Knowledge / Approval Queue</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Approval Queue</h1>
            <p className="page-desc">Pending variant requests from franchise branches</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="t-caption" style={{ fontSize: 10, color: 'var(--warning)' }}>Pending</div>
          <div className="tabular" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{variants.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading requests…</div>
      ) : variants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <IconCheckCircle size={36} style={{ opacity: 0.3 }}/>
          <p style={{ marginTop: 12 }}>No pending variant requests.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {variants.map((r) => {
            const at = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—';
            return (
              <div key={r.id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <Avatar name={`Staff #${r.requestedByStaffId}`} size={44}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>Staff #{r.requestedByStaffId}</span>
                      <span className="muted" style={{ fontSize: 13 }}>Branch #{r.branchId}</span>
                      <span className="muted" style={{ fontSize: 12 }}>· {at}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
                      Requested variant for master SOP <b style={{ color: 'var(--text-primary)' }}>#{r.masterSopId}</b>
                    </div>
                  </div>
                  <span className="pill pill-warning">Pending review</span>
                </div>

                {r.changeReason && (
                  <div className="card" style={{ padding: 16, marginBottom: 12, background: 'var(--bg-muted)' }}>
                    <div className="t-caption" style={{ marginBottom: 8 }}>Reason for variant</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{r.changeReason}</div>
                  </div>
                )}

                {r.changesSummary && (
                  <>
                    <div className="t-caption" style={{ marginBottom: 8 }}>Changes summary</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-muted)', padding: 12, borderRadius: 'var(--r-default)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
                      {r.changesSummary}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { const reason = prompt('Reason for rejection:') ?? ''; if (reason) reject.mutate({ variantId: r.id, reason }); }}
                    disabled={reject.isPending}
                    className="btn btn-secondary"
                  ><IconError size={14}/> Reject</button>
                  <button
                    onClick={() => approve.mutate({ variantId: r.id })}
                    disabled={approve.isPending}
                    className="btn btn-primary"
                  ><IconCheck size={14}/> Approve</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----- Compliance dashboard -----
export const PageSOPCompliance = () => {
  const { branch } = useApp();
  const { data: report, isLoading } = trpc.sop.getComplianceReport.useQuery(
    { branchId: branch?.id || undefined },
    { staleTime: 15000 }
  );

  const compliantPct = report?.rate ?? 0;
  const dashOffset = 2 * Math.PI * 90 * (compliantPct / 100);

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Knowledge / Compliance</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Compliance Dashboard</h1>
            <p className="page-desc">SOP acknowledgments across all staff</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }} className="inv-grid">
        <div className="card" style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg viewBox="0 0 240 240" style={{ width: 220, height: 220 }}>
            <circle cx="120" cy="120" r="90" fill="none" stroke="var(--bg-subtle)" strokeWidth="16"/>
            <circle cx="120" cy="120" r="90" fill="none" stroke="var(--matcha-500)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${dashOffset} ${2 * Math.PI * 90}`} transform="rotate(-90 120 120)"/>
            <text x="120" y="118" textAnchor="middle" fontSize="14" fill="var(--text-tertiary)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compliant</text>
            <text x="120" y="148" textAnchor="middle" fontSize="42" fontWeight="600" fill="var(--text-primary)" style={{ letterSpacing: '-0.02em' }}>{compliantPct}%</text>
          </svg>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <SectionHeader title="Compliance overview" desc={isLoading ? 'Loading…' : 'Across all published SOPs'}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            <Stat label="Acknowledged" value={String(report?.acknowledged ?? 0)} color="var(--matcha-700)"/>
            <Stat label="Pending" value={String(report?.pending ?? 0)}/>
            <Stat label="SOPs Tracked" value={String(report?.totalSops ?? 0)} color="var(--text-tertiary)"/>
          </div>
        </div>
      </div>

      {(report?.items ?? []).length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['SOP', 'Acknowledged', 'Required', '%'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report?.items ?? []).map((d) => {
                const pct = d.totalRequired > 0 ? Math.round((d.acknowledgedCount / d.totalRequired) * 100) : 0;
                return (
                  <tr key={d.sop.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{d.sop.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--matcha-700)' }} className="tabular">{d.acknowledgedCount}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }} className="tabular">{d.totalRequired}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: pct >= 80 ? 'var(--matcha-500)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}/>
                        </div>
                        <span className="tabular" style={{ fontWeight: 500 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ----- My Variants -----
export const PageSOPVariants = () => {
  const { branch } = useApp();
  const [tab, setTab] = useState('all');

  const { data: variants = [], isLoading, refetch } = trpc.sop.listVariants.useQuery(
    { branchId: branch?.id || undefined },
    { staleTime: 15000 }
  );
  const { data: sops = [] } = trpc.sop.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true });
  const withdrawVariant = trpc.sop.withdrawVariant.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => alert(e.message || 'Withdraw failed'),
  });

  const sopMap = useMemo(() => new Map(sops.map((s) => [s.id, s])), [sops]);

  const counts = {
    all: variants.length,
    pending: variants.filter((v) => v.status === 'pending').length,
    approved: variants.filter((v) => v.status === 'approved').length,
    rejected: variants.filter((v) => v.status === 'rejected').length,
    withdrawn: variants.filter((v) => v.status === 'withdrawn').length,
  };

  const filtered = tab === 'all' ? variants : variants.filter((v) => v.status === tab);

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    const days = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return dt.toLocaleDateString();
  };

  const pillFor = (status) => ({
    pending: 'pill-warning',
    approved: 'pill-matcha',
    rejected: 'pill-danger',
    withdrawn: '',
  }[status] || '');

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Knowledge / My Variants</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">My Branch Variants</h1>
            <p className="page-desc">{counts.all} request{counts.all !== 1 ? 's' : ''} · {counts.pending} pending review</p>
          </div>
          <button className="btn btn-primary" disabled title="Request a variant from a master SOP detail page"><IconPlus size={16}/> Request New Variant</button>
        </div>
      </div>

      <Tabs items={[
        { value: 'all', label: 'All Variants', count: counts.all },
        { value: 'pending', label: 'Pending', count: counts.pending },
        { value: 'approved', label: 'Approved', count: counts.approved },
        { value: 'rejected', label: 'Rejected', count: counts.rejected },
      ]} value={tab} onChange={setTab}/>

      {isLoading ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center', marginTop: 16 }}>Loading variants…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)', marginTop: 16 }}>
          <IconBookmark size={36} style={{ opacity: 0.3 }}/>
          <p style={{ marginTop: 12 }}>No {tab === 'all' ? '' : tab} variant requests yet.</p>
          <p className="muted" style={{ fontSize: 13 }}>Open a master SOP to request a branch-specific variant.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {filtered.map((v) => {
            const master = sopMap.get(v.masterSopId);
            return (
              <div key={v.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{master?.title || `Master SOP #${v.masterSopId}`}</span>
                    <span className={'pill ' + pillFor(v.status)}><span className="dot"/> {v.status}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {v.changeReason ? <>Reason: {v.changeReason}</> : <>No reason provided</>} · submitted {fmtDate(v.createdAt)}
                  </div>
                  {v.reviewNotes && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 6, padding: 8, background: 'var(--bg-muted)', borderRadius: 'var(--r-subtle)' }}>
                      <strong>Review notes:</strong> {v.reviewNotes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {v.status === 'pending' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => {
                        if (window.confirm('Withdraw this variant request?')) {
                          withdrawVariant.mutate({ variantId: v.id });
                        }
                      }}
                      disabled={withdrawVariant.isPending}
                    >Withdraw</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----- My Tasks -----
export const PageSOPMyTasks = () => {
  const { navigate } = useApp();
  const session = getSession();
  const { data: tasks = [], isLoading, refetch } = trpc.sop.listMyTasks.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });
  const startTask = trpc.sop.startTask.useMutation({ onSuccess: () => refetch() });
  const completeTask = trpc.sop.completeTask.useMutation({ onSuccess: () => refetch() });

  const now = Date.now();
  const overdue = tasks.filter((t) => t.status === 'overdue' || (t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== 'completed'));
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const pending = tasks.filter((t) => t.status === 'pending' && !overdue.includes(t));
  const completed = tasks.filter((t) => t.status === 'completed');

  const greetingName = session?.firstName || 'there';
  const totalDone = completed.length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const sections = [
    { l: 'Overdue', c: 'var(--danger)', tasks: overdue },
    { l: 'Due Soon', c: 'var(--warning)', tasks: pending },
    { l: 'In Progress', c: 'var(--matcha-600)', tasks: inProgress },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="t-caption jp" style={{ color: 'var(--matcha-700)' }}>朝 · Good morning</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Hello, {greetingName}</h1>
            <p className="page-desc">{totalTasks > 0 ? `You're ${pct}% through your training.` : 'No tasks assigned yet.'}</p>
          </div>
          {totalTasks > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-subtle)" strokeWidth="6"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--matcha-500)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 32 * (pct / 100)} ${2 * Math.PI * 32}`} transform="rotate(-90 40 40)"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <span className="tabular" style={{ fontSize: 18, fontWeight: 600 }}>{totalDone}/{totalTasks}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">Loading tasks…</div>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
          <IconCheckCircle size={36} style={{ opacity: 0.3 }}/>
          <p style={{ marginTop: 12, fontWeight: 500 }}>You're all caught up</p>
          <p style={{ fontSize: 13 }}>No outstanding SOP tasks.</p>
        </div>
      ) : sections.map((sec) => (
        <div key={sec.l} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingTop: 12, borderTop: '3px solid ' + sec.c, paddingLeft: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: sec.c, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{sec.l}</span>
            <span className="muted" style={{ fontSize: 13 }}>{sec.tasks.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {sec.tasks.map((t) => {
              const dueLabel = t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : 'No deadline';
              return (
                <div key={t.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span className="pill">SOP #{t.sopId}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t.status}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{t.sop?.title ?? `Task #${t.id}`}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{dueLabel}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <button
                        onClick={() => navigate(`/sop/${t.sopId}`)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                      >Read</button>
                      {t.status === 'pending' && (
                        <button
                          onClick={() => startTask.mutate({ taskId: t.id })}
                          disabled={startTask.isPending}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >Start</button>
                      )}
                      {t.status === 'in_progress' && (
                        <button
                          onClick={() => completeTask.mutate({ taskId: t.id })}
                          disabled={completeTask.isPending}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                        >Complete</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};


// ----- Material Usage & Cost Tracking -----
export const PageSOPMaterialUsage = () => {
  const { branch } = useApp();
  const branchId = branch?.id;
  const [tab, setTab] = useState('recipes');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [expandedMenu, setExpandedMenu] = useState(null);

  const { data: recipeCosts = [], isLoading: recipesLoading } = trpc.sop.getRecipeCosts.useQuery(
    { branchId: branchId || undefined },
    { staleTime: 10000, refetchOnWindowFocus: true }
  );
  const { data: usageHistory = [], isLoading: historyLoading } = trpc.sop.getMaterialUsageHistory.useQuery(
    { branchId: branchId || 0, dateFrom, dateTo, limit: 100 },
    { enabled: !!branchId && tab === 'history', staleTime: 10000, refetchOnWindowFocus: true }
  );
  const { data: usageSummary, isLoading: summaryLoading } = trpc.sop.getMaterialUsageSummary.useQuery(
    { branchId: branchId || 0, dateFrom, dateTo },
    { enabled: !!branchId && tab === 'summary', staleTime: 10000, refetchOnWindowFocus: true }
  );

  const fmtNum = (n) => n != null ? Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
  const fmtCurrency = (n) => `฿${fmtNum(n)}`;

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Knowledge / Material Usage</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">วัตถุดิบ & ต้นทุน</h1>
            <p className="page-desc">ติดตามการใช้วัตถุดิบ ต้นทุนต่อแก้ว และสถานะสต็อก (Real-time)</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Tabs
          items={[
            { value: 'recipes', label: 'สูตร & ต้นทุน' },
            { value: 'history', label: 'ประวัติการตัดยอด' },
            { value: 'summary', label: 'สรุปการใช้วัตถุดิบ' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {(tab === 'history' || tab === 'summary') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>จากวันที่</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>ถึงวันที่</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" />
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div>
          {recipesLoading ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังโหลดข้อมูลสูตร...</div>
          ) : recipeCosts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <p style={{ fontSize: 16, marginBottom: 8 }}>ยังไม่มีสูตรวัตถุดิบ</p>
              <p style={{ fontSize: 13 }}>กรุณาตั้งค่าสูตร (Recipe) ในหน้า Menu Management ก่อน</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 8 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>เมนูที่มีสูตร</div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{recipeCosts.length}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>ต้นทุนเฉลี่ย/แก้ว</div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {fmtCurrency(recipeCosts.reduce((s, r) => s + r.totalCostPerCup, 0) / (recipeCosts.length || 1))}
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Margin เฉลี่ย</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--matcha-700)' }}>
                    {Math.round(recipeCosts.reduce((s, r) => s + r.marginPercent, 0) / (recipeCosts.length || 1))}%
                  </div>
                </div>
              </div>
              {recipeCosts.map((item) => (
                <div key={item.menuItemId} className="card" style={{ overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedMenu(expandedMenu === item.menuItemId ? null : item.menuItemId)}
                    style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: expandedMenu === item.menuItemId ? 'var(--bg-muted)' : 'transparent' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{item.menuItemName}</div>
                      {item.menuItemNameThai && <div className="muted" style={{ fontSize: 12 }}>{item.menuItemNameThai}</div>}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>ต้นทุน/แก้ว</div>
                      <div style={{ fontWeight: 600 }}>{fmtCurrency(item.totalCostPerCup)}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>ราคาขาย</div>
                      <div style={{ fontWeight: 500 }}>{fmtCurrency(item.basePrice)}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 60 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Margin</div>
                      <div style={{ fontWeight: 600, color: item.marginPercent >= 50 ? 'var(--matcha-700)' : item.marginPercent >= 30 ? 'var(--warning)' : 'var(--danger)' }}>
                        {item.marginPercent}%
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>{expandedMenu === item.menuItemId ? '▼' : '▶'}</span>
                  </div>
                  {expandedMenu === item.menuItemId && (
                    <div style={{ borderTop: '1px solid var(--border-default)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-muted)' }}>
                            {['วัตถุดิบ', 'ปริมาณ/แก้ว', 'หน่วย', 'ราคา/หน่วย', 'ต้นทุน/แก้ว', 'สต็อกปัจจุบัน', 'ทำได้ (แก้ว)'].map((h) => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {item.ingredients.map((ing) => (
                            <tr key={ing.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                {ing.name}
                                {ing.nameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>({ing.nameThai})</span>}
                              </td>
                              <td style={{ padding: '10px 12px' }}>{fmtNum(ing.quantityPerCup)}</td>
                              <td style={{ padding: '10px 12px' }}>{ing.unitOfMeasure}</td>
                              <td style={{ padding: '10px 12px' }}>{fmtCurrency(ing.costPerUnit)}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{fmtCurrency(ing.costPerCup)}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {ing.currentStock !== null ? (
                                  <span style={{ color: ing.currentStock <= 0 ? 'var(--danger)' : ing.currentStock < 100 ? 'var(--warning)' : 'var(--matcha-700)' }}>
                                    {fmtNum(ing.currentStock)} {ing.unitOfMeasure}
                                  </span>
                                ) : <span className="muted">-</span>}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {ing.cupsAvailable !== null ? (
                                  <span style={{ fontWeight: 600, color: ing.cupsAvailable <= 5 ? 'var(--danger)' : ing.cupsAvailable <= 20 ? 'var(--warning)' : 'var(--matcha-700)' }}>
                                    {ing.cupsAvailable}
                                  </span>
                                ) : <span className="muted">-</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span className="muted">กำไร/แก้ว: <b style={{ color: 'var(--matcha-700)' }}>{fmtCurrency(item.profitPerCup)}</b></span>
                        <span className="muted">วัตถุดิบ {item.ingredients.length} รายการ</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังโหลด...</div>
          ) : usageHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>ไม่มีข้อมูลการตัดยอดในช่วงเวลานี้</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  {['วันที่/เวลา', 'วัตถุดิบ', 'ปริมาณที่ใช้', 'หน่วย', 'ต้นทุน', 'Order'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((row) => (
                  <tr key={row.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString('th-TH') : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                      {row.itemName}
                      {row.itemNameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>({row.itemNameThai})</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{fmtNum(row.quantity)}</td>
                    <td style={{ padding: '10px 14px' }}>{row.itemUnit}</td>
                    <td style={{ padding: '10px 14px' }}>{row.totalCost > 0 ? fmtCurrency(row.totalCost) : '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {row.orderNumber ? <span className="badge badge-info">#{row.orderNumber}</span> : <span className="muted">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'summary' && (
        <div>
          {summaryLoading ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังโหลด...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>ต้นทุนวัตถุดิบรวม</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--danger)' }}>{fmtCurrency(usageSummary?.totalCost ?? 0)}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>จำนวน Orders</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{usageSummary?.totalOrders ?? 0}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="muted" style={{ fontSize: 12 }}>วัตถุดิบที่ใช้</div>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{usageSummary?.items?.length ?? 0} รายการ</div>
                </div>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                {(usageSummary?.items ?? []).length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>ไม่มีข้อมูลในช่วงเวลานี้</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-muted)' }}>
                        {['วัตถุดิบ', 'ใช้ไปทั้งหมด', 'หน่วย', 'ต้นทุนรวม', 'ราคา/หน่วย', 'สต็อกคงเหลือ', 'สถานะ'].map((h) => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(usageSummary?.items ?? []).map((row) => {
                        const status = row.currentStock <= 0 ? 'หมด' : row.currentStock < 50 ? 'ใกล้หมด' : 'ปกติ';
                        const statusColor = row.currentStock <= 0 ? 'var(--danger)' : row.currentStock < 50 ? 'var(--warning)' : 'var(--matcha-700)';
                        return (
                          <tr key={row.inventoryItemId} style={{ borderTop: '1px solid var(--border-default)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                              {row.name}
                              {row.nameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>({row.nameThai})</span>}
                            </td>
                            <td style={{ padding: '10px 14px' }}>{fmtNum(row.totalUsed)}</td>
                            <td style={{ padding: '10px 14px' }}>{row.unitOfMeasure}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 500 }}>{fmtCurrency(row.totalCost)}</td>
                            <td style={{ padding: '10px 14px' }}>{fmtCurrency(row.costPerUnit)}</td>
                            <td style={{ padding: '10px 14px' }}>{fmtNum(row.currentStock)} {row.unitOfMeasure}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: statusColor + '15', padding: '2px 8px', borderRadius: 4 }}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
