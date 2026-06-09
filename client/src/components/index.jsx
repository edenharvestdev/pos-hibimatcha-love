// ============================================
// Shared UI Components: drawer, modal, toast, etc.
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";
import {
  IconCards, IconCheck, IconCheckCircle, IconChevDown, IconError, IconExport,
  IconGrid, IconImport, IconInfo, IconList, IconPlus, IconSearch, IconX,
} from "@/icons";

// ----- App Context (global state) -----
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ----- Drawer (right slide-out) -----
export const Drawer = ({ open, onClose, title, subtitle, width = 720, children, footer }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(20,30,20,0.18)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 300ms var(--ease-out-expo)',
        }}
        onClick={onClose}
      />
      <aside
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 91,
          width: `min(${width}px, 92vw)`,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 400ms var(--ease-out-expo)',
          display: 'flex', flexDirection: 'column',
        }}
        aria-hidden={!open}
      >
        <header style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            {subtitle && <div className="t-caption" style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{subtitle}</div>}
            <div className="t-h3" style={{ fontWeight: 600 }}>{title}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><IconX size={18}/></button>
        </header>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 24px 32px' }}>{children}</div>
        {footer && (
          <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            {footer}
          </footer>
        )}
      </aside>
    </>
  );
};

// ----- Modal -----
export const Modal = ({ open, onClose, title, children, footer, width = 480 }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(20,30,20,0.32)', backdropFilter: 'blur(8px)',
        display: 'grid', placeItems: 'center',
        animation: 'fadeIn 240ms var(--ease-out-expo)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, 92vw)`,
          background: 'var(--bg-surface)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          animation: 'bounceIn 360ms var(--ease-out-expo)',
        }}
      >
        {title && (
          <header style={{ padding: '20px 24px 8px' }}>
            <div className="t-h3" style={{ fontWeight: 600 }}>{title}</div>
          </header>
        )}
        <div style={{ padding: title ? '8px 24px 20px' : 24 }}>{children}</div>
        {footer && (
          <footer style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>{footer}</footer>
        )}
      </div>
    </div>
  );
};

// ----- Toast -----
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, ...t }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), t.duration || 4000);
  }, []);
  // Listen for global button-click feedback events
  useEffect(() => {
    const onEvt = (e) => {
      push({ type: e.detail.type || 'success', msg: e.detail.label, duration: 1800 });
    };
    window.addEventListener('hibi-toast', onEvt);
    return () => window.removeEventListener('hibi-toast', onEvt);
  }, [push]);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass"
            style={{
              minWidth: 280, maxWidth: 380,
              padding: '12px 16px',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'slideUp 320ms var(--ease-out-expo)',
              pointerEvents: 'auto',
              fontSize: 14,
            }}
          >
            {t.type === 'success' && <span style={{ color: 'var(--matcha-600)' }}><IconCheckCircle size={20}/></span>}
            {t.type === 'error' && <span style={{ color: 'var(--danger)' }}><IconError size={20}/></span>}
            {t.type === 'info' && <span style={{ color: 'var(--info)' }}><IconInfo size={20}/></span>}
            <div style={{ flex: 1 }}>{t.msg}</div>
            {t.action && <button className="btn btn-xs btn-secondary" onClick={t.action.onClick}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

// ----- Form helpers -----
export const Field = ({ label, required, hint, error, children }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>{label}{required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}</label>}
    {children}
    {hint && !error && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{hint}</div>}
    {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{error}</div>}
  </div>
);

export const Select = ({ value, onChange, options, placeholder = "Select…", style }) => (
  <div style={{ position: 'relative', ...style }}>
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="input"
      style={{ appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, cursor: 'pointer' }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }}><IconChevDown size={16}/></span>
  </div>
);

export const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
    <span
      onClick={() => onChange?.(!checked)}
      style={{
        width: 36, height: 22, borderRadius: 999,
        background: checked ? 'var(--matcha-600)' : 'var(--stone-300)',
        position: 'relative', transition: 'background 200ms var(--ease-out-expo)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 16 : 2,
        width: 18, height: 18, borderRadius: 999, background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 240ms var(--ease-out-expo)',
      }}/>
    </span>
    {label && <span style={{ fontSize: 14 }}>{label}</span>}
  </label>
);

