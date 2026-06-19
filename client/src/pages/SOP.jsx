// ============================================
// Page: sop (Redesigned & Polished UX)
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  IconBell, IconBookmark, IconBox, IconCategories, IconCheck, IconCheckCircle, 
  IconCheckList, IconChevRight, IconCommand, IconEdit, IconError, IconExport, 
  IconImport, IconInfo, IconLeaf, IconList, IconMenu, IconPlus, IconSearch, 
  IconWarning, IconWhisk, IconTrash, IconX, IconChevUp, IconChevDown,
  IconBuilding, IconClock, IconCalendar, IconUser, IconUsers, IconStaff
} from "@/icons";
import { useApp, Drawer, Select, Toggle, Checkbox, Tabs, TopActionBar, Placeholder, SectionHeader, Avatar, Sparkline, Field } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { getAutomation } from "@/lib/automationSettings";

const Stat = ({ label, value, color }) => (
  <div style={{
    padding: '16px',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--r-md)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-xs)'
  }}>
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--text-primary)', marginTop: 4 }}>{value}</div>
  </div>
);

// ----- SOP Sub Navigation -----
const SOPSubNav = ({ active }) => {
  const { navigate, role } = useApp();
  const base = role === 'staff' ? '/sop' : '/backoffice/sop';
  const tabs = [
    { key: 'library',    label: '📚 คู่มือ SOP',  path: base },
    { key: 'tasks',      label: '✅ งานของฉัน',   path: `${base}/my-tasks` },
    { key: 'variants',   label: '🔧 สูตรสาขา',   path: `${base}/my-variants` },
    { key: 'material',   label: '🧪 ต้นทุนสูตร', path: `${base}/material-usage` },
    { key: 'compliance', label: '📊 มาตรฐาน',    path: `${base}/compliance`, roles: ['super', 'admin'] },
    { key: 'approval',   label: '⏳ รออนุมัติ',  path: `${base}/approval-queue`, roles: ['super'] },
  ];
  const visible = tabs.filter((t) => !t.roles || t.roles.includes(role));
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border-default)', marginBottom: 24, overflowX: 'auto' }}>
      {visible.map((tab) => (
        <button
          key={tab.key}
          onClick={() => navigate(tab.path)}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            color: active === tab.key ? 'var(--matcha-700)' : 'var(--text-secondary)',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: active === tab.key ? '2.5px solid var(--matcha-600)' : '2.5px solid transparent',
            cursor: 'pointer',
            marginBottom: -2,
            transition: 'color 150ms ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ----- SOP Library -----
export const PageSOPLibrary = () => {
  const { navigate, role, route, branch } = useApp();
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const isStaffView = role === 'staff' || (route || '').startsWith('/sop');
  const detailPrefix = isStaffView ? '/sop' : '/backoffice/sop';
  const canWrite = role === 'super' || role === 'admin';
  const archiveSop = trpc.sop.archive.useMutation({ onSuccess: () => refetchSops() });

  const { data: sops = [], isLoading, refetch: refetchSops } = trpc.sop.list.useQuery(
    { search: search || undefined, status: canWrite ? undefined : 'published', branchId: branch?.id || undefined },
    { staleTime: 15000 }
  );
  const { data: categories = [] } = trpc.sop.listCategories.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });

  const filtered = activeCat === 'all' ? sops : sops.filter((s) => s.categoryId === activeCat);
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  return (
    <div className="page" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>Knowledge</span> / <span style={{ color: 'var(--matcha-700)', fontWeight: 500 }}>SOP Library</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>คู่มือการปฏิบัติงาน (SOP Library)</h1>
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{sops.length} SOPs เอกสารแนะนำ · {categories.length} หมวดหมู่หลัก</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canWrite && (
              <button className="btn btn-primary" onClick={() => navigate('/backoffice/sop/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconPlus size={16}/> เขียนคู่มือ (Write SOP)
              </button>
            )}
            {isStaffView && (
              <button className="btn btn-secondary" onClick={() => navigate('/sop/my-tasks')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconCheckList size={16}/> งานของฉัน (My Tasks)
              </button>
            )}
          </div>
        </div>
      </div>

      <SOPSubNav active="library" />

          {/* Search Box Panel */}
          <div 
            style={{ 
              padding: '4px 8px', 
              marginBottom: 20, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              background: 'var(--bg-surface)',
              borderRadius: 'var(--r-lg)',
              border: searchFocused ? '1px solid var(--matcha-500)' : '1px solid var(--border-default)',
              boxShadow: searchFocused ? 'var(--shadow-md), var(--glow-soft)' : 'var(--shadow-xs)',
              transition: 'all 240ms var(--ease-out-expo)',
            }}
          >
            <span style={{ paddingLeft: 8, color: searchFocused ? 'var(--matcha-600)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={20}/>
            </span>
            <input 
              className="input" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="ค้นหาคู่มือการชง ชื่อสูตร หรือคำสำคัญต่างๆ..." 
              style={{ border: 'none', boxShadow: 'none', height: 44, fontSize: 15, flex: 1, background: 'transparent' }}
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 8 }}
              >
                <IconX size={16} />
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroller */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}>
            <button 
              onClick={() => setActiveCat('all')} 
              className={activeCat === 'all' ? 'btn btn-primary' : 'btn btn-secondary'} 
              style={{ whiteSpace: 'nowrap', borderRadius: 99, padding: '8px 16px', fontSize: 13 }}
            >
              ทั้งหมด (All)
            </button>
            {categories.map((c) => (
              <button 
                key={c.id} 
                onClick={() => setActiveCat(c.id)} 
                className={activeCat === c.id ? 'btn btn-primary' : 'btn btn-secondary'} 
                style={{ whiteSpace: 'nowrap', borderRadius: 99, padding: '8px 16px', fontSize: 13 }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Grid view */}
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card" style={{ height: 260, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid var(--border-subtle)' }}/>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', background: 'var(--bg-surface)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-lg)' }}>
              <IconBox size={44} style={{ opacity: 0.3, color: 'var(--text-tertiary)' }}/>
              <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>ไม่พบข้อมูลคู่มือ</p>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{canWrite ? 'เริ่มสร้างคู่มือฉบับแรกของคุณได้ทันที' : 'ยังไม่มีเอกสารคู่มือเผยแพร่ในระบบสำหรับหมวดหมู่นี้'}</p>
              {canWrite && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/backoffice/sop/new')}><IconPlus size={14}/> เขียนคู่มือ</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {filtered.map((s, i) => {
                const catName = catMap.get(s.categoryId) ?? 'Uncategorized';
                const author = s.authorStaffId ? `Staff #${s.authorStaffId}` : '—';
                const date = s.publishedAt ? new Date(s.publishedAt).toLocaleDateString('th-TH') : '—';
                return (
                  <div 
                    key={s.id} 
                    className="card" 
                    style={{ 
                      overflow: 'hidden', 
                      position: 'relative', 
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--r-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      animation: `slideUp 360ms var(--ease-out-expo) ${i * 40}ms both`, 
                      transition: 'transform 240ms, box-shadow 240ms, border-color 240ms' 
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.transform = 'translateY(-4px)'; 
                      e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--glow-soft)';
                      e.currentTarget.style.borderColor = 'var(--matcha-300)';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.transform = 'none'; 
                      e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; 
                      e.currentTarget.style.borderColor = 'var(--border-default)';
                    }}
                  >
                    <div onClick={() => navigate(`${detailPrefix}/${s.id}`)} style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--bg-muted)' }}>
                      {s.coverImageUrl ? (
                        <img 
                          src={s.coverImageUrl} 
                          alt={s.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 400ms ease' }} 
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'} 
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'} 
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--matcha-100), var(--matcha-200))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconLeaf size={32} style={{ color: 'var(--matcha-600)', opacity: 0.5 }}/>
                        </div>
                      )}
                      
                      {/* Floating badglets */}
                      {s.status === 'draft' && (
                        <span className="pill pill-warning" style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, fontWeight: 700 }}>DRAFT</span>
                      )}
                      {s.requiresAcknowledgment && (
                        <span className="pill" style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, background: 'var(--red-600)', color: 'white', border: 'none', fontWeight: 700, letterSpacing: '0.04em' }}>REQUIRED</span>
                      )}
                      {s.videoUrl && (
                        <span className="pill" style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 9, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', fontWeight: 600 }}>🎥 VIDEO</span>
                      )}
                    </div>

                    {canWrite && (
                      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 2 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/backoffice/sop/new?id=${s.id}`); }}
                          className="btn btn-secondary btn-icon"
                          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.92)', boxShadow: 'var(--shadow-xs)' }}
                          title="Edit SOP"
                        ><IconEdit size={13}/></button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Archive "${s.title}"?`)) archiveSop.mutate({ id: s.id });
                          }}
                          className="btn btn-secondary btn-icon"
                          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.92)', color: 'var(--danger)', boxShadow: 'var(--shadow-xs)' }}
                          title="Archive SOP"
                        ><IconTrash size={13}/></button>
                      </div>
                    )}

                    <div 
                      onClick={() => navigate(`${detailPrefix}/${s.id}`)} 
                      style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span className="pill" style={{ background: 'var(--matcha-50)', color: 'var(--matcha-700)', border: 'none', fontWeight: 600, fontSize: 10 }}>{catName}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
                        {s.subtitle && (
                          <div className="muted" style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {s.subtitle}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 'auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconStaff size={12}/>
                          <span>{author}</span>
                        </div>
                        <span>·</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconCalendar size={12}/>
                          <span>{date}</span>
                        </div>
                        {s.version && (
                          <>
                            <span>·</span>
                            <span>v{s.version}</span>
                          </>
                        )}
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

// ----- Drawer to link SOP to menu items -----
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
    
    const tasks = [];
    if (toLink.length > 0) tasks.push(linkMut.mutateAsync({ sopId, menuItemIds: toLink }));
    if (toUnlink.length > 0) tasks.push(linkMut.mutateAsync({ sopId: null, menuItemIds: toUnlink }));
    Promise.all(tasks).catch(() => {});
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="เชื่อมโยง SOP กับเมนูขาย (Link to Menu)"
      subtitle={sopTitle}
      width={560}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={save} disabled={linkMut.isPending}>
          {linkMut.isPending ? 'กำลังบันทึก…' : `บันทึกลิงก์ (${selected.size} รายการ)`}
        </button>
      </div>}
    >
      <div style={{ padding: '12px 16px', background: 'var(--matcha-50)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--matcha-700)', marginBottom: 16, lineHeight: 1.5 }}>
        💡 เมนูที่คุณเลือกจะแสดงคู่มือการชงนี้ที่หน้าแคชเชียร์ (POS Option Sheet) ทันที เพื่อให้พนักงานกดเปิดอ่านสูตรชงได้ง่าย
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          className="input"
          placeholder="ค้นหาเมนูอาหาร/เครื่องดื่ม หรือ SKU..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
        <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)' }}><IconSearch size={16}/></span>
      </div>
      <div className="card" style={{ padding: 0, overflowY: 'auto', maxHeight: 420, border: '1px solid var(--border-default)' }}>
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: 30, textAlign: 'center', fontSize: 13 }}>
            {allMenu.length === 0 ? 'ยังไม่มีรายการสินค้าในเมนู' : 'ไม่พบชื่อเมนูที่ตรงกับการค้นหา'}
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
                transition: 'background 150ms ease'
              }}
            >
              <Checkbox checked={on} onChange={() => {}}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: on ? 'var(--matcha-900)' : 'var(--text-primary)' }}>{it.name}</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>SKU: {it.sku} · ฿{it.basePrice}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
};

