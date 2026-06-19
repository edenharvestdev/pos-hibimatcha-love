// ============================================
// Page: auth — wired to backend
// ============================================

import React, { useState, useEffect, useRef } from "react";
import {
  IconCheck, IconChevLeft, IconChevRight, IconClock, IconEye, IconEyeOff,
  IconLeaf, IconUsers,
} from "@/icons";
import { useApp, Field, Toggle, Checkbox, Placeholder } from "@/components";
import { Logo } from "@/components/Shell";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { setSession, clearSession } from "@/lib/authStore";

export const PageLogin = () => {
  const { navigate, setStaff, setBranch } = useApp();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("system");
  const [pin, setPin] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [awaitingTotp, setAwaitingTotp] = useState(false);

  const { data: bootstrapCheck } = trpc.posAuth.needsBootstrap.useQuery(undefined, { staleTime: 5000 });
  const loginEmployee = trpc.posAuth.loginWithEmployeeCode.useMutation();
  const loginPin = trpc.posAuth.loginWithPin.useMutation();
  const { data: publicBranches } = trpc.branches.listPublic.useQuery(undefined, { staleTime: 5000, refetchOnWindowFocus: true });

  // Redirect to bootstrap when DB is empty
  useEffect(() => {
    if (bootstrapCheck?.needsBootstrap) navigate("/setup");
  }, [bootstrapCheck?.needsBootstrap]);

  const handleEmployeeLogin = async () => {
    if (!empCode || !pwd) { setError("Please enter your employee code and password"); return; }
    if (awaitingTotp && totpCode.length !== 6) { setError("Enter 6-digit authenticator code"); return; }
    setError("");
    try {
      const result = await loginEmployee.mutateAsync({
        employeeCode: empCode,
        password: pwd,
        totpCode: awaitingTotp ? totpCode : undefined,
      });
      if (result.requiresTotp) {
        setAwaitingTotp(true);
        setError("Enter the 6-digit code from your authenticator app");
        return;
      }
      setSession({
        id: result.staff.id,
        employeeCode: result.staff.employeeCode,
        firstName: result.staff.firstName ?? null,
        lastName: result.staff.lastName ?? null,
        role: result.staff.role,
        primaryBranchId: result.staff.primaryBranchId ?? null,
        currentBranchId: result.staff.primaryBranchId ?? null,
        token: result.token,
        mustChangePassword: result.mustChangePassword ?? false,
      });
      setStaff?.(result.staff);
      queryClient.invalidateQueries();
      if (result.mustChangePassword) {
        navigate("/settings/security?force=1");
        return;
      }
      // Admin/super_admin → branch select first, staff → POS terminal
      if (result.staff.role === "super_admin" || result.staff.role === "staff_admin") {
        navigate("/branch-select");
      } else if (result.staff.role === "staff") {
        navigate("/pos/terminal");
      } else {
        navigate("/backoffice");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials");
    }
  };

  const handlePinLogin = async () => {
    if (pin.length !== 4) return;
    if (!selectedBranchId && publicBranches?.length > 0) {
      setSelectedBranchId(publicBranches[0].id);
    }
    const branchId = selectedBranchId ?? publicBranches?.[0]?.id;
    if (!branchId) { setError("Please select a branch"); return; }
    setError("");
    try {
      const result = await loginPin.mutateAsync({ branchId, pin });
      setSession({
        id: result.staff.id,
        employeeCode: result.staff.employeeCode,
        firstName: result.staff.firstName ?? null,
        lastName: result.staff.lastName ?? null,
        role: result.staff.role,
        primaryBranchId: result.staff.primaryBranchId ?? null,
        currentBranchId: branchId,
        token: result.token,
        mustChangePin: result.mustChangePin ?? false,
      });
      setStaff?.(result.staff);
      // Sync App Context branch so POS pages read the correct branchId immediately
      const selectedBranch = publicBranches?.find(b => b.id === branchId);
      if (selectedBranch) {
        setBranch({
          id: selectedBranch.id,
          name: selectedBranch.name,
          sub: selectedBranch.province || 'Bangkok',
          type: selectedBranch.branchType === 'hq' ? 'HQ' : selectedBranch.branchType === 'franchise' ? 'Franchise' : 'Branch',
          branchCode: selectedBranch.branchCode,
        });
      } else {
        setBranch({ id: branchId, name: 'Branch', sub: '', type: 'Branch' });
      }
      // Invalidate all cached queries for the new branch
      queryClient.invalidateQueries();
      if (result.mustChangePin) {
        navigate("/settings/security?forcePin=1");
        return;
      }
      navigate("/pos/terminal");
    } catch (err) {
      setError(err.message || "Invalid PIN");
      setPin("");
    }
  };

  useEffect(() => {
    if (pin.length === 4) handlePinLogin();
  }, [pin]);

  const isLoading = loginEmployee.isPending || loginPin.isPending;

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", position: "relative" }} className="login-grid">
      {/* Left hero */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: "var(--matcha-950)", color: "white",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "40px 56px",
      }} className="login-hero">
        <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
          <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, var(--matcha-500), transparent 60%)", filter: "blur(60px)", animation: "drift 16s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "70%", height: "70%", background: "radial-gradient(circle, var(--matcha-700), transparent 60%)", filter: "blur(60px)", animation: "drift 22s ease-in-out infinite reverse" }} />
        </div>
        {[{ l: 12, t: 18, s: 36, d: "0s", op: 0.18 }, { l: 80, t: 28, s: 28, d: "3s", op: 0.14 }, { l: 22, t: 76, s: 32, d: "6s", op: 0.16 }].map((leaf, i) => (
          <div key={i} style={{ position: "absolute", left: leaf.l + "%", top: leaf.t + "%", color: "white", opacity: leaf.op, animation: `drift 14s ease-in-out ${leaf.d} infinite` }}>
            <IconLeaf size={leaf.s} />
          </div>
        ))}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Logo size="md" subtitle={false} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 88, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "var(--font-display)" }}>
            hibi<br />
            <span style={{ fontWeight: 300, letterSpacing: "0.12em", fontSize: 64 }}>MATCHA</span>
          </div>
          <div className="jp" style={{ fontSize: 18, marginTop: 12, opacity: 0.7, letterSpacing: "0.06em" }}>ひびマッチャ · Everyday Matcha</div>
          <div style={{ marginTop: 28, maxWidth: 420, fontSize: 16, lineHeight: 1.7, opacity: 0.75 }}>
            A calm operating system for matcha houses. Cultivate craft. Honor every cup. <span className="jp">一期一会</span>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, fontSize: 12, opacity: 0.5, display: "flex", alignItems: "center", gap: 12 }}>
          <span>v2026.5 · Hibi House POS</span>
        </div>
      </div>

      {/* Right auth */}
      <div style={{ display: "grid", placeItems: "center", padding: "40px 24px", background: "var(--bg-base)" }}>
        <div style={{ width: "min(420px, 100%)" }}>
          <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 36, boxShadow: "var(--shadow-xl)", animation: "slideUp 540ms var(--ease-out-expo)" }}>
            {/* Mode tabs */}
            <div style={{ display: "flex", background: "var(--bg-muted)", borderRadius: "var(--r-default)", padding: 4, marginBottom: 24, position: "relative" }}>
              <span style={{ position: "absolute", top: 4, bottom: 4, width: "calc(50% - 4px)", left: mode === "system" ? 4 : "calc(50% + 0px)", background: "var(--bg-surface)", borderRadius: "var(--r-subtle)", boxShadow: "var(--shadow-xs)", transition: "left 320ms var(--ease-out-expo)" }} />
              {[{ k: "system", l: "System Login", s: "Employee code" }, { k: "pin", l: "POS Quick Access", s: "4-digit PIN" }].map((t) => (
                <button key={t.k} onClick={() => { setMode(t.k); setError(""); setPin(""); }} style={{ flex: 1, padding: "10px 8px", position: "relative", zIndex: 1, fontSize: 13, fontWeight: 500, color: mode === t.k ? "var(--text-primary)" : "var(--text-tertiary)", transition: "color 200ms" }}>
                  <div>{t.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{t.s}</div>
                </button>
              ))}
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--danger-bg, rgba(239,68,68,0.08))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-default)", color: "var(--danger)", fontSize: 13 }}>
                {error}
              </div>
            )}

            {mode === "system" ? (
              <>
                <h2 className="t-h2" style={{ fontWeight: 600, margin: 0, marginBottom: 6 }}>Welcome back</h2>
                <p className="muted" style={{ margin: 0, marginBottom: 24 }}>Sign in to manage your branch.</p>
                <Field label="Employee Code" required>
                  <input className="input" value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="HMC-XXXX" autoFocus onKeyDown={(e) => e.key === "Enter" && handleEmployeeLogin()} />
                </Field>
                <Field label="Password" required>
                  <div style={{ position: "relative" }}>
                    <input className="input" type={showPwd ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Your password" style={{ paddingRight: 40 }} onKeyDown={(e) => e.key === "Enter" && handleEmployeeLogin()} />
                    <button onClick={() => setShowPwd((v) => !v)} className="btn btn-ghost btn-icon" style={{ position: "absolute", right: 4, top: 4, width: 32, height: 32 }}>
                      {showPwd ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </Field>
                {awaitingTotp && (
                  <Field label="Authenticator code" required>
                    <input className="input" value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000" inputMode="numeric" maxLength={6} style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }}
                      onKeyDown={(e) => e.key === "Enter" && handleEmployeeLogin()} />
                  </Field>
                )}
                <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} onClick={handleEmployeeLogin} disabled={isLoading}>
                  {isLoading ? "Signing in…" : <>Sign in <IconChevRight size={16} /></>}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--text-quaternary)", fontSize: 12 }}>
                  <span style={{ flex: 1, height: 1, background: "var(--border-default)" }} />or
                  <span style={{ flex: 1, height: 1, background: "var(--border-default)" }} />
                </div>
                <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setMode("pin")}>
                  Continue with PIN <IconChevRight size={14} />
                </button>
              </>
            ) : (
              <>
                <h2 className="t-h2" style={{ fontWeight: 600, margin: 0, marginBottom: 6 }}>Quick Access</h2>
                <p className="muted" style={{ margin: 0, marginBottom: 16 }}>Enter your 4-digit PIN.</p>

                {publicBranches && publicBranches.length > 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>Branch</label>
                    <select className="input" value={selectedBranchId ?? ""} onChange={(e) => setSelectedBranchId(Number(e.target.value))}>
                      <option value="">Select branch…</option>
                      {publicBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}

                {/* PIN dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: pin.length > i ? "var(--matcha-600)" : "transparent", border: "2px solid " + (pin.length > i ? "var(--matcha-600)" : "var(--border-emphasis)"), transform: pin.length > i ? "scale(1)" : "scale(0.85)", transition: "all 200ms var(--ease-out-expo)" }} />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button key={n} onClick={() => pin.length < 4 && setPin(pin + n)} style={{ height: 64, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--r-md)", fontSize: 24, fontWeight: 500, transition: "transform 120ms var(--ease-out-expo), background 180ms" }}>{n}</button>
                  ))}
                  <button onClick={() => setPin(pin.slice(0, -1))} style={{ height: 64, background: "var(--bg-muted)", borderRadius: "var(--r-md)", display: "grid", placeItems: "center", color: "var(--text-secondary)" }}><IconChevLeft size={20} /></button>
                  <button onClick={() => pin.length < 4 && setPin(pin + 0)} style={{ height: 64, background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--r-md)", fontSize: 24, fontWeight: 500 }}>0</button>
                  <button onClick={handlePinLogin} disabled={pin.length < 4 || isLoading} style={{ height: 64, background: pin.length === 4 ? "linear-gradient(180deg, var(--matcha-500), var(--matcha-700))" : "var(--bg-muted)", color: pin.length === 4 ? "white" : "var(--text-quaternary)", borderRadius: "var(--r-md)", display: "grid", placeItems: "center", boxShadow: pin.length === 4 ? "var(--glow-soft)" : "none", transition: "all 200ms" }}><IconCheck size={20} /></button>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ width: "100%" }} onClick={() => setMode("system")}>Need full access? Switch to employee login →</button>
              </>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--text-tertiary)" }}>
            Protected by Hibi House security
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .login-grid { grid-template-columns: 1fr !important; } .login-hero { min-height: 240px; padding: 28px !important; } }
        @media (max-width: 480px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-hero { display: none !important; }
          .login-grid > div:last-child { padding: 20px 16px !important; align-content: start !important; }
          .login-grid .glass { padding: 24px 20px !important; border-radius: var(--r-lg) !important; }
        }
      `}</style>
    </div>
  );
};

// ----- First-run bootstrap: create the initial super admin -----
export const PageBootstrap = () => {
  const { navigate } = useApp();
  const [form, setForm] = useState({
    employeeCode: "HMC-0001",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    pin: "",
  });
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);

  const { data: bootstrapCheck, isLoading: checking } = trpc.posAuth.needsBootstrap.useQuery();
  const bootstrap = trpc.posAuth.bootstrap.useMutation();

  // If already bootstrapped → bounce to login
  useEffect(() => {
    if (bootstrapCheck && !bootstrapCheck.needsBootstrap) navigate("/login");
  }, [bootstrapCheck?.needsBootstrap]);

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) { setError("Please enter your name"); return; }
    if (!form.email.trim() || !/.+@.+\..+/.test(form.email)) { setError("Please enter a valid email"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.pin && form.pin.length !== 4) { setError("PIN must be exactly 4 digits"); return; }
    try {
      await bootstrap.mutateAsync({
        employeeCode: form.employeeCode.trim() || undefined,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        pin: form.pin || undefined,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "Failed to create super admin");
    }
  };

  if (checking) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-tertiary)" }}>Checking system status…</div>;
  }

  if (bootstrapCheck && !bootstrapCheck.dbReady) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className="card" style={{ padding: 36, maxWidth: 480, textAlign: "center" }}>
          <h2 className="t-h2" style={{ fontWeight: 600, marginBottom: 12 }}>Database not ready</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            The application cannot reach the database. Make sure your <code>.env</code> contains a valid <code>DATABASE_URL</code> and run:
          </p>
          <pre style={{ background: "var(--bg-muted)", padding: 14, borderRadius: "var(--r-default)", fontSize: 12, textAlign: "left", overflow: "auto" }}>
{`pnpm install
npm run db:push`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", position: "relative" }} className="login-grid">
      <div style={{
        position: "relative", overflow: "hidden",
        background: "var(--matcha-950)", color: "white",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "40px 56px",
      }} className="login-hero">
        <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
          <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, var(--matcha-500), transparent 60%)", filter: "blur(60px)" }}/>
          <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "70%", height: "70%", background: "radial-gradient(circle, var(--matcha-700), transparent 60%)", filter: "blur(60px)" }}/>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}><Logo size="md" subtitle={false}/></div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="t-caption" style={{ color: "var(--matcha-300)", marginBottom: 12 }}>First-time setup</div>
          <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1.05, fontFamily: "var(--font-display)" }}>
            Welcome to<br/>Hibi Matcha.
          </div>
          <div className="jp" style={{ fontSize: 16, marginTop: 16, opacity: 0.7, letterSpacing: "0.06em" }}>はじめまして · Let's begin</div>
          <div style={{ marginTop: 24, maxWidth: 460, fontSize: 15, lineHeight: 1.7, opacity: 0.75 }}>
            Create your <strong>super administrator</strong> account. This is the master account that controls every branch, staff member, and setting in the system.
          </div>
          <ul style={{ marginTop: 20, padding: 0, listStyle: "none", fontSize: 14, opacity: 0.8 }}>
            <li style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <IconCheck size={16} style={{ color: "var(--matcha-300)" }}/> Full access to all branches & staff
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <IconCheck size={16} style={{ color: "var(--matcha-300)" }}/> Configure menu, options & pricing
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconCheck size={16} style={{ color: "var(--matcha-300)" }}/> View reports, audit logs & SOPs
            </li>
          </ul>
        </div>
        <div style={{ position: "relative", zIndex: 1, fontSize: 12, opacity: 0.5 }}>v2026.5 · Hibi House POS · Initial Setup</div>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: "40px 24px", background: "var(--bg-base)", overflowY: "auto" }}>
        <div style={{ width: "min(440px, 100%)" }}>
          <div className="glass" style={{ borderRadius: "var(--r-xl)", padding: 36, boxShadow: "var(--shadow-xl)", animation: "slideUp 540ms var(--ease-out-expo)" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--matcha-50)", color: "var(--matcha-700)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                  <IconCheck size={32} stroke={2.5}/>
                </div>
                <h2 className="t-h2" style={{ fontWeight: 600, margin: 0, marginBottom: 8 }}>Account created</h2>
                <p className="muted" style={{ margin: 0 }}>Redirecting to login…</p>
              </div>
            ) : (
              <>
                <h2 className="t-h2" style={{ fontWeight: 600, margin: 0, marginBottom: 6 }}>Create super admin</h2>
                <p className="muted" style={{ margin: 0, marginBottom: 20 }}>This account will own the system. You can change credentials later.</p>

                {error && (
                  <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--r-default)", color: "var(--danger)", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="First name" required>
                    <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Sakura" autoFocus/>
                  </Field>
                  <Field label="Last name" required>
                    <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Tanaka"/>
                  </Field>
                </div>

                <Field label="Employee code">
                  <input className="input" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} placeholder="HMC-0001"/>
                </Field>

                <Field label="Email" required>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@hibimatcha.com"/>
                </Field>

                <Field label="Password" required>
                  <div style={{ position: "relative" }}>
                    <input className="input" type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" style={{ paddingRight: 40 }}/>
                    <button onClick={() => setShowPwd((v) => !v)} className="btn btn-ghost btn-icon" style={{ position: "absolute", right: 4, top: 4, width: 32, height: 32 }} type="button">
                      {showPwd ? <IconEyeOff size={16}/> : <IconEye size={16}/>}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm password" required>
                  <input className="input" type={showPwd ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter password"/>
                </Field>

                <Field label="4-digit PIN (optional)" hint="For quick POS access">
                  <input className="input" type="text" inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })} placeholder="0000" style={{ letterSpacing: 8, fontSize: 18, textAlign: "center" }}/>
                </Field>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={handleSubmit}
                  disabled={bootstrap.isPending}
                >
                  {bootstrap.isPending ? "Creating account…" : <>Create super admin <IconChevRight size={16}/></>}
                </button>
              </>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--text-tertiary)" }}>
            This page only appears when the database is empty.
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) { .login-grid { grid-template-columns: 1fr !important; } .login-hero { min-height: 240px; padding: 28px !important; } }
        @media (max-width: 480px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-hero { display: none !important; }
          .login-grid > div:last-child { padding: 20px 16px !important; align-content: start !important; }
          .login-grid .glass { padding: 24px 20px !important; border-radius: var(--r-lg) !important; }
        }
      `}</style>
    </div>
  );
};

export const PageBranchSelect = () => {
  const { navigate, setStaff, setBranch } = useApp();
  const queryClient = useQueryClient();
  const { data: branches, isLoading } = trpc.branches.getMyBranches.useQuery(undefined, { staleTime: 15000 });
  const switchBranch = trpc.posAuth.switchBranch.useMutation();

  useEffect(() => {
    if (branches && branches.length === 1) {
      handleSelect(branches[0]);
    }
  }, [branches]);

  const handleSelect = async (b) => {
    try {
      const result = await switchBranch.mutateAsync({ branchId: b.id });
      // Update token with new branch
      const { getSession, setSession } = await import("@/lib/authStore");
      const session = getSession();
      if (session) {
        setSession({ ...session, currentBranchId: b.id, token: result.token });
      }
      // Update App context branch
      setBranch({
        id: b.id,
        name: b.name,
        sub: b.province || 'Bangkok',
        type: b.branchType === 'hq' ? 'HQ' : b.branchType === 'franchise' ? 'Franchise' : 'Branch',
        branchCode: b.branchCode,
      });
      // Invalidate all cached queries so pages refetch with new branchId
      queryClient.invalidateQueries();
      // Navigate based on role
      const role = session?.role;
      if (role === 'staff') navigate('/pos/terminal');
      else navigate('/backoffice');
    } catch (err) {
      navigate('/backoffice');
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", top: 24, left: 24 }}><Logo size="sm" /></div>
      <div style={{ width: "min(1000px, 100%)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="t-caption" style={{ color: "var(--matcha-700)" }}>Welcome</div>
          <h1 style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.025em", margin: "10px 0 8px" }}>Where are you working today?</h1>
          <div className="muted">Choose a branch to continue.</div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>Loading branches…</div>
        ) : branches?.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-tertiary)" }}>No branches assigned. Contact your administrator.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {(branches ?? []).map((b, i) => (
              <button key={b.id} onClick={() => handleSelect(b)} className="card" style={{ padding: 0, overflow: "hidden", textAlign: "left", animation: `slideUp 540ms var(--ease-out-expo) ${i * 80}ms both` }}>
                <div style={{ height: 100, background: "linear-gradient(135deg, var(--matcha-50), var(--matcha-100))", display: "grid", placeItems: "center", color: "var(--matcha-700)", fontSize: 32, fontWeight: 700 }}>
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className={"pill " + (b.branchType === "hq" ? "pill-matcha" : "")} style={{ height: 18, fontSize: 10 }}>
                      {b.branchType === "hq" ? "HQ" : b.branchType === "franchise" ? "Franchise" : "Branch"}
                    </span>
                    <span className="pill" style={{ height: 18, fontSize: 10, background: "rgba(34,197,94,0.1)", color: "var(--matcha-700)" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--matcha-500)", boxShadow: "0 0 6px var(--matcha-500)" }} /> Active
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{b.name}</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{b.province ?? ""}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/login")}>← Back to login</button>
        </div>
      </div>
    </div>
  );
};