export const Checkbox = ({ checked, onChange, indeterminate, label, size = 18 }) => {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <span
        onClick={() => onChange?.(!checked)}
        style={{
          width: size, height: size, borderRadius: 5,
          border: '1.5px solid ' + (checked || indeterminate ? 'var(--matcha-600)' : 'var(--border-emphasis)'),
          background: checked || indeterminate ? 'var(--matcha-600)' : 'transparent',
          display: 'grid', placeItems: 'center',
          transition: 'all 180ms',
        }}
      >
        {checked && <IconCheck size={size - 4} style={{ color: 'white' }} stroke={2.5}/>}
        {indeterminate && !checked && <span style={{ width: size - 8, height: 2, background: 'white' }}/>}
      </span>
      {label && <span style={{ fontSize: 14 }}>{label}</span>}
    </label>
  );
};

// ----- Tabs -----
export const Tabs = ({ items, value, onChange, size = 'md' }) => (
  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-default)', position: 'relative' }}>
    {(items ?? []).map((it) => {
      const key = it.value ?? it;
      const label = it.label ?? it;
      const active = key === value;
      return (
        <button
          key={key}
          onClick={() => onChange?.(key)}
          style={{
            padding: size === 'sm' ? '8px 12px' : '12px 16px',
            fontSize: size === 'sm' ? 13 : 14,
            fontWeight: 500,
            color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
            borderBottom: '2px solid ' + (active ? 'var(--matcha-600)' : 'transparent'),
            marginBottom: -1,
            transition: 'color 180ms, border-color 240ms var(--ease-out-expo)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          {label}
          {it.count !== undefined && <span className="pill" style={{ height: 18, padding: '0 6px', fontSize: 11, background: active ? 'var(--matcha-50)' : 'var(--bg-subtle)', color: active ? 'var(--matcha-700)' : 'var(--text-tertiary)' }}>{it.count}</span>}
        </button>
      );
    })}
  </div>
);

// ----- Search input -----
export const SearchInput = ({ value, onChange, placeholder = "Search…", shortcut = "⌘F", style }) => (
  <div style={{ position: 'relative', ...style }}>
    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}><IconSearch size={16}/></span>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="input"
      style={{ paddingLeft: 36, paddingRight: shortcut ? 50 : 12 }}
    />
    {shortcut && <span className="kbd" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>{shortcut}</span>}
  </div>
);

// ----- Top action bar (CRUD) -----
export const TopActionBar = ({ search, onSearch, filters, viewMode, onViewMode, onAdd, onExport, onImport, addLabel = '+ New', actions }) => (
  <div style={{
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    padding: '14px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--r-md)',
    marginBottom: 16,
    boxShadow: 'var(--shadow-xs)',
  }}>
    <SearchInput value={search} onChange={onSearch} placeholder="Search…" shortcut="⌘F" style={{ minWidth: 240, flex: '1 1 240px', maxWidth: 360 }}/>
    {filters}
    <div style={{ flex: 1 }}/>
    {viewMode && (
      <div style={{ display: 'inline-flex', background: 'var(--bg-muted)', borderRadius: 'var(--r-default)', padding: 3, gap: 2 }}>
        {[{ k: 'grid', I: IconGrid }, { k: 'list', I: IconList }, { k: 'cards', I: IconCards }].map(({ k, I }) => (
          <button
            key={k}
            onClick={() => onViewMode?.(k)}
            style={{
              width: 34, height: 28, borderRadius: 6,
              background: viewMode === k ? 'var(--bg-surface)' : 'transparent',
              color: viewMode === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: viewMode === k ? 'var(--shadow-xs)' : 'none',
              display: 'grid', placeItems: 'center',
            }}
          ><I size={16}/></button>
        ))}
      </div>
    )}
    {actions}
    {onImport && <button className="btn btn-secondary btn-sm" onClick={onImport}><IconImport size={16}/> Import</button>}
    {onExport && <button className="btn btn-secondary btn-sm" onClick={onExport}><IconExport size={16}/> Export</button>}
    {onAdd && <button className="btn btn-primary btn-sm" onClick={onAdd}><IconPlus size={16}/> {addLabel}</button>}
  </div>
);

// ----- Empty state -----
export const EmptyState = ({ illustration, title, desc, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
    <div style={{ marginBottom: 16, opacity: 0.85 }}>{illustration}</div>
    <div className="t-h3" style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
    <div className="muted" style={{ maxWidth: 360, marginBottom: 20 }}>{desc}</div>
    {action}
  </div>
);

// ----- Stat card -----
export const StatCard = ({ label, value, delta, sub, accent, glow, big }) => (
  <div className="card" style={{
    padding: big ? 28 : 20,
    background: accent ? 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface))' : 'var(--bg-surface)',
    boxShadow: glow ? 'var(--shadow-md), var(--glow-soft)' : 'var(--shadow-xs)',
    position: 'relative', overflow: 'hidden',
  }}>
    {glow && (
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 140, height: 140,
        background: 'radial-gradient(circle, rgba(34,197,94,0.18), transparent 70%)',
        pointerEvents: 'none',
      }}/>
    )}
    <div className="t-caption" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
    <div className="tabular" style={{ fontSize: big ? 48 : 30, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 8, lineHeight: 1.1 }}>{value}</div>
    {(delta || sub) && (
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        {delta && <span style={{ color: delta.startsWith('-') ? 'var(--danger)' : 'var(--matcha-700)', fontWeight: 500 }}>{delta}</span>}
        {sub && <span className="muted">{sub}</span>}
      </div>
    )}
  </div>
);