// Helper for YouTube embeds
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

// ----- Drawer to request a branch-specific variant -----
const SopVariantRequestDrawer = ({ open, onClose, sop, branchId, onSuccess }) => {
  const [blocks, setBlocks] = useState([]);
  const [reason, setReason] = useState('');
  const [summary, setSummary] = useState('');

  const requestVariant = trpc.sop.requestVariant.useMutation({
    onSuccess: () => {
      alert('ส่งคำขอปรับปรุงสูตรเฉพาะสาขาเรียบร้อยแล้ว! รอการตรวจสอบจาก HQ');
      onSuccess?.();
      onClose();
    },
    onError: (e) => alert(e.message || 'Failed to submit variant request'),
  });

  useEffect(() => {
    if (open && sop?.content) {
      try {
        const parsed = typeof sop.content === 'string' ? JSON.parse(sop.content) : sop.content;
        setBlocks(Array.isArray(parsed) ? parsed : [{ type: 'paragraph', text: String(sop.content) }]);
      } catch (e) {
        setBlocks([{ type: 'paragraph', text: String(sop.content) }]);
      }
      setReason('');
      setSummary('');
    }
  }, [open, sop]);

  const save = () => {
    if (!reason.trim()) { alert('กรุณาระบุเหตุผลในการขอสูตรพิเศษประจำสาขา'); return; }
    requestVariant.mutate({
      masterSopId: sop.id,
      proposedContent: blocks,
      reason,
      changesSummary: summary || undefined,
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="ขอปรับปรุงสูตรเฉพาะสาขา (Branch Variant Request)"
      subtitle={sop?.title}
      width={640}
      footer={<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={save} disabled={requestVariant.isPending}>
          {requestVariant.isPending ? 'กำลังส่งคำขอ…' : 'ส่งคำขออนุมัติไปยังสำนักงานใหญ่'}
        </button>
      </div>}
    >
      <div style={{ padding: '12px 16px', background: 'rgba(217, 119, 6, 0.08)', border: '1px solid var(--warning)', borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
        ⚠️ <strong>คำชี้แจง:</strong> การปรับแต่งขั้นตอนการทำนี้จะมีผลเฉพาะสาขาของคุณเท่านั้น และจะต้องรอให้ผู้ตรวจการสำนักงานใหญ่ (HQ) ตรวจสอบและกดอนุมัติก่อนจึงจะเริ่มใช้จริงได้
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>เหตุผลในการปรับปรุงสูตร (จำเป็นต้องระบุ) *</label>
          <textarea
            className="input"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="อธิบายเหตุผล เช่น: ปรับให้เหมาะกับกำลังวัตต์เครื่องปั่นของสาขา / ใช้วัตถุดิบทดแทนชั่วคราว..."
            style={{ fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>สรุปสั้นๆ เกี่ยวกับการเปลี่ยนสูตร</label>
          <input
            className="input"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="เช่น: เปลี่ยนอัตราส่วนไซรัปเป็น 5ml แทน 10ml"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '1px solid var(--border-default)', paddingBottom: 8 }}>ปรับเปลี่ยนขั้นตอนการทำ (Customize Steps)</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', padding: 4, marginBottom: 16 }}>
        {blocks.map((block, idx) => (
          <div key={idx} style={{ padding: 14, background: 'var(--bg-muted)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="pill" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 700, background: 'var(--bg-surface)' }}>{block.type}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px', height: 'auto', color: 'var(--red-600)', minWidth: 'auto', fontSize: 11 }}
                onClick={() => setBlocks(prev => prev.filter((_, i) => i !== idx))}
              >
                ลบขั้นตอนนี้
              </button>
            </div>
            {block.type === 'list' ? (
              <textarea
                className="input"
                rows={3}
                value={(block.items || []).join('\n')}
                onChange={(e) => {
                  const next = [...blocks];
                  next[idx] = { ...next[idx], items: e.target.value.split('\n') };
                  setBlocks(next);
                }}
                placeholder="รายละเอียดขั้นตอนย่อย (1 รายการต่อบรรทัด)..."
                style={{ fontSize: 13 }}
              />
            ) : (
              <textarea
                className="input"
                rows={2}
                value={block.text || ''}
                onChange={(e) => {
                  const next = [...blocks];
                  next[idx] = { ...next[idx], text: e.target.value };
                  setBlocks(next);
                }}
                placeholder="ระบุคำอธิบายขั้นตอนการชง..."
                style={{ fontSize: 13 }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setBlocks(prev => [...prev, { type: 'heading', text: '' }])}>+ หัวข้อ (Heading)</button>
        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setBlocks(prev => [...prev, { type: 'paragraph', text: '' }])}>+ ย่อหน้า (Paragraph)</button>
        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setBlocks(prev => [...prev, { type: 'list', items: [''] }])}>+ รายการ (List)</button>
        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setBlocks(prev => [...prev, { type: 'callout', text: '' }])}>+ กล่องข้อความเตือน (Callout)</button>
      </div>
    </Drawer>
  );
};

// ----- SOP Detail (reading) -----
export const PageSOPDetail = () => {
  const { navigate, route, branch, role, lang } = useApp();
  const [acked, setAcked] = useState(false);
  const [autoAckTriggered, setAutoAckTriggered] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [variantRequestOpen, setVariantRequestOpen] = useState(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [taskDueDate, setTaskDueDate] = useState('');
  const [viewMode, setViewMode] = useState('doc'); // 'doc' | 'step'
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const sopId = useMemo(() => {
    const path = (route || '').split('?')[0];
    const m = path.match(/\/sop\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [route]);

  const { data: sop, isLoading, refetch } = trpc.sop.getById.useQuery(
    { id: sopId ?? 0 },
    { enabled: !!sopId }
  );

  const canWrite = role === 'super' || role === 'admin';

  const { data: variantRequests = [], refetch: refetchVariants } = trpc.sop.listVariants.useQuery(
    { branchId: branch?.id || undefined },
    { enabled: !!branch?.id, staleTime: 5000 }
  );

  const { data: acks = [] } = trpc.sop.listAcknowledgments.useQuery(
    { sopId: sopId ?? 0 },
    { enabled: !!sopId && canWrite }
  );

  const { data: myAck } = trpc.sop.getMyAcknowledgment.useQuery(
    { sopId: sopId ?? 0 },
    { enabled: !!sopId && !canWrite }
  );

  const pendingRequest = useMemo(() => {
    if (!sop) return null;
    const targetSopId = sop.masterSopId || sop.id;
    return variantRequests.find((v) => v.masterSopId === targetSopId && v.status === 'pending');
  }, [variantRequests, sop]);

  const acknowledge = trpc.sop.acknowledge.useMutation({
    onSuccess: () => setAcked(true),
    onError: (e) => alert(e.message),
  });

  const { data: branchStaff = [] } = trpc.staff.list.useQuery(
    { branchId: branch?.id, status: 'active' },
    { enabled: assignTaskOpen && !!branch?.id }
  );
  const assignTask = trpc.sop.assignTask.useMutation({
    onSuccess: () => {
      alert('มอบหมายงานสำเร็จ');
      setAssignTaskOpen(false);
      setSelectedStaffIds([]);
    },
    onError: (e) => alert(e.message),
  });

  useEffect(() => {
    const session = getSession();
    if (canWrite && acks.length > 0 && session?.id) {
      setAcked(acks.some((a) => a.staffId === session.id));
    } else if (!canWrite && myAck) {
      setAcked(true);
    }
  }, [acks, myAck, canWrite]);

  const steps = useMemo(() => {
    if (!sop?.content) return [];
    let contentList = [];
    if (typeof sop.content === 'string') {
      try {
        contentList = JSON.parse(sop.content);
      } catch (e) {
        return [{ section: 'บทนำ / Introduction', type: 'paragraph', content: sop.content }];
      }
    } else if (Array.isArray(sop.content)) {
      contentList = sop.content;
    }

    let currentSection = "ขั้นตอนการเตรียมตัว";
    const flatSteps = [];

    contentList.forEach((block) => {
      if (block.type === 'heading') {
        currentSection = block.text;
      } else if (block.type === 'paragraph') {
        flatSteps.push({
          section: currentSection,
          type: 'paragraph',
          content: block.text
        });
      } else if (block.type === 'list' && Array.isArray(block.items)) {
        block.items.forEach((item) => {
          if (item && item.trim()) {
            flatSteps.push({
              section: currentSection,
              type: 'list_item',
              content: item
            });
          }
        });
      } else if (block.type === 'callout') {
        flatSteps.push({
          section: currentSection,
          type: 'callout',
          content: block.text
        });
      }
    });

    return flatSteps;
  }, [sop?.content]);

  const toggleStepCompleted = (idx) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const myAckRecord = canWrite
    ? acks.find((a) => a.staffId === getSession()?.id)
    : myAck;

  const ackedTimeStr = myAckRecord?.acknowledgedAt
    ? new Date(myAckRecord.acknowledgedAt).toLocaleString('th-TH')
    : new Date().toLocaleString('th-TH');

  const archiveSop = trpc.sop.archive.useMutation();

  const handleRevertToMaster = async () => {
    if (!sop) return;
    if (confirm('คุณต้องการยกเลิกวิธีปฏิบัติเฉพาะสาขานี้ และกลับไปใช้สูตรหลักร่วมกันใช่หรือไม่?')) {
      try {
        await archiveSop.mutateAsync({ id: sop.id });
        alert('กลับไปใช้สูตรหลักเรียบร้อยแล้ว!');
        navigate(route.startsWith('/backoffice') ? '/backoffice/sop' : '/sop');
      } catch (e) {
        alert('Revert failed: ' + (e.message || 'Unknown'));
      }
    }
  };

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

  const updated = sop?.updatedAt ? new Date(sop.updatedAt).toLocaleDateString('th-TH') : '—';

  if (!sopId) return <div style={{ padding: 60, textAlign: 'center' }} className="muted">ไม่ได้กำหนดไอดีของ SOP</div>;
  if (isLoading) return <div style={{ padding: 60, textAlign: 'center' }} className="muted">กำลังโหลดขั้นตอนการทำคู่มือ…</div>;
  if (!sop) return <div style={{ padding: 60, textAlign: 'center' }} className="muted">ไม่พบข้อมูลคู่มือ SOP นี้ในระบบ</div>;

  const renderStepMode = () => {
    if (steps.length === 0) {
      return (
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '40px auto', border: '1px solid var(--border-default)' }}>
          <p className="muted">คู่มือฉบับนี้ยังไม่มีการจัดรูปแบบขั้นตอนชงแบบสไลด์</p>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setViewMode('doc')}>กลับไปอ่านเอกสารเต็ม</button>
        </div>
      );
    }

    const currentStep = steps[currentStepIdx];
    const progressPct = Math.round(((currentStepIdx + 1) / steps.length) * 100);

    return (
      <div style={{ maxWidth: 800, margin: '20px auto', padding: '0 20px 80px' }}>
        <div 
          className="card" 
          style={{ 
            padding: 32, 
            background: 'var(--bg-surface)', 
            boxShadow: 'var(--shadow-lg), var(--glow-soft)', 
            borderRadius: 'var(--r-lg)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 28, 
            minHeight: 420, 
            justifyContent: 'space-between', 
            border: '1px solid var(--matcha-200)',
            position: 'relative'
          }}
        >
          {/* Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="pill" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: 10, background: 'var(--matcha-50)', color: 'var(--matcha-700)', border: 'none' }}>
                📂 {currentStep.section || 'วิธีการทำเครื่องดื่ม'}
              </span>
              <span className="muted" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                ขั้นตอนที่ {currentStepIdx + 1} จาก {steps.length} ({progressPct}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--matcha-500), var(--matcha-700))', transition: 'width 250ms ease' }}/>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 10px' }}>
            {currentStep.type === 'callout' && (
              <div style={{ color: 'var(--warning)', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <IconWarning size={28} />
                <strong style={{ fontSize: 18, color: 'var(--warning)' }}>ระวัง / WARNING</strong>
              </div>
            )}
            
            <div style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              color: currentStep.type === 'callout' ? 'var(--warning)' : 'var(--text-primary)', 
              lineHeight: 1.6, 
              maxWidth: 640,
              textAlign: 'center'
            }}>
              {currentStep.content}
            </div>

            {currentStep.type === 'list_item' && (
              <label 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginTop: 32, 
                  cursor: 'pointer', 
                  padding: '10px 24px', 
                  background: completedSteps.has(currentStepIdx) ? 'var(--matcha-50)' : 'var(--bg-muted)', 
                  borderRadius: 99, 
                  border: '1px solid ' + (completedSteps.has(currentStepIdx) ? 'var(--matcha-300)' : 'var(--border-default)'), 
                  userSelect: 'none',
                  transition: 'all 200ms ease'
                }}
              >
                <Checkbox checked={completedSteps.has(currentStepIdx)} onChange={() => toggleStepCompleted(currentStepIdx)} />
                <span style={{ fontSize: 14, fontWeight: 600, color: completedSteps.has(currentStepIdx) ? 'var(--matcha-800)' : 'var(--text-secondary)' }}>
                  {completedSteps.has(currentStepIdx) ? '✓ ดำเนินการแล้ว (Done)' : 'มาร์กว่าทำแล้ว (Mark as done)'}
                </span>
              </label>
            )}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--border-default)', paddingTop: 20 }}>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
              disabled={currentStepIdx === 0}
              style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
            >
              ย้อนกลับ (Back)
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                if (currentStepIdx < steps.length - 1) {
                  setCurrentStepIdx(prev => prev + 1);
                } else {
                  acknowledge.mutate({ sopId: sop.id });
                  alert('อ่านขั้นตอนการปฏิบัติเรียบร้อยแล้ว! ขอบคุณพนักงานทุกท่านที่รักษาระดับการชงสินค้า');
                  setViewMode('doc');
                }
              }}
              style={{ 
                flex: 2, 
                height: 48, 
                fontSize: 15, 
                fontWeight: 600,
                background: currentStepIdx === steps.length - 1 ? 'var(--matcha-700)' : 'var(--matcha-600)' 
              }}
            >
              {currentStepIdx === steps.length - 1 ? 'เสร็จสิ้น & บันทึกอ่านสำเร็จ (Finish)' : 'ขั้นตอนต่อไป (Next) →'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', background: 'var(--bg-surface)' }}>
      {/* Hero Header Banner */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden' }}>
        {sop.coverImageUrl ? (
          <img src={sop.coverImageUrl} alt={sop.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, var(--matcha-600), var(--matcha-800))' }}/>
        )}
        {/* Colorful Gradients Overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, background: 'radial-gradient(circle at 15% 30%, var(--matcha-400), transparent 45%), radial-gradient(circle at 85% 70%, var(--gold), transparent 50%)' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.65))' }}/>
        
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '32px 40px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8, fontWeight: 500, letterSpacing: '0.04em' }}>KNOWLEDGE / SOP LIBRARY</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.3)', margin: 0, lineHeight: 1.2 }}>{sop.title}</h1>
          {sop.subtitle && <p style={{ marginTop: 8, fontSize: 16, opacity: 0.9, fontWeight: 400, maxWidth: 700 }}>{sop.subtitle}</p>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, fontSize: 12, opacity: 0.9, flexWrap: 'wrap' }}>
            <span className="pill" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontWeight: 600 }}>เวอร์ชัน {sop.version ?? 1}</span>
            <span>·</span>
            <span>แก้ไขล่าสุดเมื่อ {updated}</span>
            <span>·</span>
            <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{sop.status}</span>
            
            {/* Mode switch */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                onClick={() => setViewMode(viewMode === 'doc' ? 'step' : 'doc')}
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--gold-600)', border: 'none', fontWeight: 700, borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {viewMode === 'doc' ? <><IconCommand size={14}/> เปิดอ่านแบบการ์ดสไลด์</> : <><IconList size={14}/> เปิดอ่านคู่มือตัวเต็ม</>}
              </button>
              
              {sop.requiresAcknowledgment && (
                <button
                  onClick={() => acknowledge.mutate({ sopId: sop.id })}
                  disabled={acked || acknowledge.isPending}
                  className="btn btn-primary btn-sm"
                  style={{ background: acked ? 'var(--matcha-700)' : undefined, border: 'none', fontWeight: 700, borderRadius: 99 }}
                >
                  {acked ? <><IconCheck size={14}/> ยอมรับและเข้าใจแล้ว</> : (acknowledge.isPending ? 'กำลังยืนยัน…' : 'กดยืนยันการรับทราบ')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlays Drawers */}
      <SopLinkMenuDrawer
        open={linkMenuOpen}
        onClose={() => setLinkMenuOpen(false)}
        sopId={sop.id}
        sopTitle={sop.title}
      />

      <SopVariantRequestDrawer
        open={variantRequestOpen}
        onClose={() => setVariantRequestOpen(false)}
        sop={sop}
        branchId={branch?.id}
        onSuccess={() => { refetch(); refetchVariants(); }}
      />

      <Drawer open={assignTaskOpen} onClose={() => setAssignTaskOpen(false)} title="มอบหมายงานอบรม SOP" width={420}>
        <Field label="กำหนดส่ง">
          <input className="input" type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
        </Field>
        <div className="t-caption" style={{ margin: '16px 0 8px', color: 'var(--text-tertiary)' }}>เลือกพนักงาน</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
          {branchStaff.map((s) => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedStaffIds.includes(s.id)}
                onChange={(e) => {
                  setSelectedStaffIds((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                  );
                }}
              />
              <span>{s.firstNameThai || s.firstName} {s.lastNameThai || s.lastName} · {s.employeeCode}</span>
            </label>
          ))}
        </div>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16, width: '100%' }}
          disabled={!selectedStaffIds.length || assignTask.isPending}
          onClick={() => assignTask.mutate({
            sopId: sop.id,
            staffIds: selectedStaffIds,
            dueDate: taskDueDate || undefined,
          })}
        >
          {assignTask.isPending ? 'กำลังมอบหมาย…' : 'มอบหมายงาน'}
        </button>
      </Drawer>

      {/* Override Info bar */}
      {sop.branchId !== null && sop.masterSopId !== null && (
        <div style={{ maxWidth: 1200, margin: '20px auto 0', padding: '0 20px' }}>
          <div style={{ padding: '16px 20px', background: 'rgba(76, 111, 76, 0.06)', border: '1px solid var(--matcha-300)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--matcha-600)' }}><IconBuilding size={20}/></span>
              <div style={{ fontSize: 13, color: 'var(--matcha-900)' }}>
                <strong>สูตรและขั้นตอนถูกปรับแต่งเฉพาะสาขา (Branch Override)</strong>
                <br/>สาขานี้กำลังใช้สูตรชงที่ผ่านการปรับเปลี่ยนเฉพาะกิจ เพื่อความคล่องตัวในงานสาขา
              </div>
            </div>
            {branch?.id && (role === 'admin' || role === 'super') && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setVariantRequestOpen(true)} style={{ background: 'var(--bg-surface)' }}>
                  <IconEdit size={12}/> แก้ไขสูตรสาขา
                </button>
                <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', background: 'var(--bg-surface)' }} onClick={handleRevertToMaster} disabled={archiveSop.isPending}>
                  {archiveSop.isPending ? 'กำลังเปลี่ยน…' : 'กลับไปใช้สูตรหลักสำนักงานใหญ่'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending status warning */}
      {pendingRequest && (
        <div style={{ maxWidth: 1200, margin: '20px auto 0', padding: '0 20px' }}>
          <div style={{ padding: '16px 20px', background: 'rgba(217, 119, 6, 0.08)', border: '1px solid var(--warning)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'var(--warning)' }}><IconWarning size={22}/></span>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>อยู่ระหว่างการตรวจสอบสูตรสาขา (Pending Review)</strong>
              <br/>ข้อเสนอขอปรับปรุงสูตรชงพิเศษสาขากำลังอยู่ในห้องตรวจสอบคิวโดยสำนักงานใหญ่: <em>"{pendingRequest.changeReason}"</em>
            </div>
          </div>
        </div>
      )}

      {/* Render Main Detail views */}
      {viewMode === 'step' ? (
        renderStepMode()
      ) : (
        <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 20px 80px', display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 260px', gap: 32 }} className="sop-grid">
          
          {/* TOC sidebar */}
          <aside style={{ position: 'sticky', top: 90, alignSelf: 'flex-start' }} className="sop-aside">
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>เนื้อหาการชง</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderLeft: '1.5px solid var(--border-default)' }}>
              {[
                { l: '1. อุปกรณ์ & วัตถุดิบ', active: true },
                { l: '2. อัตราส่วนผสมสูตร' },
                { l: '3. ลำดับขั้นตอนการชง' },
                { l: '4. ข้อเสนอแนะ / ข้อควรระวัง' },
              ].map((it, i) => (
                <a 
                  key={it.l} 
                  href="#" 
                  style={{ 
                    display: 'block', 
                    padding: '8px 14px', 
                    fontSize: 13, 
                    fontWeight: it.active ? 600 : 400, 
                    color: it.active ? 'var(--matcha-700)' : 'var(--text-secondary)', 
                    background: it.active ? 'var(--matcha-50)' : 'transparent', 
                    borderLeft: '2px solid ' + (it.active ? 'var(--matcha-600)' : 'transparent'),
                    marginLeft: -1.5,
                    transition: 'all 150ms ease'
                  }}
                >
                  {it.l}
                </a>
              ))}
            </div>
            <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-tertiary)' }}>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>ความคืบหน้าการอ่าน · 100%</div>
              <div style={{ height: 4, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--matcha-500)' }}/>
              </div>
            </div>
          </aside>

          {/* Main content article */}
          <article 
            className="card" 
            style={{ 
              padding: '36px 40px', 
              fontSize: 15, 
              lineHeight: 1.8, 
              color: 'var(--text-primary)', 
              maxWidth: 760, 
              justifySelf: 'stretch',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            {sop.videoUrl && (
              <div style={{ marginBottom: 28, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-default)', background: 'black', boxShadow: 'var(--shadow-sm)' }}>
                {(() => {
                  const ytUrl = getYoutubeEmbedUrl(sop.videoUrl);
                  if (ytUrl) {
                    return (
                      <iframe
                        width="100%"
                        height="380"
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
                return <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>ไม่มีข้อมูลขั้นตอนการทำสำหรับคู่มือนี้</p>;
              }
              if (typeof c === 'string') {
                return <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{c}</div>;
              }
              if (Array.isArray(c)) {
                return c.map((block, i) => (
                  <div key={i} style={{ marginBottom: 20 }}>
                    {block.type === 'heading' && <h2 style={{ fontSize: 20, fontWeight: 700, margin: '28px 0 12px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>{block.text}</h2>}
                    {block.type === 'paragraph' && <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{block.text}</p>}
                    {block.type === 'list' && block.items && (
                      <ul style={{ paddingLeft: 20, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {block.items.map((it, j) => <li key={j} style={{ listStyleType: 'decimal' }}>{it}</li>)}
                      </ul>
                    )}
                    {block.type === 'callout' && (
                      <div style={{ background: 'var(--matcha-50)', borderLeft: '4px solid var(--matcha-500)', borderRadius: 'var(--r-md)', padding: '16px 20px', margin: '20px 0', display: 'flex', gap: 12 }}>
                        <span style={{ color: 'var(--matcha-700)', display: 'flex', alignItems: 'center' }}><IconInfo size={20}/></span>
                        <div style={{ fontSize: 13.5, color: 'var(--matcha-900)', fontWeight: 500 }}>{block.text}</div>
                      </div>
                    )}
                  </div>
                ));
              }
              return <pre style={{ background: 'var(--bg-muted)', padding: 16, borderRadius: 8, fontSize: 13, overflow: 'auto' }}>{JSON.stringify(c, null, 2)}</pre>;
            })()}
          </article>

          {/* Right sidebar tags */}
          <aside style={{ position: 'sticky', top: 90, alignSelf: 'flex-start' }} className="sop-aside">
            {(role === 'super' || canWrite) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>ผู้เขียน / แอดมินจัดการ</div>
                {role === 'super' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setLinkMenuOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                    <IconMenu size={14}/> เชื่อมหน้าเมนูขาย POS
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setAssignTaskOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                  <IconCheckList size={14}/> มอบหมายงานอบรม
                </button>
              </div>
            )}

            {sop.branchId === null && sop.allowBranchVariants && branch?.id && (role === 'admin' || role === 'super') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>ปรับแต่งสาขา</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setVariantRequestOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
                  <IconEdit size={14}/> ขอปรับสูตรเฉพาะสาขา
                </button>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 12 }}>พนักงานที่อ่านแล้ว</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {acks.slice(0, 5).map((a, i) => (
                <div key={a.id} style={{ position: 'relative' }}>
                  <Avatar name={`${a.firstName || 'Staff'} ${a.lastName || ''}`} size={28}/>
                </div>
              ))}
              {acks.length > 5 && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-muted)', border: '2.5px solid var(--bg-surface)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  +{acks.length - 5}
                </div>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>อ่านแล้ว {acks.length} จากพนักงานทั้งหมด</div>
          </aside>

        </div>
      )}

      {/* Floating Ack bottom bar in doc mode */}
      {viewMode === 'doc' && (
        <div 
          style={{
            position: 'sticky', 
            bottom: 0, 
            zIndex: 30,
            padding: '16px 32px',
            borderTop: '1px solid var(--border-default)',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 16,
            borderRadius: 'var(--r-md) var(--r-md) 0 0',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.03)'
          }}
        >
          {acked ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--matcha-600)' }}><IconCheckCircle size={22}/></span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>ฉันรับทราบและทำความเข้าใจเนื้อหาคู่นี้เรียบร้อยแล้ว</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>บันทึกยืนยันเมื่อเวลา {ackedTimeStr}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>เมื่อพนักงานอ่านวิธีปฏิบัตินี้เรียบร้อยแล้ว กรุณากดยืนยันการอ่าน</div>
              <button 
                className="btn btn-primary" 
                onClick={() => acknowledge.mutate({ sopId: sop.id })}
                style={{ background: 'var(--matcha-600)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              >
                <IconCheck size={16}/> ฉันอ่านและเข้าใจแล้ว (Acknowledge)
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) {
          .sop-grid { grid-template-columns: 1fr !important; padding: 0 10px 60px !important; gap: 20px !important; }
          .sop-aside { display: none !important; }
        }
      `}</style>
    </div>
  );
};

// ----- SOP Templates -----
const templateMatchaLatte = [
  { "type": "heading", "text": "อุปกรณ์ที่ต้องเตรียมชง" },
  { "type": "list", "items": ["แปรงไม้ไผ่ตีมัทฉะ (Chasen)", "ถ้วยกระเบื้องตีชา (Chawan)", "ช้อนตักมัทฉะ (Chashaku)", "ตาชั่งดิจิทัล", "ที่ร่อนผงมัทฉะตะแกรงตาถี่"] },
  { "type": "heading", "text": "ส่วนผสมและอัตราส่วน" },
  { "type": "list", "items": ["ผงมัทฉะ Hibi Premium Matcha 4.0 กรัม", "น้ำอุ่น (อุณหภูมิ 80°C) 40 มิลลิลิตร", "นมสดพาสเจอร์ไรส์แช่เย็น 120 มิลลิลิตร", "น้ำเชื่อมใสสูตรปกติ 10 มิลลิลิตร (กรณีสั่งระดับหวานปกติ)"] },
  { "type": "heading", "text": "ขั้นตอนการปรุงเครื่องดื่ม" },
  { "type": "list", "items": ["ตักผงมัทฉะ 4g ลงที่ร่อนชา ร่อนผงลงในถ้วย Chawan เพื่อสลายก้อนผงมัทฉะ", "ตวงน้ำร้อนอุณหภูมิ 80 องศาเซลเซียสเทลงในถ้วย Chawan 40ml", "ใช้แปรง Chasen ตีชาด้วยทิศทางรูปตัว W อย่างรวดเร็วประมาณ 20 วินาทีให้ชาแตกตัวจนผงขึ้นฟองนุ่มละเอียด", "ตวงนมสดเย็นและน้ำเชื่อมเทใส่แก้วเสิร์ฟ นำน้ำชาที่ตีละลายเสร็จแล้ว ค่อยๆ รินราดหน้าลงไปเป็นชั้นท็อปเพื่อความสวยงามแยกสี"] },
  { "type": "callout", "text": "ระวัง: ห้ามใช้น้ำเดือด 100°C ในการชงโดยเด็ดขาด เพราะจะส่งผลให้รสชาติมัทฉะขมฝาดมากและทำลายกลิ่นมัทฉะธรรมชาติ" }
];

const templateOpening = [
  { "type": "heading", "text": "เช็คลิสต์เปิดร้านประจำวัน (07:30 - 08:00)" },
  { "type": "heading", "text": "1. การเปิดระบบขายและเงินสดทอน" },
  { "type": "list", "items": ["เปิดสวิตช์เครื่อง POS ตรวจสอบไฟและสาย LAN", "ทดสอบเครื่องพิมพ์ใบเสร็จโดยกด Feed กระดาษ", "นับเงินทอนตั้งต้นในลิ้นชัก POS ยอดรวม 3,000 บาท ถ้วน"] },
  { "type": "heading", "text": "2. การเตรียมความพร้อมหน้าบาร์วัตถุดิบ" },
  { "type": "list", "items": ["ตรวจสอบอุณหภูมิตู้เย็น (ต้องอยู่ที่ 2°C - 4°C)", "ตวงเตรียมน้ำแข็งใส่ถังเก็บบาร์ชง เช็ดหน้าเคาน์เตอร์ทำความสะอาดให้แห้ง", "จัดเรียงนมและไซรัปตามอายุ FIFO (ขวดแกะใช้ก่อนจัดเรียงแถวแรก)"] },
  { "type": "callout", "text": "สำคัญ: หากพบปัญหาเครื่อง POS เสียเปิดไม่ติด ให้รีบแจ้งวิศวกรผู้จัดการและโทรหาทีมแอดมินทันทีเพื่อแก้ไข" }
];

const templateClosing = [
  { "type": "heading", "text": "เช็คลิสต์สรุปยอดและปิดร้านบาร์มัทฉะ" },
  { "type": "heading", "text": "1. การปิดยอดการเงินแคชเชียร์" },
  { "type": "list", "items": ["กดปิดกะในระบบ POS สั่งสรุปยอดรายวัน (Shift Report)", "นับยอดเงินสดที่รับมาวันนี้ เปรียบเทียบกับยอดขายบนระบบ POS", "ถ่ายภาพสลิปยอดปิดกะและยอดเงินส่งรายงานใน LINE กลุ่มร้าน"] },
  { "type": "heading", "text": "2. การทำความสะอาดอุปกรณ์และปิดระบบไฟ" },
  { "type": "list", "items": ["ล้างแปรงชงชา Chasen และตากแห้งด้วยฐานรองเป่าลม ห้ามแช่จุ่มน้ำข้ามคืน", "ล้างและเช็ดโต๊ะบาร์ ตรวจสอบและเทน้ำทิ้งในถาดสแตนเลสเครื่องชง", "ปิดสวิตช์ไฟแอร์ เครื่องเสียง ปิดไฟร้านและทำการล็อคระบบความปลอดภัย"] },
  { "type": "callout", "text": "ระวัง: แปรงไม้ไผ่ชงชาหากเปียกชื้นสะสมจะขึ้นราได้ง่าย ต้องเป่าลมแห้งและวางบนฐานกระเบื้องรูปกรวยเพื่อรักษารูปทรง" }
];

const smartParseTextToBlocks = (text) => {
  const content = (text || '').trim();
  if (!content) return [{ type: 'paragraph', text: '' }];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}

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
  const submitForReview = trpc.sop.submitForReview.useMutation();

  const buildPayload = () => {
    let parsedContent = form.content;
    if (typeof form.content === 'string') {
      try {
        parsedContent = JSON.parse(form.content);
      } catch (e) {}
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
    if (!form.title.trim()) { alert('กรุณากรอกหัวข้อ SOP'); return; }
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

  const handleSubmitForReview = async () => {
    if (!form.title.trim()) { alert('กรุณากรอกหัวข้อ SOP'); return; }
    try {
      let id = editId;
      if (!id) {
        const created = await createSop.mutateAsync(buildPayload());
        id = created?.id;
      } else {
        await updateSop.mutateAsync({ id: editId, ...buildPayload() });
      }
      if (id) {
        await submitForReview.mutateAsync({ id });
        setStatusLabel('Review');
        alert('ส่งตรวจสอบแล้ว — รออนุมัติเผยแพร่');
      }
    } catch (err) {
      alert('Submit failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handlePublish = async () => {
    if (!form.title.trim()) { alert('กรุณากรอกหัวข้อ SOP ก่อนบันทึกเผยแพร่จริง'); return; }
    if (!window.confirm('คุณต้องการนำคู่มือ SOP นี้เผยแพร่ให้พนักงานและสาขาใช้จริงเลยใช่หรือไม่?')) return;
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
    return <div style={{ padding: 60, textAlign: 'center' }} className="muted">กำลังดึงข้อมูลคู่มือ SOP…</div>;
  }

  const statusPillClass = statusLabel === 'Published' ? 'pill-matcha' : statusLabel === 'Archived' ? '' : 'pill-warning';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-surface)' }} className="sop-editor-grid">
      <div style={{ overflowY: 'auto', borderRight: '1px solid var(--border-default)' }}>
        
        {/* Editor Controls Bar */}
        <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 5 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/backoffice/sop')}>← กลับหน้าหลัก</button>
          <span className={'pill ' + statusPillClass}><span className="dot"/> {statusLabel}</span>
          {savedAt && <span className="muted" style={{ fontSize: 12 }}>· บันทึกร่างเมื่อ {new Date(savedAt).toLocaleTimeString()}</span>}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft} disabled={isSaving || isPublishing}>{isSaving ? 'กำลังบันทึกร่าง…' : 'บันทึกแบบร่าง (Save)'}</button>
          {statusLabel !== 'Published' && statusLabel !== 'Review' && (
            <button className="btn btn-secondary btn-sm" onClick={handleSubmitForReview} disabled={isSaving || isPublishing || submitForReview.isPending}>
              {submitForReview.isPending ? 'กำลังส่ง…' : 'ส่งตรวจสอบ (Review)'}
            </button>
          )}
          {statusLabel !== 'Published' && (
            <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={isSaving || isPublishing}>{isPublishing ? 'กำลังเผยแพร่…' : 'เผยแพร่จริง (Publish)'}</button>
          )}
        </div>

        {/* Visual Canvas */}
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '48px 32px' }}>
          
          {/* Header image cover placeholder */}
          <div style={{ 
            height: 180, 
            borderRadius: 'var(--r-lg)', 
            background: form.coverImageUrl ? `url(${form.coverImageUrl}) center/cover no-repeat` : 'linear-gradient(135deg, var(--matcha-100), var(--matcha-250))', 
            marginBottom: 32, 
            display: 'grid', 
            placeItems: 'center', 
            color: 'var(--matcha-800)',
            border: '1px solid var(--border-default)'
          }}>
            {!form.coverImageUrl && <IconWhisk size={56} style={{ opacity: 0.65 }}/>}
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="ตั้งชื่อคู่มือปฏิบัติงาน (SOP Title)..."
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', margin: 0, outline: 'none', border: 'none', background: 'transparent', width: '100%', color: 'var(--text-primary)' }}
          />
          <input
            value={form.titleThai}
            onChange={(e) => setForm({ ...form, titleThai: e.target.value })}
            placeholder="ชื่อคู่มือภาษาไทยเพิ่มเติม..."
            style={{ fontSize: 18, margin: '8px 0 4px', outline: 'none', border: 'none', background: 'transparent', width: '100%', color: 'var(--text-secondary)' }}
          />
          <input
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="สรุปหรือคำอธิบายอย่างย่อ สำหรับใช้แสดงในแคตตาล็อกหน้าแรก..."
            className="muted"
            style={{ fontSize: 15, lineHeight: 1.4, margin: '12px 0 28px', outline: 'none', border: 'none', background: 'transparent', width: '100%' }}
          />

          {/* Toggle Editors Modes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--r-subtle)',
                  cursor: 'pointer'
                }}
              >
                Visual Block Editor (แก้ไขแบบบล็อก)
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('code')}
                className="btn btn-xs"
                style={{
                  background: editorMode === 'code' ? 'var(--bg-surface)' : 'transparent',
                  color: editorMode === 'code' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: editorMode === 'code' ? 'var(--shadow-xs)' : 'none',
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 'var(--r-subtle)',
                  cursor: 'pointer'
                }}
              >
                Raw JSON Code (สำหรับแอดมินขั้นสูง)
              </button>
            </div>
          </div>

          {/* SOP Block Editor Toolbar */}
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
              marginBottom: 24,
              background: 'var(--bg-surface)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            {/* Action buttons */}
            {editorMode === 'visual' ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>แทรกบล็อกใหม่:</span>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'heading', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                >
                  + หัวข้อหลัก (Heading)
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'paragraph', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                >
                  + ย่อหน้าบรรทัด (Paragraph)
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'list', items: [''] }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                >
                  + รายการขั้นตอน (List)
                </button>
                <button
                  type="button"
                  onClick={() => setBlocks([...blocks, { type: 'callout', text: '' }])}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4 }}
                >
                  + ข้อความระวัง (Callout)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>แทรกโค้ด:</span>
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
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'paragraph', text: 'กรอกเนื้อหาย่อหน้า' }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'list', items: ['ขั้นตอนข้อที่ 1', 'ขั้นตอนข้อที่ 2'] }, null, 2) + ',\n')}
                  className="btn btn-secondary btn-xs"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  + List
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor(JSON.stringify({ type: 'callout', text: 'รายละเอียดข้อควรระวังหลัก' }, null, 2) + ',\n')}
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
                  style={{ fontSize: 11, padding: '4px 8px', color: 'var(--matcha-700)', fontWeight: 600 }}
                  title="ฟอร์แมตข้อมูลเป็นโครงสร้าง JSON อัตโนมัติ"
                >
                  ⚡ แปลงฟอร์แมตเป็น JSON
                </button>
              </div>
            )}

            {/* Templates Selector */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                className="btn btn-secondary btn-xs"
                style={{ fontSize: 11, padding: '4px 10px', color: 'var(--matcha-700)', border: '1px solid var(--matcha-200)', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <IconBookmark size={12} />
                โหลดเทมเพลตคู่มือด่วน
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
                      { label: 'เช็คลิสต์เตรียมเปิดร้าน (Opening)', blocks: templateOpening },
                      { label: 'ขั้นตอนเช็คบิลปิดร้าน (Closing)', blocks: templateClosing },
                    ].map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการเลือกใช้เทมเพลต "${t.label}"? การกระทำนี้จะลบข้อมูลที่เขียนทั้งหมดเพื่อแทนที่ใหม่`)) {
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

          {/* Visual editor list */}
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
                    {/* Floating controls on left */}
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
                      {/* Block selector */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDropdownIdx(isDropdownOpen ? null : idx)}
                          className="btn btn-secondary btn-icon"
                          style={{ width: '26px', height: '26px', borderRadius: '50%', padding: 0 }}
                          title="เปลี่ยนชนิดข้อมูลบล็อก"
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
                                { value: 'heading', label: 'หัวข้อใหญ่ (Heading)', icon: 'H' },
                                { value: 'list', label: 'รายการชง (List)', icon: <IconList size={12} /> },
                                { value: 'callout', label: 'กล่องคำเตือน (Callout)', icon: <IconInfo size={12} /> },
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

                      {/* Up */}
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
                        title="เลื่อนขั้นตอนขึ้น"
                      >
                        <IconChevUp size={10} />
                      </button>

                      {/* Down */}
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
                        title="เลื่อนขั้นตอนลง"
                      >
                        <IconChevDown size={10} />
                      </button>

                      {/* Remove block */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('คุณต้องการลบบล็อกขั้นตอนนี้ใช่หรือไม่?')) {
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

                    {/* Editor elements */}
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
                          placeholder="หัวข้อย่อยใหม่ (เช่น อุปกรณ์ที่ต้องใช้ชง / อัตราส่วนผสม)..."
                          style={{
                            fontSize: '20px',
                            fontWeight: '700',
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
                          placeholder="เขียนเนื้อหาคู่มือรายละเอียดตรงนี้..."
                          rows={1}
                          style={{
                            fontSize: '14px',
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
                          gap: 10,
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
                            placeholder="กรอกข้อมูลแจ้งเตือน ข้อเสนอแนะ หรือข้อความสำคัญ..."
                            rows={1}
                            style={{
                              fontSize: '13.5px',
                              lineHeight: '1.5',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              width: '100%',
                              color: 'var(--matcha-900)',
                              padding: 0,
                              resize: 'none',
                              overflow: 'hidden',
                              fontWeight: 500
                            }}
                          />
                        </div>
                      )}

                      {block.type === 'list' && (
                        <div data-block-idx={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '4px' }}>
                          {(block.items || []).map((itemVal, itemIdx) => (
                            <div key={itemIdx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="muted" style={{ fontSize: 13, minWidth: 20, textAlign: 'right', userSelect: 'none', fontWeight: 600 }}>
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
                                placeholder="กดปุ่ม Enter เพื่อเพิ่มรายการต่อไป..."
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
                                title="ลบรายการนี้"
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
                            style={{ alignSelf: 'flex-start', color: 'var(--matcha-600)', fontSize: 12, padding: '2px 8px', marginTop: 2, fontWeight: 600 }}
                          >
                            + เพิ่มรายการย่อย
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Blocks buttons */}
              <div style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 24,
                padding: '16px',
                border: '1.5px dashed var(--border-default)',
                borderRadius: 'var(--r-md)',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.015)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: 8, fontWeight: 500 }}>+ เพิ่มบล็อกใหม่:</span>
                {[
                  { type: 'heading', label: 'หัวข้อย่อย (Heading)', defaultVal: { type: 'heading', text: '' } },
                  { type: 'paragraph', label: 'ย่อหน้าข้อความ (Paragraph)', defaultVal: { type: 'paragraph', text: '' } },
                  { type: 'list', label: 'รายการชง (List)', defaultVal: { type: 'list', items: [''] } },
                  { type: 'callout', label: 'กล่องเตือน (Callout)', defaultVal: { type: 'callout', text: '' } },
                ].map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => setBlocks([...blocks, b.defaultVal])}
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'var(--bg-surface)', fontSize: 12, borderRadius: 6 }}
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
              placeholder={`เริ่มเขียนเอกสารคู่มือที่นี่...\n\nคุณสามารถกรอกข้อความทั่วไป หรือโครงสร้าง JSON บล็อกได้ เช่น:\n\n[{ "type": "heading", "text": "อุปกรณ์ที่ใช้" }, { "type": "list", "items": ["แปรงชงชา", "ถ้วย Chawan"] }]`}
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

      {/* Editor Properties Sidebar */}
      <aside style={{ background: 'var(--bg-muted)', padding: 24, overflowY: 'auto' }}>
        <div className="t-caption" style={{ marginBottom: 16, fontWeight: 700, borderBottom: '1px solid var(--border-default)', paddingBottom: 8 }}>รายละเอียดคูมือ (SOP Properties)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row label="หมวดหมู่คู่มือ">
            <select
              className="input"
              value={form.categoryId ?? ''}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}
              style={{ fontSize: 13 }}
            >
              <option value="">— ไม่มีหมวดหมู่ —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Row>

          <Row label="แท็กคีย์เวิร์ด">
            <div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {form.tags.map((t) => (
                  <span key={t} className="pill" style={{ cursor: 'pointer', background: 'var(--bg-surface)', fontSize: 10, padding: '3px 8px' }} onClick={() => removeTag(t)}>{t} ×</span>
                ))}
              </div>
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="พิมพ์แท็กแล้วกด Enter..."
                style={{ fontSize: 12 }}
              />
            </div>
          </Row>

          <Row label="ยืนยันการรับทราบ">
            <Toggle checked={form.requiresAcknowledgment} onChange={(v) => setForm({ ...form, requiresAcknowledgment: v })}/>
          </Row>

          <Row label="กำหนดเวลา (วัน)">
            <input
              className="input"
              type="number"
              min="1"
              value={form.acknowledgmentDeadlineDays}
              onChange={(e) => setForm({ ...form, acknowledgmentDeadlineDays: e.target.value })}
              style={{ fontSize: 13 }}
            />
          </Row>

          <Row label="ให้สาขาปรับสูตร">
            <Toggle checked={form.allowBranchVariants} onChange={(v) => setForm({ ...form, allowBranchVariants: v })}/>
          </Row>

          <Row label="รูปภาพหน้าปก">
            <input
              className="input"
              placeholder="ลิงก์ URL รูปภาพหน้าปก (https://...)"
              value={form.coverImageUrl || ''}
              onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
              style={{ fontSize: 12 }}
            />
          </Row>

          <Row label="วิดีโอประกอบชง">
            <input
              className="input"
              placeholder="ลิงก์ URL วิดีโอชง (YouTube / mp4)"
              value={form.videoUrl || ''}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              style={{ fontSize: 12 }}
            />
          </Row>

          <Row label="สถานะเผยแพร่"><span className={'pill ' + statusPillClass}>{statusLabel}</span></Row>
        </div>

        {existing && (
          <>
            <div style={{ height: 28 }}/>
            <div className="t-caption" style={{ marginBottom: 12, fontWeight: 750 }}>ข้อมูลผู้บันทึก (Meta Data)</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
              <div>ผู้เขียนคู่มือ: พนักงาน ID #{existing.authorStaffId}</div>
              <div>จำนวนเวอร์ชันเอกสาร: v{existing.version ?? 1}</div>
              <div>สร้างเอกสารเมื่อ: {existing.createdAt ? new Date(existing.createdAt).toLocaleString('th-TH') : '—'}</div>
              {existing.publishedAt && <div>เผยแพร่ทางการเมื่อ: {new Date(existing.publishedAt).toLocaleString('th-TH')}</div>}
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
    <div className="muted" style={{ fontWeight: 600 }}>{label}</div>
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
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Knowledge / Approvals</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">รายการรออนุมัติปรับปรุงสูตรสาขา (Approval Queue)</h1>
            <p className="page-desc">คำขอปรับสูตรการชงของพนักงานแต่ละสาขาแฟรนไชส์ เพื่อให้เหมาะสมกับอุปกรณ์ในสาขา</p>
          </div>
        </div>
      </div>

      <SOPSubNav active="approval" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
          <div className="t-caption" style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 700 }}>รอตรวจสอบ (Pending Review)</div>
          <div className="tabular" style={{ fontSize: 32, fontWeight: 800, marginTop: 4, color: 'var(--warning)' }}>{variants.length} รายการ</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">กำลังดึงคิวรายการอนุมัติสูตร…</div>
      ) : variants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-lg)' }}>
          <IconCheckCircle size={44} style={{ opacity: 0.3, color: 'var(--matcha-500)' }}/>
          <p style={{ marginTop: 12, fontWeight: 600 }}>ไม่มีคำขอค้างอนุมัติในระบบ</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {variants.map((r) => {
            const at = r.createdAt ? new Date(r.createdAt).toLocaleDateString('th-TH') : '—';
            return (
              <div key={r.id} className="card" style={{ padding: 24, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
                  <Avatar name={`Staff #${r.requestedByStaffId}`} size={44}/>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>พนักงาน ID #{r.requestedByStaffId}</span>
                      <span className="pill" style={{ background: 'var(--bg-muted)', border: 'none', fontSize: 11 }}>สาขา ID #{r.branchId}</span>
                      <span className="muted" style={{ fontSize: 12 }}>· ขอเมื่อ {at}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                      เสนอขอตั้งค่าสูตรสาขาแยกต่างหาก (Variant) สำหรับคู่มือชงหลักรหัส <b style={{ color: 'var(--text-primary)' }}>#{r.masterSopId}</b>
                    </div>
                  </div>
                  <span className="pill pill-warning" style={{ fontWeight: 700 }}>รออนุมัติการใช้</span>
                </div>

                {r.changeReason && (
                  <div className="card" style={{ padding: 14, marginBottom: 14, background: 'var(--bg-muted)', border: 'none' }}>
                    <div className="t-caption" style={{ marginBottom: 6, fontWeight: 700, fontSize: 10, color: 'var(--text-tertiary)' }}>เหตุผลการเปลี่ยนสูตร</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.changeReason}</div>
                  </div>
                )}

                {r.changesSummary && (
                  <div style={{ marginBottom: 20 }}>
                    <div className="t-caption" style={{ marginBottom: 6, fontWeight: 700, fontSize: 10 }}>รายละเอียดขั้นตอนการปรับแต่ง</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-muted)', padding: 12, borderRadius: 'var(--r-default)', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                      {r.changesSummary}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
                  <button
                    onClick={() => { const reason = prompt('ระบุเหตุผลในการปฏิเสธคำขอนี้:') ?? ''; if (reason) reject.mutate({ variantId: r.id, reason }); }}
                    disabled={reject.isPending}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}
                  >
                    <IconError size={14}/> ปฏิเสธคำขอ (Reject)
                  </button>
                  <button
                    onClick={() => { if(confirm('คุณต้องการกดอนุมัติการเปลี่ยนขั้นตอนสูตรชงของสาขานี้เลยใช่หรือไม่?')) approve.mutate({ variantId: r.id }); }}
                    disabled={approve.isPending}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <IconCheck size={14}/> อนุมัติให้ใช้สูตรนี้ (Approve)
                  </button>
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
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Knowledge / Compliance</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">รายงานการเข้าอ่านคู่มือ (Compliance Dashboard)</h1>
            <p className="page-desc">สถิติการยืนยันการรับทราบข้อมูลคู่มือชงและการปฏิบัติงานของพนักงานทั้งหมดในร้าน</p>
          </div>
        </div>
      </div>

      <SOPSubNav active="compliance" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }} className="inv-grid">
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
          <svg viewBox="0 0 240 240" style={{ width: 200, height: 200 }}>
            <circle cx="120" cy="120" r="90" fill="none" stroke="var(--bg-subtle)" strokeWidth="14"/>
            <circle cx="120" cy="120" r="90" fill="none" stroke="var(--matcha-500)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${dashOffset} ${2 * Math.PI * 90}`} transform="rotate(-90 120 120)" style={{ transition: 'stroke-dasharray 0.5s ease' }}/>
            <text x="120" y="112" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-tertiary)" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>อัตราการยืนยัน</text>
            <text x="120" y="150" textAnchor="middle" fontSize="38" fontWeight="800" fill="var(--text-primary)" style={{ letterSpacing: '-0.02em' }}>{compliantPct}%</text>
          </svg>
        </div>
        <div className="card" style={{ padding: 24, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <SectionHeader title="สถิติภาพรวมรายงาน" desc={isLoading ? 'กำลังวิเคราะห์ข้อมูลผลงาน…' : 'คำนวณจากยอดพนักงานที่กด Acknowledge บนคู่มือที่มีสถานะเป็นบังคับอ่าน'}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            <Stat label="อ่านยืนยันแล้ว" value={String(report?.acknowledged ?? 0)} color="var(--matcha-700)"/>
            <Stat label="ค้างยืนยันอ่าน" value={String(report?.pending ?? 0)}/>
            <Stat label="คู่มือที่ถูกติดตาม" value={String(report?.totalSops ?? 0)} color="var(--text-tertiary)"/>
          </div>
        </div>
      </div>

      {(report?.items ?? []).length > 0 && (
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
                {['คู่มือการใช้งาน (SOP)', 'ยืนยันอ่านแล้ว', 'จำนวนเป้าหมาย', 'อัตราส่วนอ่าน'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(report?.items ?? []).map((d) => {
                const pct = d.totalRequired > 0 ? Math.round((d.acknowledgedCount / d.totalRequired) * 100) : 0;
                return (
                  <tr key={d.sop.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.sop.title}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--matcha-700)', fontWeight: 700 }} className="tabular">{d.acknowledgedCount} คน</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-tertiary)' }} className="tabular">{d.totalRequired} คน</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 80, height: 6, background: 'var(--bg-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: pct >= 80 ? 'var(--matcha-500)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)' }}/>
                        </div>
                        <span className="tabular" style={{ fontWeight: 700, color: pct >= 80 ? 'var(--matcha-700)' : 'var(--text-primary)' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .inv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
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
    if (days === 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวานนี้';
    if (days < 7) return `${days} วันก่อน`;
    return dt.toLocaleDateString('th-TH');
  };

  const pillFor = (status) => ({
    pending: 'pill-warning',
    approved: 'pill-matcha',
    rejected: 'pill-danger',
    withdrawn: '',
  }[status] || '');

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Knowledge / Variants</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">รายการปรับสูตรเฉพาะสาขา (My Branch Variants)</h1>
            <p className="page-desc">ติดตามผลการอนุมัติสูตรชงแยกพิเศษของสาขาคุณ ส่งคำขอโดยเปิดเข้าหน้าคู่มือสูตรชงนั้นๆ</p>
          </div>
        </div>
      </div>

      <SOPSubNav active="variants" />

      <div style={{ marginBottom: 16 }}>
        <Tabs items={[
          { value: 'all', label: 'ทั้งหมด', count: counts.all },
          { value: 'pending', label: 'รออนุมัติ', count: counts.pending },
          { value: 'approved', label: 'ผ่านอนุมัติ', count: counts.approved },
          { value: 'rejected', label: 'ถูกปฏิเสธ', count: counts.rejected },
        ]} value={tab} onChange={setTab}/>
      </div>

      {isLoading ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center', marginTop: 16 }}>กำลังโหลดรายการปรับปรุงสูตร…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-lg)', marginTop: 16 }}>
          <IconBookmark size={40} style={{ opacity: 0.3 }}/>
          <p style={{ marginTop: 12, fontWeight: 600 }}>ไม่พบรายการคำขอปรับสูตรสาขา</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>กดเลือกที่คู่มือสูตรชงหลัก แล้วกดยื่นปรับปรุงขั้นตอนพิเศษได้ตลอดเวลา</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          {filtered.map((v) => {
            const master = sopMap.get(v.masterSopId);
            return (
              <div key={v.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)' }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{master?.title || `คู่มือหลัก ID #${v.masterSopId}`}</span>
                    <span className={'pill ' + pillFor(v.status)} style={{ fontWeight: 700 }}><span className="dot"/> {v.status}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {v.changeReason ? <span>เหตุผล: {v.changeReason}</span> : <span>ไม่ได้ระบุเหตุผลประกอบ</span>}
                    <span>·</span>
                    <span>ส่งคำขอเมื่อ {fmtDate(v.createdAt)}</span>
                  </div>
                  {v.reviewNotes && (
                    <div style={{ fontSize: 12.5, marginTop: 10, padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--r-subtle)', borderLeft: '3.5px solid var(--matcha-500)' }}>
                      <strong>ความคิดเห็นจากสำนักงานใหญ่:</strong> {v.reviewNotes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {v.status === 'pending' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', fontWeight: 600 }}
                      onClick={() => {
                        if (window.confirm('คุณต้องการยกเลิกการส่งคำขออนุมัติปรับสูตรนี้ใช่หรือไม่?')) {
                          withdrawVariant.mutate({ variantId: v.id });
                        }
                      }}
                      disabled={withdrawVariant.isPending}
                    >
                      ยกเลิกคำขอ (Withdraw)
                    </button>
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

  const greetingName = session?.firstName || 'พนักงานชงชา';
  const totalDone = completed.length;
  const totalTasks = tasks.length;
  const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

  const sections = [
    { l: 'เกินกำหนดเวลา (Overdue)', c: 'var(--danger)', tasks: overdue },
    { l: 'งานที่ต้องทำ (Assigned Tasks)', c: 'var(--warning)', tasks: pending },
    { l: 'กำลังดำเนินการ (In Progress)', c: 'var(--matcha-600)', tasks: inProgress },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="page" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      {/* Learning platform styled header */}
      <div className="page-header" style={{ marginBottom: 28, background: 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface))', padding: 24, borderRadius: 'var(--r-lg)', border: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="t-caption jp" style={{ color: 'var(--matcha-700)', fontSize: 13, fontWeight: 700 }}>朝の挨拶 · Good morning</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, letterSpacing: '-0.020em' }}>สวัสดี, {greetingName}</h1>
            <p className="page-desc" style={{ fontSize: 14, marginTop: 4 }}>{totalTasks > 0 ? `คุณอ่านและประเมินหลักสูตรไปแล้วเสร็จสิ้น ${pct}%` : 'ไม่มีประวัติคำสั่งฝึกอบรม SOP ค้างเรียนในระบบ'}</p>
          </div>
          {totalTasks > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-subtle)" strokeWidth="6.5"/>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--matcha-500)" strokeWidth="6.5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 32 * (pct / 100)} ${2 * Math.PI * 32}`} transform="rotate(-90 40 40)"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <span className="tabular" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{totalDone}/{totalTasks}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <SOPSubNav active="tasks" />

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }} className="muted">กำลังดึงข้อมูลพนักงานฝึกงาน…</div>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-lg)' }}>
          <IconCheckCircle size={44} style={{ opacity: 0.3, color: 'var(--matcha-500)' }}/>
          <p style={{ marginTop: 12, fontWeight: 600 }}>ไม่มีงานค้างฝึกฝน</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>คุณรับทราบและผ่านการอบรมสูตรเครื่องดื่มทั้งหมดเรียบร้อยแล้ว!</p>
        </div>
      ) : sections.map((sec) => (
        <div key={sec.l} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, borderLeft: '4px solid ' + sec.c, paddingLeft: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: sec.c, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sec.l}</span>
            <span className="pill" style={{ background: sec.c + '12', color: sec.c, border: 'none', fontSize: 11, fontWeight: 700 }}>{sec.tasks.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {sec.tasks.map((t) => {
              const dueLabel = t.dueDate ? `เดดไลน์: ${new Date(t.dueDate).toLocaleDateString('th-TH')}` : 'ไม่กำหนดส่ง';
              return (
                <div key={t.id} className="card" style={{ overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span className="pill" style={{ fontSize: 10, background: 'var(--matcha-50)', color: 'var(--matcha-700)', border: 'none', fontWeight: 600 }}>SOP ID #{t.sopId}</span>
                      <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>{t.status}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.3 }}>{t.sop?.title ?? `รายการอบรม #${t.id}`}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconClock size={12}/>
                      <span>{dueLabel}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, padding: '12px 18px', background: 'var(--bg-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => navigate(`/sop/${t.sopId}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                    >
                      เปิดอ่านสูตร
                    </button>
                    {t.status === 'pending' && (
                      <button
                        onClick={() => startTask.mutate({ taskId: t.id })}
                        disabled={startTask.isPending}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                      >
                        เริ่มฝึกชง
                      </button>
                    )}
                    {t.status === 'in_progress' && (
                      <button
                        onClick={() => completeTask.mutate({ taskId: t.id })}
                        disabled={completeTask.isPending}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                      >
                        เรียนเสร็จแล้ว
                      </button>
                    )}
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
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="breadcrumb" style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>Knowledge / Material Costs</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">อัตราการใช้วัตถุดิบและคำนวณต้นทุน (Material Costs)</h1>
            <p className="page-desc">วิเคราะห์ต้นทุนวัตถุดิบเฉลี่ยต่อแก้ว กำไรสุทธิ อัตราส่วนสต็อก และสถิติการใช้งานจริงหลังการสั่งชง POS</p>
          </div>
        </div>
      </div>

      <SOPSubNav active="material" />

      <div style={{ marginBottom: 20 }}>
        <Tabs
          items={[
            { value: 'recipes', label: 'สูตรชง & วิเคราะห์ต้นทุนแก้ว' },
            { value: 'history', label: 'ประวัติตัดสต็อกรายแก้ว' },
            { value: 'summary', label: 'วิเคราะห์สรุปการใช้วัตถุดิบ' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {(tab === 'history' || tab === 'summary') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--border-default)' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>จากวันที่</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input" style={{ fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>ถึงวันที่</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input" style={{ fontSize: 13 }} />
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div>
          {recipesLoading ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังวิเคราะห์ราคาทุนสูตรสินค้า...</div>
          ) : recipeCosts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', borderRadius: 'var(--r-lg)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 16, marginBottom: 6, fontWeight: 600 }}>ไม่พบข้อมูลสูตรชงในระบบ</p>
              <p style={{ fontSize: 13 }}>โปรดสร้างส่วนผสมวัตถุดิบ (Recipes) ในหัวข้อจัดการเมนูก่อนวิเคราะห์ต้นทุน</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 8 }}>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>สูตรเมนูเครื่องดื่มที่มี</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{recipeCosts.length} เมนู</div>
                </div>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>ค่าเฉลี่ยต้นทุนต่อแก้ว</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: 'var(--danger)' }}>
                    {fmtCurrency(recipeCosts.reduce((s, r) => s + r.totalCostPerCup, 0) / (recipeCosts.length || 1))}
                  </div>
                </div>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>อัตรากำไรขั้นต้น (Margin)</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--matcha-700)', marginTop: 4 }}>
                    {Math.round(recipeCosts.reduce((s, r) => s + r.marginPercent, 0) / (recipeCosts.length || 1))}%
                  </div>
                </div>
              </div>

              {recipeCosts.map((item) => {
                const isExpanded = expandedMenu === item.menuItemId;
                return (
                  <div 
                    key={item.menuItemId} 
                    className="card" 
                    style={{ 
                      overflow: 'hidden', 
                      border: '1px solid var(--border-default)', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--r-md)', 
                      transition: 'border-color 200ms ease'
                    }}
                  >
                    <div
                      onClick={() => setExpandedMenu(isExpanded ? null : item.menuItemId)}
                      style={{ 
                        padding: '16px 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 16, 
                        cursor: 'pointer', 
                        background: isExpanded ? 'var(--bg-muted)' : 'transparent',
                        transition: 'background 200ms ease'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{item.menuItemName}</div>
                        {item.menuItemNameThai && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{item.menuItemNameThai}</div>}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 90 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>ต้นทุนแก้ว</div>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--danger)', marginTop: 2 }}>{fmtCurrency(item.totalCostPerCup)}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 90 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>ราคาหน้าร้าน</div>
                        <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text-primary)', marginTop: 2 }}>{fmtCurrency(item.basePrice)}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>มาร์จิ้น</div>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: item.marginPercent >= 50 ? 'var(--matcha-700)' : item.marginPercent >= 30 ? 'var(--warning)' : 'var(--danger)', marginTop: 2 }}>
                          {item.marginPercent}%
                        </div>
                      </div>
                      <span style={{ fontSize: 14, color: 'var(--text-tertiary)', paddingLeft: 6 }}>
                        {isExpanded ? <IconChevUp size={16}/> : <IconChevDown size={16}/>}
                      </span>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-default)', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
                              {['ส่วนผสมวัตถุดิบ', 'ปริมาณที่ใช้', 'หน่วย', 'ทุน/หน่วย', 'ราคาทุนรวมแก้ว', 'สต็อกคงคลัง', 'ชงเพิ่มได้สูงสุด'].map((h) => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {item.ingredients.map((ing) => (
                              <tr key={ing.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {ing.name}
                                  {ing.nameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>({ing.nameThai})</span>}
                                </td>
                                <td style={{ padding: '10px 14px' }}>{fmtNum(ing.quantityPerCup)}</td>
                                <td style={{ padding: '10px 14px' }}>{ing.unitOfMeasure}</td>
                                <td style={{ padding: '10px 14px' }}>{fmtCurrency(ing.costPerUnit)}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--danger)' }}>{fmtCurrency(ing.costPerCup)}</td>
                                <td style={{ padding: '10px 14px' }}>
                                  {ing.currentStock !== null ? (
                                    <span style={{ fontWeight: 600, color: ing.currentStock <= 0 ? 'var(--danger)' : ing.currentStock < 100 ? 'var(--warning)' : 'var(--matcha-700)' }}>
                                      {fmtNum(ing.currentStock)} {ing.unitOfMeasure}
                                    </span>
                                  ) : <span className="muted">-</span>}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {ing.cupsAvailable !== null ? (
                                    <span style={{ fontWeight: 700, color: ing.cupsAvailable <= 5 ? 'var(--danger)' : ing.cupsAvailable <= 20 ? 'var(--warning)' : 'var(--matcha-700)' }}>
                                      {ing.cupsAvailable} แก้ว
                                    </span>
                                  ) : <span className="muted">-</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid var(--border-default)' }}>
                          <span className="muted" style={{ fontWeight: 500 }}>กำไรต่อแก้ว: <b style={{ color: 'var(--matcha-700)', fontSize: 14 }}>{fmtCurrency(item.profitPerCup)}</b></span>
                          <span className="muted">รวมส่วนผสมทั้งหมด {item.ingredients.length} ชนิด</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)' }}>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังดึงประวัติการขายสินค้าและสต็อก…</div>
          ) : usageHistory.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>ไม่มีบันทึกข้อมูลการตัดยอดสต็อกเครื่องดื่มในช่วงเวลานี้</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
                  {['วันที่และเวลาขาย', 'ชื่อวัตถุดิบ', 'ปริมาณใช้จริง', 'หน่วย', 'มูลค่าราคาทุนรวม', 'รหัสคำสั่งซื้อ POS'].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString('th-TH') : '-'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.itemName}
                      {row.itemNameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>({row.itemNameThai})</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }} className="tabular">{fmtNum(row.quantity)}</td>
                    <td style={{ padding: '12px 14px' }}>{row.itemUnit}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--danger)' }}>{row.totalCost > 0 ? fmtCurrency(row.totalCost) : '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {row.orderNumber ? <span className="pill" style={{ background: 'var(--matcha-50)', color: 'var(--matcha-700)', border: 'none', fontWeight: 600, fontSize: 11 }}>#{row.orderNumber}</span> : <span className="muted">-</span>}
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
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>กำลังประมวลยอดรวมการใช้วัตถุดิบ...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>ยอดใช้จ่ายวัตถุดิบสุทธิ</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>{fmtCurrency(usageSummary?.totalCost ?? 0)}</div>
                </div>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>ยอดจำหน่ายรวมเครื่องดื่ม</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{usageSummary?.totalOrders ?? 0} ออเดอร์</div>
                </div>
                <div className="card" style={{ padding: 18, border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}>
                  <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>ชนิดส่วนผสมที่ตัดสต็อกออก</div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{usageSummary?.items?.length ?? 0} รายการ</div>
                </div>
              </div>
              <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', borderRadius: 'var(--r-lg)' }}>
                {(usageSummary?.items ?? []).length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>ไม่มีข้อมูลสรุปในช่วงเวลานี้</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-default)' }}>
                        {['ชื่อวัตถุดิบในร้าน', 'ปริมาณใช้รวม', 'หน่วย', 'มูลค่าทุนรวม', 'ทุนต่อหน่วย', 'สต็อกเหลือในร้าน', 'สถานะความเสี่ยง'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(usageSummary?.items ?? []).map((row) => {
                        const status = row.currentStock <= 0 ? 'หมดสต็อก' : row.currentStock < 50 ? 'ใกล้หมด' : 'พร้อมบริการ';
                        const statusColor = row.currentStock <= 0 ? 'var(--danger)' : row.currentStock < 50 ? 'var(--warning)' : 'var(--matcha-700)';
                        return (
                          <tr key={row.inventoryItemId} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-muted)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {row.name}
                              {row.nameThai && <span className="muted" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>({row.nameThai})</span>}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700 }} className="tabular">{fmtNum(row.totalUsed)}</td>
                            <td style={{ padding: '12px 14px' }}>{row.unitOfMeasure}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--danger)' }}>{fmtCurrency(row.totalCost)}</td>
                            <td style={{ padding: '12px 14px' }}>{fmtCurrency(row.costPerUnit)}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{fmtNum(row.currentStock)} {row.unitOfMeasure}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor + '12', padding: '3px 10px', borderRadius: 99, display: 'inline-block' }}>
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
