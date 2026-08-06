// ============================================
// Page: landing
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { IconBrand,IconBuilding,IconChevDown,IconChevRight,IconGlobe,IconHelp,IconMoon,IconPOS,IconSun,WhiskLoader } from "@/icons";
import { useApp,Toggle } from "@/components";
import { BRAND_NAME } from '@/lib/brand';


export const PageLanding = () => {
  const { navigate, theme, setTheme, branch, lang, setLang, t } = useApp();
  const [hovered, setHovered] = useState(null);
  const lastVisited = localStorage.getItem('hibi-last-app');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Mesh background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.6 }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, var(--matcha-200), transparent 60%)', filter: 'blur(60px)', animation: 'drift 20s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, var(--matcha-100), transparent 60%)', filter: 'blur(60px)', animation: 'drift 24s ease-in-out infinite reverse' }}/>
        <div style={{ position: 'absolute', top: '30%', right: '20%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(234,179,8,0.18), transparent 60%)', filter: 'blur(80px)', animation: 'drift 18s ease-in-out infinite' }}/>
      </div>

      {/* Top right utilities */}
      <div data-no-toast style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8, zIndex: 2 }}>
        <button onClick={() => setLang(lang === 'th' ? 'en' : 'th')} className="btn btn-secondary btn-sm" title="Toggle language">
          <IconGlobe size={14}/> {lang === 'th' ? 'EN' : 'ไทย'}
        </button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="btn btn-ghost btn-icon" aria-label="Toggle theme">
          {theme === 'dark' ? <IconSun size={18}/> : <IconMoon size={18}/>}
        </button>
        <button className="btn btn-ghost btn-icon" aria-label="Help"><IconHelp size={18}/></button>
      </div>

      {/* Center content */}
      <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ marginBottom: 40, animation: 'slideDown 0.5s ease-out' }}>
            <div style={{ width: 48, height: 48, background: 'var(--matcha-500)', borderRadius: 12, marginBottom: 24, boxShadow: '0 8px 16px rgba(46,139,87,0.2)' }} />
            <h1 className="serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Welcome to<br/>{BRAND_NAME}.
            </h1>
            <div className="jp" style={{ fontSize: 16, color: 'var(--text-tertiary)', marginTop: 12, letterSpacing: '0.06em' }}>POS & Backoffice</div>
          </div>
          <div className="muted" style={{ fontSize: 17, marginTop: 16, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            {t('landing.chooseDestination')}
          </div>
        </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, maxWidth: 800, margin: '0 auto' }}>
            {[
              {
                key: 'pos',
                path: '/pos/login',
                icon: IconPOS,
                tint: 'linear-gradient(135deg, var(--matcha-100), var(--matcha-200))',
                accent: 'var(--matcha-700)',
                title: t('landing.openPOS'),
                desc: t('landing.posDesc'),
                cta: t('landing.quickPIN'),
                badge: t('landing.forStaff'),
              },
              {
                key: 'backoffice',
                path: '/backoffice/login',
                icon: IconBuilding,
                tint: 'linear-gradient(135deg, var(--stone-100), var(--stone-200))',
                accent: 'var(--stone-700)',
                title: t('landing.backoffice'),
                desc: t('landing.backofficeDesc'),
                cta: t('landing.signIn'),
                badge: t('landing.forManagement'),
              },
            ].map((card, i) => {
              const I = card.icon;
              const isLast = lastVisited === card.key;
              return (
                <button
                  key={card.key}
                  data-no-toast
                  onClick={() => { localStorage.setItem('hibi-last-app', card.key); navigate(card.path); }}
                  onMouseEnter={() => setHovered(card.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    padding: 36,
                    background: 'var(--bg-surface)',
                    border: '1.5px solid ' + (hovered === card.key ? 'var(--matcha-400)' : 'var(--border-default)'),
                    borderRadius: 'var(--r-xl)',
                    textAlign: 'left',
                    transition: 'transform 300ms var(--ease-out-expo), box-shadow 300ms, border-color 240ms',
                    transform: hovered === card.key ? 'translateY(-6px)' : 'none',
                    boxShadow: hovered === card.key ? 'var(--shadow-lg), var(--glow-soft)' : 'var(--shadow-sm)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: `slideUp 600ms var(--ease-out-expo) ${i * 100}ms both`,
                    minHeight: 280,
                    display: 'flex', flexDirection: 'column',
                  }}
                >
                  {isLast && (
                    <span className="pill pill-matcha" style={{ position: 'absolute', top: 16, right: 16, fontSize: 10 }}>
                      <span className="dot"/> {t('landing.lastVisited')}
                    </span>
                  )}
                  <div style={{
                    width: 80, height: 80, borderRadius: 20,
                    background: card.tint,
                    color: card.accent,
                    display: 'grid', placeItems: 'center',
                    marginBottom: 24,
                  }}>
                    <I size={36}/>
                  </div>
                  <div className="t-caption" style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>{card.badge}</div>
                  <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>{card.title}</div>
                  <div className="muted" style={{ fontSize: 14, marginBottom: 24 }}>{card.desc}</div>
                  <div style={{ flex: 1 }}/>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontSize: 15, fontWeight: 500, color: 'var(--matcha-700)',
                  }}>
                    {card.cta}
                    <span style={{
                      display: 'inline-grid', placeItems: 'center',
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--matcha-50)',
                      transform: hovered === card.key ? 'translateX(4px)' : 'none',
                      transition: 'transform 240ms var(--ease-out-expo)',
                    }}>
                      <IconChevRight size={14}/>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
      </div>

      {/* Footer */}
      <div data-no-toast style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-tertiary)' }}>
          <IconBuilding size={14}/>
          <span>{t('landing.branch')}</span>
          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {branch.name} <IconChevDown size={12}/>
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>v2026.5.1 · Hibi House</div>
      </div>
    </div>
  );
};