// ----- Generic placeholder image (striped SVG) -----
export const Placeholder = ({ w = '100%', h = 160, label, radius = 12, ratio }) => (
  <div
    role="img"
    aria-label={label || 'placeholder'}
    style={{
      width: w, height: ratio ? undefined : h, aspectRatio: ratio,
      borderRadius: radius,
      background: `repeating-linear-gradient(135deg, var(--matcha-50), var(--matcha-50) 10px, var(--matcha-100) 10px, var(--matcha-100) 20px)`,
      display: 'grid', placeItems: 'center',
      color: 'var(--matcha-700)',
      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
      border: '1px solid var(--matcha-100)',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {label && (
      <span style={{ background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: 999, border: '1px solid var(--border-default)', opacity: .92 }}>
        {label}
      </span>
    )}
  </div>
);

// ----- Bulk action bar (slides down when items selected) -----
export const BulkActionBar = ({ count, onClear, actions }) => (
  <div style={{
    position: 'sticky', top: 64, zIndex: 30,
    transform: count > 0 ? 'translateY(0)' : 'translateY(-20px)',
    opacity: count > 0 ? 1 : 0,
    pointerEvents: count > 0 ? 'auto' : 'none',
    transition: 'all 280ms var(--ease-out-expo)',
    marginBottom: 12,
  }}>
    <div className="glass" style={{
      padding: '10px 14px',
      borderRadius: 'var(--r-md)',
      boxShadow: 'var(--shadow-md)',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{count} selected</span>
      <span style={{ width: 1, height: 20, background: 'var(--border-default)' }}/>
      {actions}
      <div style={{ flex: 1 }}/>
      <button className="btn btn-ghost btn-icon" onClick={onClear}><IconX size={16}/></button>
    </div>
  </div>
);

// ----- Section header within page -----
export const SectionHeader = ({ title, desc, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
    <div>
      <div className="t-h3" style={{ fontWeight: 600 }}>{title}</div>
      {desc && <div className="muted" style={{ marginTop: 4 }}>{desc}</div>}
    </div>
    {action}
  </div>
);

// ----- Count-up animation -----
export const CountUp = ({ to, duration = 800, prefix = '', suffix = '', decimals = 0, comma = true }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setN(e * to);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  const v = decimals ? n.toFixed(decimals) : Math.round(n);
  const formatted = comma ? Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v;
  return <span className="tabular">{prefix}{formatted}{suffix}</span>;
};

// ----- Avatar -----
export const Avatar = ({ name = 'User', size = 32, src }) => {
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const hue = name.charCodeAt(0) * 7 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? `center/cover url(${src})` : `linear-gradient(135deg, oklch(72% 0.08 ${hue}), oklch(56% 0.1 ${hue}))`,
      color: 'white', fontSize: size * 0.36, fontWeight: 600,
      display: 'grid', placeItems: 'center',
      flex: 'none',
    }}>
      {!src && initials}
    </div>
  );
};

// ----- Mini sparkline -----
export const Sparkline = ({ data, w = 100, h = 30, color = 'var(--matcha-600)', fill = true }) => {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => [i * (w / (data.length - 1)), h - ((v - min) / r) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {fill && <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={color} opacity={0.12}/>}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ----- Bar chart (mini) -----
export const BarChart = ({ data, w = 100, h = 30, color = 'var(--matcha-600)' }) => {
  if (!data?.length) return null;
  const max = Math.max(...data) || 1;
  const bw = (w - (data.length - 1) * 2) / data.length;
  return (
    <svg width={w} height={h}>
      {data.map((v, i) => {
        const bh = (v / max) * h;
        return <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} rx={bw > 4 ? 2 : 0} fill={color} opacity={0.7 + (v / max) * 0.3}/>;
      })}
    </svg>
  );
};

// ----- Hash-based router -----
export const useHashRoute = () => {
  const [route, setRoute] = useState(() => location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const onChange = () => setRoute(location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [route, (path) => { location.hash = path; }];
};

