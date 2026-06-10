// ============================================
// Page: settings
// ============================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { EmptyZen,IconBell,IconBook,IconBox,IconBrand,IconBuilding,IconChevRight,IconExport,IconGlobe,IconInfo,IconLock,IconPhone,IconPrint,IconQR,IconReceipt,IconScanner,IconShare,IconSun,IconUser,IconWallet } from "@/icons";
const ICON_MAP = { IconBell,IconBook,IconBox,IconBrand,IconBuilding,IconGlobe,IconInfo,IconLock,IconPhone,IconPrint,IconQR,IconReceipt,IconScanner,IconShare,IconSun,IconUser,IconWallet };
import { useApp,Drawer,Field,Select,Toggle,Checkbox,EmptyState,SectionHeader,Avatar } from "@/components";
import { Logo } from "@/components/Shell";
import { trpc } from "@/lib/trpc";
import { getSession, clearSession } from "@/lib/authStore";
import { useAutomation, resetAutomation, AUTOMATION_LABELS } from "@/lib/automationSettings";


const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', labelKey: 'settings.profile', icon: 'IconUser' },
  { id: 'automation', label: 'Automation', labelKey: 'settings.automation', icon: 'IconBell' },
  { id: 'appearance', label: 'Appearance', labelKey: 'settings.appearance', icon: 'IconSun' },
  { id: 'notifications', label: 'Notifications', labelKey: 'settings.notifications', icon: 'IconBell' },
  { id: 'security', label: 'Security', labelKey: 'settings.security', icon: 'IconLock' },
  { id: 'branches', label: 'Branches', labelKey: 'settings.branches', icon: 'IconBuilding' },
  { id: 'lang', label: 'Language & Region', labelKey: 'settings.langRegion', icon: 'IconGlobe' },
  { id: 'billing', label: 'Billing', labelKey: 'settings.billing', icon: 'IconWallet' },
  { id: 'integrations', label: 'Integrations', labelKey: 'settings.integrations', icon: 'IconShare' },
  { id: 'payment', label: 'Payment & QR', labelKey: 'settings.payment', icon: 'IconQR' },
  { id: 'receipt', label: 'Receipt & Print', labelKey: 'settings.receipt', icon: 'IconReceipt' },
  { id: 'hardware', label: 'Hardware', labelKey: 'settings.hardware', icon: 'IconScanner' },
  { id: 'data', label: 'Data & Privacy', labelKey: 'settings.data', icon: 'IconBook' },
  { id: 'about', label: 'About', labelKey: 'settings.about', icon: 'IconInfo' },
];

export const PageSettings = () => {
  const [tab, setTab] = useState('profile');
  const { theme, setTheme, t, lang } = useApp();
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('settings.title')}</h1>
        <p className="page-desc">{t('settings.desc')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }} className="settings-grid">
        {/* Sidebar */}
        <aside style={{ position: 'sticky', top: 80, alignSelf: 'flex-start' }} className="settings-aside">
          {SETTINGS_TABS.map((item) => {
            const I = ICON_MAP[item.icon] || IconUser;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                width: '100%', padding: '9px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                borderRadius: 'var(--r-subtle)',
                background: active ? 'var(--matcha-50)' : 'transparent',
                color: active ? 'var(--matcha-700)' : 'var(--text-secondary)',
                fontSize: 13.5, fontWeight: active ? 500 : 400,
                marginBottom: 2, textAlign: 'left',
              }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-muted)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <I size={16}/>
                <span>{item.labelKey ? t(item.labelKey) : item.label}</span>
              </button>
            );
          })}
        </aside>

        <div>
          {tab === 'profile' && <SettingsProfile/>}
          {tab === 'automation' && <SettingsAutomation/>}
          {tab === 'appearance' && <SettingsAppearance theme={theme} setTheme={setTheme}/>}
          {tab === 'notifications' && <SettingsNotifications/>}
          {tab === 'security' && <SettingsSecurity/>}
          {tab === 'lang' && <SettingsLanguage/>}
          {tab === 'integrations' && <SettingsIntegrations/>}
          {tab === 'payment' && <SettingsPayment/>}
          {tab === 'receipt' && <SettingsReceipt/>}
          {tab === 'hardware' && <SettingsHardware/>}
          {tab === 'billing' && <SettingsBilling/>}
          {tab === 'about' && <SettingsAbout/>}
          {(tab === 'branches' || tab === 'data') && (
            <div className="card" style={{ padding: 24 }}>
              <SectionHeader title={t(SETTINGS_TABS.find(s => s.id === tab)?.labelKey || tab)} desc={t('settings.desc')}/>
              <EmptyState illustration={<EmptyZen/>} title={t('settings.comingSoon')} desc={lang === 'th' ? 'ส่วนนี้จะเปิดให้ใช้งานเมื่อตั้งค่าข้อมูลเสร็จ' : 'This section will be populated once configuration data is in place.'} action={<button className="btn btn-secondary btn-sm">{t('settings.configure')}</button>}/>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .settings-grid { grid-template-columns: 1fr !important; }
          .settings-aside { position: static !important; display: flex; gap: 4px; overflow: auto; padding-bottom: 8px; }
          .settings-aside button { white-space: nowrap; }
        }
      `}</style>
    </div>
  );
};

const SettingsAutomation = () => {
  const [auto, setAuto] = useAutomation();
  const keys = Object.keys(AUTOMATION_LABELS);
  // Group toggles by category
  const grouped = keys.reduce((acc, k) => {
    const g = AUTOMATION_LABELS[k].group;
    (acc[g] = acc[g] || []).push(k);
    return acc;
  }, {});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface) 70%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="t-h4" style={{ fontWeight: 600 }}>Automation control center</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              Every automated behavior here has a manual equivalent in the UI. Turn off any feature you'd rather control by hand.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { if (window.confirm('Reset all automation settings to defaults?')) resetAutomation(); }}>
            Reset to defaults
          </button>
        </div>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-muted)' }}>
            <div className="t-caption">{group}</div>
          </div>
          {items.map((key, i) => {
            const meta = AUTOMATION_LABELS[key];
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 16, padding: '16px 20px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-default)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{meta.label}</div>
                  <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{meta.desc}</div>
                </div>
                <div style={{ paddingTop: 2 }}>
                  <Toggle checked={!!auto[key]} onChange={(v) => setAuto({ [key]: v })}/>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{ padding: 20, background: 'var(--bg-muted)', fontSize: 12, color: 'var(--text-tertiary)' }}>
        Settings are saved per-device (localStorage). Each register/iPad can have its own automation profile.
      </div>
    </div>
  );
};

const SettingsProfile = () => {
  const { data: me, isLoading, refetch } = trpc.posAuth.me.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });
  const updateMyProfile = trpc.posAuth.updateMyProfile.useMutation({
    onSuccess: () => { refetch(); setMessage({ type: 'success', text: 'Profile updated.' }); },
    onError: (e) => setMessage({ type: 'error', text: e.message || 'Update failed' }),
  });

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', firstNameThai: '', lastNameThai: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (me) {
      setForm({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: me.phone || '',
        firstNameThai: me.firstNameThai || '',
        lastNameThai: me.lastNameThai || '',
      });
    }
  }, [me?.id]);

  const handleSave = () => {
    setMessage(null);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMessage({ type: 'error', text: 'First and last name are required' });
      return;
    }
    updateMyProfile.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      firstNameThai: form.firstNameThai.trim() || undefined,
      lastNameThai: form.lastNameThai.trim() || undefined,
    });
  };

  if (isLoading) {
    return <div className="card muted" style={{ padding: 40, textAlign: 'center' }}>Loading profile…</div>;
  }

  const displayName = `${form.firstName} ${form.lastName}`.trim() || 'Staff';

  return (
    <div className="card" style={{ padding: 28 }}>
      <SectionHeader title="Profile" desc="How others see you across the system"/>
      {message && (
        <div style={{
          marginBottom: 16, padding: '10px 14px',
          background: message.type === 'success' ? 'var(--matcha-50)' : 'rgba(239,68,68,0.08)',
          color: message.type === 'success' ? 'var(--matcha-700)' : 'var(--danger)',
          border: '1px solid ' + (message.type === 'success' ? 'var(--matcha-200)' : 'rgba(239,68,68,0.2)'),
          borderRadius: 'var(--r-default)', fontSize: 13,
        }}>{message.text}</div>
      )}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24 }}>
        <Avatar name={displayName} size={88}/>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{displayName}</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{me?.employeeCode} · {me?.role}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="First name" required>
          <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/>
        </Field>
        <Field label="Last name" required>
          <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/>
        </Field>
        <Field label="First name (Thai)">
          <input className="input" value={form.firstNameThai} onChange={(e) => setForm({ ...form, firstNameThai: e.target.value })} placeholder="ชื่อ"/>
        </Field>
        <Field label="Last name (Thai)">
          <input className="input" value={form.lastNameThai} onChange={(e) => setForm({ ...form, lastNameThai: e.target.value })} placeholder="นามสกุล"/>
        </Field>
        <Field label="Employee code" hint="Read-only">
          <input className="input" value={me?.employeeCode || ''} disabled/>
        </Field>
        <Field label="Role" hint="Read-only · changed by admin">
          <input className="input" value={me?.role || ''} disabled/>
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/>
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+66 81 234 5678"/>
        </Field>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-default)', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={() => me && setForm({
          firstName: me.firstName || '', lastName: me.lastName || '',
          email: me.email || '', phone: me.phone || '',
          firstNameThai: me.firstNameThai || '', lastNameThai: me.lastNameThai || '',
        })}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={updateMyProfile.isPending}>
          {updateMyProfile.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
};

const SettingsAppearance = ({ theme, setTheme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="card" style={{ padding: 28 }}>
      <SectionHeader title="Theme" desc="Choose how Hibi looks to you"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { k: 'light', l: 'Light', sub: 'Warm stone', bg: 'var(--stone-25)' },
          { k: 'dark', l: 'Dark', sub: 'Easy on eyes', bg: '#0e0e0c' },
          { k: 'system', l: 'System', sub: 'Match device', bg: 'linear-gradient(135deg, var(--stone-25) 50%, #0e0e0c 50%)' },
        ].map((t) => (
          <button key={t.k} onClick={() => t.k !== 'system' && setTheme(t.k)} style={{
            padding: 12,
            background: 'var(--bg-surface)',
            border: '1.5px solid ' + ((t.k === theme || (t.k === 'system' && theme === 'system')) ? 'var(--matcha-600)' : 'var(--border-default)'),
            borderRadius: 'var(--r-md)',
            textAlign: 'left',
          }}>
            <div style={{ height: 80, background: t.bg, borderRadius: 8, marginBottom: 10, border: '1px solid var(--border-default)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, width: 24, height: 4, borderRadius: 2, background: t.k === 'dark' ? '#444' : '#ddd' }}/>
              <div style={{ position: 'absolute', top: 16, left: 8, width: 40, height: 3, borderRadius: 2, background: t.k === 'dark' ? '#333' : '#ccc' }}/>
            </div>
            <div style={{ fontWeight: 500 }}>{t.l}</div>
            <div className="muted" style={{ fontSize: 12 }}>{t.sub}</div>
          </button>
        ))}
      </div>
    </div>
    <div className="card" style={{ padding: 28 }}>
      <SectionHeader title="Personalization"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SettingRow label="Accent color" desc="Subtle tint throughout">
          <div style={{ display: 'flex', gap: 6 }}>
            {['#16a34a', '#0284c7', '#a16207', '#9333ea', '#dc2626'].map((c, i) => (
              <button key={c} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: '2px solid ' + (i === 0 ? 'white' : 'transparent'), boxShadow: i === 0 ? `0 0 0 2px ${c}` : 'none' }}/>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Font size" desc="Base text size"><Select value="Default" onChange={() => {}} options={['Compact', 'Default', 'Comfortable', 'Large']}/></SettingRow>
        <SettingRow label="Density" desc="UI compactness"><Select value="Comfortable" onChange={() => {}} options={['Compact', 'Comfortable']}/></SettingRow>
        <SettingRow label="Reduce motion" desc="Disable animations"><Toggle checked={false} onChange={() => {}}/></SettingRow>
        <SettingRow label="High contrast" desc="Stronger borders & text"><Toggle checked={false} onChange={() => {}}/></SettingRow>
        <SettingRow label="Sound feedback" desc="Soft tap sounds"><Toggle checked={false} onChange={() => {}}/></SettingRow>
      </div>
    </div>
  </div>
);

const SettingsNotifications = () => (
  <div className="card" style={{ padding: 28 }}>
    <SectionHeader title="Notifications" desc="Choose what you hear about and how"/>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
          <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</th>
          {['Email', 'Push', 'In-app', 'Sound'].map((c) => (
            <th key={c} style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 500, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { l: 'New orders', t: [true, true, true, true] },
          { l: 'Low stock alerts', t: [true, true, true, false] },
          { l: 'SOP updates', t: [true, false, true, false] },
          { l: 'PO approvals', t: [true, true, true, false] },
          { l: 'Staff activity', t: [false, false, true, false] },
          { l: 'Daily summary', t: [true, false, false, false] },
          { l: 'Mentions', t: [true, true, true, true] },
        ].map((row) => (
          <tr key={row.l} style={{ borderBottom: '1px solid var(--border-default)' }}>
            <td style={{ padding: '12px 0' }}>{row.l}</td>
            {row.t.map((v, i) => (
              <td key={i} style={{ padding: '12px', textAlign: 'center' }}><Checkbox checked={v} onChange={() => {}}/></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ marginTop: 24 }}>
      <SectionHeader title="Quiet hours"/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Enabled"><Toggle checked={true} onChange={() => {}} label="Mute notifications"/></Field>
        <Field label="From"><input className="input" type="time" defaultValue="22:00"/></Field>
        <Field label="To"><input className="input" type="time" defaultValue="07:00"/></Field>
      </div>
    </div>
  </div>
);

const SettingsSecurity = () => {
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pinForm, setPinForm] = useState({ current: '', next: '' });
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pinMsg, setPinMsg] = useState(null);

  const changePassword = trpc.posAuth.changePassword.useMutation({
    onSuccess: () => { setPwdMsg({ type: 'success', text: 'Password updated.' }); setPwdForm({ current: '', next: '', confirm: '' }); },
    onError: (e) => setPwdMsg({ type: 'error', text: e.message || 'Failed to update password' }),
  });
  const changePin = trpc.posAuth.changePin.useMutation({
    onSuccess: () => { setPinMsg({ type: 'success', text: 'PIN updated.' }); setPinForm({ current: '', next: '' }); },
    onError: (e) => setPinMsg({ type: 'error', text: e.message || 'Failed to update PIN' }),
  });

  const handlePwd = () => {
    setPwdMsg(null);
    if (pwdForm.next.length < 6) { setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return; }
    if (pwdForm.next !== pwdForm.confirm) { setPwdMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    changePassword.mutate({ currentPassword: pwdForm.current, newPassword: pwdForm.next });
  };
  const handlePin = () => {
    setPinMsg(null);
    if (pinForm.next.length !== 4 || !/^\d{4}$/.test(pinForm.next)) { setPinMsg({ type: 'error', text: 'PIN must be exactly 4 digits' }); return; }
    if (pinForm.current.length !== 4) { setPinMsg({ type: 'error', text: 'Current PIN must be 4 digits' }); return; }
    changePin.mutate({ currentPin: pinForm.current, newPin: pinForm.next });
  };

  const Msg = ({ msg }) => msg ? (
    <div style={{
      marginBottom: 12, padding: '10px 14px',
      background: msg.type === 'success' ? 'var(--matcha-50)' : 'rgba(239,68,68,0.08)',
      color: msg.type === 'success' ? 'var(--matcha-700)' : 'var(--danger)',
      border: '1px solid ' + (msg.type === 'success' ? 'var(--matcha-200)' : 'rgba(239,68,68,0.2)'),
      borderRadius: 'var(--r-default)', fontSize: 13,
    }}>{msg.text}</div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 28 }}>
        <SectionHeader title="Password" desc="Update the password used for full system access"/>
        <Msg msg={pwdMsg}/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Current password" required>
            <input className="input" type="password" placeholder="••••••••" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}/>
          </Field>
          <div/>
          <Field label="New password" required hint="At least 6 characters">
            <input className="input" type="password" value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}/>
          </Field>
          <Field label="Confirm new password" required>
            <input className="input" type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}/>
          </Field>
        </div>
        <button className="btn btn-primary btn-sm" onClick={handlePwd} disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Updating…' : 'Update password'}
        </button>
      </div>
      <div className="card" style={{ padding: 28 }}>
        <SectionHeader title="PIN" desc="4-digit PIN for POS quick access"/>
        <Msg msg={pinMsg}/>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <Field label="Current PIN">
            <input className="input" type="password" maxLength={4} inputMode="numeric" value={pinForm.current} onChange={(e) => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, '') })} placeholder="••••" style={{ width: 100, textAlign: 'center', fontSize: 18, letterSpacing: 4 }}/>
          </Field>
          <Field label="New PIN">
            <input className="input" type="password" maxLength={4} inputMode="numeric" value={pinForm.next} onChange={(e) => setPinForm({ ...pinForm, next: e.target.value.replace(/\D/g, '') })} placeholder="••••" style={{ width: 100, textAlign: 'center', fontSize: 18, letterSpacing: 4 }}/>
          </Field>
          <button className="btn btn-primary btn-sm" onClick={handlePin} disabled={changePin.isPending}>
            {changePin.isPending ? 'Updating…' : 'Update PIN'}
          </button>
        </div>
      </div>
    <div className="card" style={{ padding: 28 }}>
      <SectionHeader title="Two-factor authentication" action={<span className="pill pill-warning">Not enabled</span>}/>
      <div className="muted" style={{ marginBottom: 14 }}>Add an extra layer of security to your account.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[{ l: 'Authenticator app', sub: 'Most secure' }, { l: 'SMS', sub: 'To registered phone' }, { l: 'Email', sub: 'To primary email' }].map((m) => (
          <div key={m.l} className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 500 }}>{m.l}</div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{m.sub}</div>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Set up</button>
          </div>
        ))}
      </div>
    </div>
    <div className="card" style={{ padding: 28 }}>
      <SectionHeader title="Active sessions"/>
      {[
        { device: 'MacBook Pro', loc: 'Bangkok, TH', last: 'Active now', current: true },
        { device: 'iPad (POS · Ladprao)', loc: 'Bangkok, TH', last: '2h ago' },
        { device: 'iPhone 15', loc: 'Bangkok, TH', last: '1d ago' },
      ].map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}><IconPhone size={20}/></span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
              {s.device}
              {s.current && <span className="pill pill-matcha" style={{ height: 18, fontSize: 10 }}>This device</span>}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>{s.loc} · {s.last}</div>
          </div>
          {!s.current && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Revoke</button>}
        </div>
      ))}
    </div>
    </div>
  );
};

const SettingsLanguage = () => (
  <div className="card" style={{ padding: 28 }}>
    <SectionHeader title="Language & Region"/>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Field label="UI Language"><Select value="English" onChange={() => {}} options={['English', 'ไทย', '日本語', '简体中文']}/></Field>
      <Field label="Currency"><Select value="THB · Thai Baht" onChange={() => {}} options={['THB · Thai Baht', 'JPY · Japanese Yen', 'USD · US Dollar']}/></Field>
      <Field label="Date format"><Select value="6 Mar 2026" onChange={() => {}} options={['6 Mar 2026', '03/06/2026', '2026-03-06']}/></Field>
      <Field label="Time format"><Select value="24-hour" onChange={() => {}} options={['24-hour', '12-hour']}/></Field>
      <Field label="Number format"><Select value="1,234.56" onChange={() => {}} options={['1,234.56', '1.234,56', '1 234.56']}/></Field>
      <Field label="First day of week"><Select value="Monday" onChange={() => {}} options={['Monday', 'Sunday']}/></Field>
    </div>
  </div>
);

// Integration configs — URLs for each service's real dashboard/settings
const INTEGRATION_LINKS = {
  'Omise':               { configUrl: 'https://dashboard.omise.co/settings',         connectUrl: 'https://dashboard.omise.co/register',           docs: 'https://docs.opn.ooo/getting-started' },
  '2C2P':               { configUrl: 'https://developer.2c2p.com/dashboard',          connectUrl: 'https://developer.2c2p.com/register',            docs: 'https://developer.2c2p.com/docs' },
  'PromptPay':          { configUrl: '/backoffice/settings?tab=payment',              connectUrl: '/backoffice/settings?tab=payment',               docs: 'https://www.bot.or.th/promptpay' },
  'LINE Pay':           { configUrl: 'https://pay.line.me/portal/th/main',            connectUrl: 'https://pay.line.me/portal/th/auth/register/intro', docs: 'https://pay.line.me/developers/apis/onlineApis' },
  'TrueMoney':          { configUrl: 'https://www.truemoneygateway.com/portal',       connectUrl: 'https://www.truemoneygateway.com/portal/register', docs: 'https://www.truemoneygateway.com/docs' },
  'QuickBooks':         { configUrl: 'https://app.qbo.intuit.com',                   connectUrl: 'https://quickbooks.intuit.com/global/pricing/',   docs: 'https://developer.intuit.com/app/developer/qbo/docs' },
  'Xero':               { configUrl: 'https://go.xero.com/Dashboard/',               connectUrl: 'https://www.xero.com/signup/',                    docs: 'https://developer.xero.com/documentation/' },
  'FlowAccount':        { configUrl: 'https://app.flowaccount.com',                  connectUrl: 'https://flowaccount.com/signup',                  docs: 'https://open-api.flowaccount.com' },
  'LINE Official Account': { configUrl: 'https://manager.line.biz',                  connectUrl: 'https://manager.line.biz/signup',                 docs: 'https://developers.line.biz/en/docs/messaging-api/' },
  'Mailchimp':          { configUrl: 'https://login.mailchimp.com',                  connectUrl: 'https://login.mailchimp.com/signup/',             docs: 'https://mailchimp.com/developer/' },
  'LINE MAN':           { configUrl: 'https://merchant.lineman.me',                  connectUrl: 'https://merchant.lineman.me/register',            docs: 'https://merchant.lineman.me/help' },
  'Grab':               { configUrl: 'https://merchant.grab.com/portal',             connectUrl: 'https://merchant.grab.com/portal/register',       docs: 'https://developer.grab.com/docs/grabfood/' },
  'Foodpanda':          { configUrl: 'https://partner.foodpanda.co.th',              connectUrl: 'https://www.foodpanda.co.th/restaurant/apply',    docs: 'https://partner.foodpanda.co.th/help' },
  'Robinhood':          { configUrl: 'https://robinhood.in.th/merchant',             connectUrl: 'https://robinhood.in.th/merchant/register',       docs: 'https://robinhood.in.th/help' },
};

const SettingsIntegrations = () => {
  const [selected, setSelected] = useState(null); // { name, on, sub }

  const groups = [
    { l: 'Payments', items: [
      { n: 'Omise', sub: 'Card processing · 2.95% fee', on: true },
      { n: '2C2P', sub: 'Card processing · 2.85% fee', on: false },
      { n: 'PromptPay', sub: 'QR payments · 0% fee', on: true },
      { n: 'LINE Pay', sub: 'LINE ecosystem', on: false },
      { n: 'TrueMoney', sub: 'Wallet payments · 1.5% fee', on: false },
    ]},
    { l: 'Accounting', items: [
      { n: 'QuickBooks', sub: 'Sync sales and inventory', on: false },
      { n: 'Xero', sub: 'Cloud accounting', on: true },
      { n: 'FlowAccount', sub: 'Thai cloud accounting', on: false },
    ]},
    { l: 'Marketing', items: [
      { n: 'LINE Official Account', sub: 'Broadcast & customer chat', on: true },
      { n: 'Mailchimp', sub: 'Email marketing', on: false },
    ]},
    { l: 'Delivery', items: [
      { n: 'LINE MAN', sub: 'Food delivery', on: true },
      { n: 'Grab', sub: 'GrabFood', on: true },
      { n: 'Foodpanda', sub: 'Pandapro', on: false },
      { n: 'Robinhood', sub: '0% commission', on: false },
    ]},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {groups.map((g) => (
        <div key={g.l}>
          <div className="t-caption" style={{ marginBottom: 10 }}>{g.l}</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {g.items.map((it, i) => (
              <div key={it.n} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `oklch(72% 0.08 ${(i + 1) * 60})`, color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{it.n[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{it.n}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{it.sub}</div>
                </div>
                {it.on && <span className="pill pill-matcha"><span className="dot"/> Connected</span>}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelected(it)}
                >
                  {it.on ? 'Configure' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Integration Modal */}
      {selected && (() => {
        const links = INTEGRATION_LINKS[selected.n] || {};
        const targetUrl = selected.on ? links.configUrl : links.connectUrl;
        const isInternal = targetUrl?.startsWith('/');
        return (
          <Modal open onClose={() => setSelected(null)} title={selected.n} width={480}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--r-default)', background: selected.on ? 'var(--matcha-50,#f0fdf4)' : 'var(--bg-muted)', border: '1px solid ' + (selected.on ? 'var(--matcha-200,#bbf7d0)' : 'var(--border-default)') }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: selected.on ? 'var(--matcha-100,#dcfce7)' : 'var(--bg-subtle)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
                  {selected.on ? '✅' : '🔌'}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selected.n}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{selected.sub}</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: selected.on ? 'var(--matcha-700)' : 'var(--text-tertiary)', fontWeight: 500 }}>
                    {selected.on ? '● Connected' : '○ Not connected'}
                  </div>
                </div>
              </div>

              {/* Action description */}
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selected.on
                  ? `จัดการการตั้งค่าและการเชื่อมต่อของ ${selected.n} ได้ที่แดชบอร์ดของ ${selected.n} โดยตรง`
                  : `เชื่อมต่อ ${selected.n} กับระบบ Hibi POS เพื่อเริ่มใช้งาน ${selected.sub}`
                }
              </div>

              {/* Main action button */}
              <a
                href={targetUrl}
                target={isInternal ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '12px 0', fontSize: 15, fontWeight: 600 }}
              >
                {selected.on ? `⚙️ เปิด ${selected.n} Dashboard` : `🔗 เชื่อมต่อ ${selected.n}`}
              </a>

              {/* PromptPay special case — goes to internal settings */}
              {selected.n === 'PromptPay' && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  PromptPay ตั้งค่าได้ในแท็บ <b>Payment</b> ของ Settings นี้
                </div>
              )}

              {/* Secondary: docs link */}
              {links.docs && (
                <a
                  href={links.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '10px 0' }}
                >
                  📖 ดู Documentation
                </a>
              )}

              {/* Disconnect option if connected */}
              {selected.on && (
                <button
                  className="btn btn-ghost"
                  style={{ color: 'var(--danger)', fontSize: 13 }}
                  onClick={() => {
                    if (confirm(`ต้องการยกเลิกการเชื่อมต่อ ${selected.n}?`)) {
                      setSelected(null);
                    }
                  }}
                >
                  ยกเลิกการเชื่อมต่อ
                </button>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

const PRINTER_TYPES = [
  { value: 'order_slip', label: 'Order Slip' },
  { value: 'label', label: 'Label' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'receipt', label: 'Receipt' },
];
const CONN_TYPES = [
  { value: 'network', label: 'Network (TCP/IP)' },
  { value: 'usb', label: 'USB' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'browser', label: 'Browser Print' },
];

const SettingsHardware = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId || 1;
  const printersQ = trpc.branchSettings.listPrinters.useQuery({ branchId });
  const upsertPrinter = trpc.branchSettings.upsertPrinter.useMutation({ onSuccess: () => printersQ.refetch() });
  const deletePrinter = trpc.branchSettings.deletePrinter.useMutation({ onSuccess: () => printersQ.refetch() });
  const testPrint = trpc.printing.testPrint.useMutation();
  const checkStatus = trpc.printing.checkStatus.useQuery;

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ printerName: '', printerType: 'receipt', connection: 'network', ipAddress: '', port: 9100, paperWidth: 80, isDefault: false });
  const [testResult, setTestResult] = useState(null);

  const printers = printersQ.data || [];

  const openAdd = () => { setEditId(null); setForm({ printerName: '', printerType: 'receipt', connection: 'network', ipAddress: '', port: 9100, paperWidth: 80, isDefault: false }); setShowForm(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ printerName: p.printerName, printerType: p.printerType, connection: p.connection || 'network', ipAddress: p.ipAddress || '', port: p.port || 9100, paperWidth: p.paperWidth || 80, isDefault: !!p.isDefault }); setShowForm(true); };
  const handleSave = async () => {
    await upsertPrinter.mutateAsync({ ...form, branchId, port: Number(form.port), paperWidth: Number(form.paperWidth), ...(editId ? { id: editId } : {}) });
    setShowForm(false);
  };
  const handleDelete = async (id) => { if (confirm('ลบเครื่องพิมพ์นี้?')) await deletePrinter.mutateAsync({ id }); };
  const handleTest = async (id) => {
    setTestResult(null);
    try {
      const r = await testPrint.mutateAsync({ printerId: id });
      setTestResult({ id, ...r });
    } catch (e) { setTestResult({ id, success: false, message: e.message }); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Network Printers" desc="จัดการเครื่องพิมพ์ที่เชื่อมต่อผ่าน LAN" action={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Printer</button>}/>
        {printers.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center' }}>ยังไม่มีเครื่องพิมพ์ — กด Add Printer เพื่อเพิ่ม</div>}
        {printers.map(p => (
          <div key={p.id} className="card" style={{ padding: 16, marginTop: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: p.isActive ? 'var(--matcha-50)' : 'var(--bg-muted)', color: p.isActive ? 'var(--matcha-700)' : 'var(--text-tertiary)', display: 'grid', placeItems: 'center' }}><IconPrint size={20}/></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>{p.printerName}</span>
                <span className="pill" style={{ fontSize: 11 }}>{p.printerType}</span>
                {p.isDefault && <span className="pill pill-matcha" style={{ fontSize: 11 }}>Default</span>}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{p.connection === 'network' ? `${p.ipAddress}:${p.port}` : p.connection} · {p.paperWidth}mm</div>
            </div>
            {testResult?.id === p.id && <span style={{ fontSize: 12, color: testResult.success ? 'var(--matcha-700)' : 'var(--error)' }}>{testResult.success ? '✓ OK' : '✗ ' + testResult.message}</span>}
            <button className="btn btn-ghost btn-sm" onClick={() => handleTest(p.id)} disabled={testPrint.isPending}>Test</button>
            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete(p.id)}>✗</button>
          </div>
        ))}
      </div>

      {/* Static hardware (non-configurable) */}
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Other Hardware" desc="อุปกรณ์อื่นๆ"/>
        {[
          { l: 'Cash Drawer', sub: 'เปิดผ่านเครื่องพิมพ์ Receipt', icon: IconBox, on: true },
          { l: 'Barcode Scanner', sub: 'USB HID — plug & play', icon: IconScanner, on: true },
          { l: 'Card Reader (EDC)', sub: 'เชื่อมต่อแยก', icon: IconWallet, on: false },
        ].map(h => {
          const I = h.icon;
          return (
            <div key={h.l} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: h.on ? 'var(--matcha-50)' : 'var(--bg-muted)', color: h.on ? 'var(--matcha-700)' : 'var(--text-tertiary)', display: 'grid', placeItems: 'center' }}><I size={16}/></div>
              <div style={{ flex: 1 }}><span style={{ fontWeight: 500 }}>{h.l}</span><div className="muted" style={{ fontSize: 12 }}>{h.sub}</div></div>
              {h.on ? <span className="pill pill-matcha" style={{ fontSize: 11 }}><span className="dot"/> OK</span> : <span className="pill" style={{ fontSize: 11 }}>N/A</span>}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Printer Drawer */}
      {showForm && (
        <Drawer open onClose={() => setShowForm(false)} title={editId ? 'Edit Printer' : 'Add Printer'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20 }}>
            <Field label="Printer Name"><input className="input" value={form.printerName} onChange={e => setForm(f => ({...f, printerName: e.target.value}))} placeholder="e.g. Kitchen Printer"/></Field>
            <Field label="Type">
              <select className="input" value={form.printerType} onChange={e => setForm(f => ({...f, printerType: e.target.value}))}>
                {PRINTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Connection">
              <select className="input" value={form.connection} onChange={e => setForm(f => ({...f, connection: e.target.value}))}>
                {CONN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {form.connection === 'network' && (
              <>
                <Field label="IP Address"><input className="input" value={form.ipAddress} onChange={e => setForm(f => ({...f, ipAddress: e.target.value}))} placeholder="192.168.1.100"/></Field>
                <Field label="Port"><input className="input" type="number" value={form.port} onChange={e => setForm(f => ({...f, port: e.target.value}))}/></Field>
              </>
            )}
            <Field label="Paper Width (mm)">
              <select className="input" value={form.paperWidth} onChange={e => setForm(f => ({...f, paperWidth: e.target.value}))}>
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
              </select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({...f, isDefault: e.target.checked}))}/>
              <span>Set as default for this type</span>
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={upsertPrinter.isPending || !form.printerName}>{editId ? 'Save' : 'Add'}</button>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

const SettingsBilling = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div className="card" style={{ padding: 28, background: 'linear-gradient(135deg, var(--matcha-50), var(--bg-surface) 60%)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="t-caption" style={{ color: 'var(--matcha-700)' }}>Current plan</div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>Franchise Pro</div>
          <div className="muted" style={{ marginTop: 4 }}>4 branches · unlimited staff · 24/7 support</div>
          <div style={{ marginTop: 12, fontSize: 13 }}>Next billing: <b>Apr 1, 2026</b></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tabular" style={{ fontSize: 36, fontWeight: 600 }}>฿9,800<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>/month</span></div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Manage plan</button>
        </div>
      </div>
    </div>
    <div className="card" style={{ padding: 24 }}>
      <SectionHeader title="Usage"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <UsageBar label="Branches" used={4} total={10}/>
        <UsageBar label="Staff" used={28} total={100}/>
        <UsageBar label="Storage" used={3.4} total={50} unit="GB"/>
      </div>
    </div>
    <div className="card" style={{ padding: 24 }}>
      <SectionHeader title="Invoices" action={<button className="btn btn-secondary btn-sm">Download all</button>}/>
      {['Mar 2026', 'Feb 2026', 'Jan 2026', 'Dec 2025'].map((m, i) => (
        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-default)', fontSize: 14 }}>
          <span style={{ flex: 1 }}>{m}</span>
          <span className="tabular">฿9,800</span>
          <span className="pill pill-matcha"><span className="dot"/> Paid</span>
          <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }}><IconExport size={14}/></button>
        </div>
      ))}
    </div>
  </div>
);

const UsageBar = ({ label, used, total, unit }) => {
  const pct = (used / total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
        <span>{label}</span>
        <span className="tabular muted">{used}{unit && ' '+unit} / {total}{unit && ' '+unit}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: 'var(--matcha-500)' }}/>
      </div>
    </div>
  );
};

const SettingsAbout = () => (
  <div className="card" style={{ padding: 28 }}>
    <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px 0' }}>
      <div style={{ display: 'inline-grid', placeItems: 'center', marginBottom: 16, color: 'var(--matcha-600)' }}>
        <IconBrand size={64}/>
      </div>
      <Logo size="lg" subtitle={true}/>
      <div className="muted" style={{ marginTop: 16 }}>Version 2026.5.1 · Everyday matcha, every cup</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
      {[
        { l: 'Changelog', sub: 'See what\'s new' },
        { l: 'Status page', sub: 'Service health' },
        { l: 'Support', sub: 'Get help' },
        { l: 'Privacy Policy', sub: 'How we handle data' },
        { l: 'Terms of Service', sub: 'Usage rules' },
        { l: 'Credits', sub: 'Open source acknowledgments' },
      ].map((it) => (
        <a key={it.l} href="#" className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{it.l}</div>
            <div className="muted" style={{ fontSize: 12 }}>{it.sub}</div>
          </span>
          <IconChevRight size={16} style={{ color: 'var(--text-tertiary)' }}/>
        </a>
      ))}
    </div>
  </div>
);

const SettingRow = ({ label, desc, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
      {desc && <div className="muted" style={{ fontSize: 12 }}>{desc}</div>}
    </div>
    {children}
  </div>
);


// ----- Payment & QR Settings -----
const SettingsPayment = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const { data: settings, isLoading, refetch } = trpc.branchSettings.getPaymentSettings.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId }
  );
  const saveMut = trpc.branchSettings.upsertPaymentSettings.useMutation({ onSuccess: () => refetch() });

  const [promptpayId, setPromptpayId] = useState('');
  const [promptpayName, setPromptpayName] = useState('');
  const [promptpayType, setPromptpayType] = useState('phone');

  useEffect(() => {
    if (settings) {
      setPromptpayId(settings.promptpayId || '');
      setPromptpayName(settings.promptpayName || '');
      setPromptpayType(settings.promptpayType || 'phone');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!branchId) { alert('No branch selected'); return; }
    try {
      await saveMut.mutateAsync({ branchId, promptpayId, promptpayName, promptpayType });
      alert('Saved!');
    } catch (e) {
      alert('Failed: ' + (e.message || 'Unknown'));
    }
  };

  if (isLoading) return <div className="muted" style={{ padding: 20 }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="PromptPay QR" desc="Configure PromptPay for this branch to generate real QR codes at checkout"/>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="PromptPay Type">
            <Select value={promptpayType} onChange={setPromptpayType} options={[
              { value: 'phone', label: 'Phone Number' },
              { value: 'national_id', label: 'National ID (บัตรประชาชน)' },
              { value: 'tax_id', label: 'Tax ID (เลขผู้เสียภาษี)' },
            ]}/>
          </Field>
          <Field label="PromptPay ID" required>
            <input
              className="input"
              value={promptpayId}
              onChange={(e) => setPromptpayId(e.target.value)}
              placeholder={promptpayType === 'phone' ? '08x-xxx-xxxx' : '1-xxxx-xxxxx-xx-x'}
            />
          </Field>
          <Field label="Display Name (shown on receipt)">
            <input
              className="input"
              value={promptpayName}
              onChange={(e) => setPromptpayName(e.target.value)}
              placeholder="Hibi Matcha Co., Ltd."
            />
          </Field>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save PromptPay Settings'}
          </button>
        </div>
      </div>
      <SectionHeader title="Other Payment Settings" desc="Additional payment configuration"/>
      <div className="card" style={{ padding: 24 }}>
        <SettingRow label="Auto-generate QR on checkout" desc="When QR payment is selected, auto-generate PromptPay QR">
          <Toggle checked={true} onChange={() => {}}/>
        </SettingRow>
        <SettingRow label="Show amount in QR" desc="Embed amount in QR code (customer pays exact amount)">
          <Toggle checked={true} onChange={() => {}}/>
        </SettingRow>
        <SettingRow label="QR expiry time" desc="How long the QR code is valid">
          <Select value="15" onChange={() => {}} options={['5', '10', '15', '30', '60']}/>
        </SettingRow>
      </div>
    </div>
  );
};

// ----- Receipt & Print Settings -----
const SettingsReceipt = () => {
  const { branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;
  const { data: settings, isLoading, refetch } = trpc.branchSettings.getPaymentSettings.useQuery(
    { branchId: branchId ?? 0 },
    { enabled: !!branchId }
  );
  const saveMut = trpc.branchSettings.upsertPaymentSettings.useMutation({ onSuccess: () => refetch() });

  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [paperWidth, setPaperWidth] = useState('80');

  useEffect(() => {
    if (settings) {
      setReceiptHeader(settings.receiptHeader || '');
      setReceiptFooter(settings.receiptFooter || '');
      setShowLogo(settings.showLogo !== false);
      setShowQr(settings.showQr !== false);
      setPaperWidth(settings.paperWidth || '80');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!branchId) { alert('No branch selected'); return; }
    try {
      await saveMut.mutateAsync({ branchId, receiptHeader, receiptFooter, showLogo, showQr, paperWidth });
      alert('Saved!');
    } catch (e) {
      alert('Failed: ' + (e.message || 'Unknown'));
    }
  };

  if (isLoading) return <div className="muted" style={{ padding: 20 }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader title="Receipt Layout" desc="Customize what appears on printed receipts"/>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Field label="Paper Width">
            <Select value={paperWidth} onChange={setPaperWidth} options={[
              { value: '58', label: '58mm (Sunmi V3 built-in)' },
              { value: '80', label: '80mm (Standard thermal)' },
            ]}/>
          </Field>
          <Field label="Receipt Header (store name / address)">
            <textarea
              className="input"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="Hibi Matcha&#10;107 Ladprao Rd, Bangkok 10230"
              rows={3}
            />
          </Field>
          <Field label="Receipt Footer (thank you message)">
            <textarea
              className="input"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Thank you! ขอบคุณค่ะ&#10;Line: @hibimatcha"
              rows={3}
            />
          </Field>
          <SettingRow label="Show logo on receipt" desc="Print store logo at the top">
            <Toggle checked={showLogo} onChange={setShowLogo}/>
          </SettingRow>
          <SettingRow label="Show QR on receipt" desc="Print PromptPay QR at the bottom for tips">
            <Toggle checked={showQr} onChange={setShowQr}/>
          </SettingRow>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save Receipt Settings'}
          </button>
        </div>
      </div>
      <SectionHeader title="Auto-Print Rules" desc="Control when receipts print automatically"/>
      <div className="card" style={{ padding: 24 }}>
        <SettingRow label="Print order slip on confirm" desc="Automatically print when order is confirmed">
          <Toggle checked={true} onChange={() => {}}/>
        </SettingRow>
        <SettingRow label="Print kitchen ticket" desc="Send to kitchen printer when order is confirmed">
          <Toggle checked={true} onChange={() => {}}/>
        </SettingRow>
        <SettingRow label="Print receipt on payment" desc="Print full receipt after payment is completed">
          <Toggle checked={true} onChange={() => {}}/>
        </SettingRow>
        <SettingRow label="Print sticker labels" desc="Print item labels for takeaway/delivery orders">
          <Toggle checked={false} onChange={() => {}}/>
        </SettingRow>
      </div>
      <SectionHeader title="Print Preview"/>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: paperWidth === '58' ? 200 : 280, background: 'white', border: '1px solid var(--border-default)', borderRadius: 4, padding: '16px 12px', textAlign: 'left', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
          <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 8 }}>
            {receiptHeader || 'Hibi Matcha'}
          </div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }}/>
          <div>Order #HM-001</div>
          <div>Date: {new Date().toLocaleDateString()}</div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>1× Matcha Latte</span><span>฿85</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>1× Hojicha</span><span>฿75</span></div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total</span><span>฿160</span></div>
          <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }}/>
          <div style={{ textAlign: 'center', fontSize: 10, color: '#666' }}>
            {receiptFooter || 'Thank you! ขอบคุณค่ะ'}
          </div>
        </div>
      </div>
    </div>
  );
};
