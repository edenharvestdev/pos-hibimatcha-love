// ============================================
// Staff Detail Drawer — View, Edit, Branch Assignment
// ============================================

import React, { useState, useEffect, useMemo } from "react";
import { IconX, IconCheck, IconError } from "@/icons";
import { Drawer, Field, Checkbox } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";

const roleLabel = { super_admin: "Super Admin", staff_admin: "Staff Admin", staff: "Staff" };
const roleClass = { super_admin: "pill-matcha", staff_admin: "pill-amber", staff: "" };
const statusLabel = { active: "Active", inactive: "Inactive", terminated: "Terminated" };

const InfoItem = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 14 }}>{value}</div>
  </div>
);

// PIN management sub-component
function PinSection({ staffId, isSuperAdmin }) {
  const [showReset, setShowReset] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [lastResetPin, setLastResetPin] = useState(null);
  const { data: pinStatus } = trpc.staff.getByIdWithPinStatus.useQuery({ id: staffId }, { enabled: !!staffId, staleTime: 10000 });
  const resetPin = trpc.staff.resetPin.useMutation({
    onSuccess: (data) => { setLastResetPin(data.newPin); setShowReset(false); setNewPin(''); },
  });

  return (
    <div style={{ padding: 12, background: 'var(--bg-muted)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>PIN Status</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {pinStatus?.hasPin ? '✓ PIN is set' : '✗ No PIN set'}
          </div>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReset(!showReset)}>
            {showReset ? 'Cancel' : 'Reset PIN'}
          </button>
        )}
      </div>
      {lastResetPin && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--matcha-50)', borderRadius: 6, fontSize: 13 }}>
          <strong>New PIN:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.2em' }}>{lastResetPin}</span>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Please share this PIN with the staff member securely.</div>
        </div>
      )}
      {showReset && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="4-digit PIN"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            maxLength={4}
            style={{ width: 120, fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.2em', textAlign: 'center' }}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={newPin.length !== 4 || resetPin.isPending}
            onClick={() => resetPin.mutate({ id: staffId, newPin })}
          >
            {resetPin.isPending ? 'Saving…' : 'Set PIN'}
          </button>
        </div>
      )}
    </div>
  );
}

export function StaffDetailDrawer({ open, onClose, staffId, onUpdated }) {
  const [mode, setMode] = useState("view"); // view | edit | branches
  const [form, setForm] = useState({});
  const [selectedBranches, setSelectedBranches] = useState(new Set());

  // Queries
  const { data: detail, isLoading, refetch } = trpc.staff.getById.useQuery(
    { id: staffId },
    { enabled: open && !!staffId, staleTime: 10000 }
  );
  const { data: allBranches = [] } = trpc.branches.listPublic.useQuery(undefined, {
    enabled: open,
    staleTime: 60000,
  });

  // Mutations
  const updateStaff = trpc.staff.update.useMutation({
    onSuccess: () => { refetch(); onUpdated?.(); setMode("view"); },
  });
  const assignBranches = trpc.staff.assignToBranches.useMutation({
    onSuccess: () => { refetch(); onUpdated?.(); setMode("view"); },
  });
  const archiveStaff = trpc.staff.archive.useMutation({
    onSuccess: () => { onUpdated?.(); onClose(); },
  });

  // Reset state when opening
  useEffect(() => {
    if (open) setMode("view");
  }, [open, staffId]);

  // Populate form when entering edit mode
  useEffect(() => {
    if (mode === "edit" && detail) {
      setForm({
        firstName: detail.firstName || "",
        lastName: detail.lastName || "",
        firstNameThai: detail.firstNameThai || "",
        lastNameThai: detail.lastNameThai || "",
        email: detail.email || "",
        phone: detail.phone || "",
        role: detail.role || "staff",
        employmentType: detail.employmentType || "full-time",
        status: detail.status || "active",
      });
    }
  }, [mode, detail]);

  // Populate branch selection
  useEffect(() => {
    if (mode === "branches" && detail) {
      setSelectedBranches(new Set(detail.branchIds || []));
    }
  }, [mode, detail]);

  const session = getSession();
  const isSuperAdmin = session?.role === "super_admin";

  // --- VIEW MODE ---
  const renderView = () => {
    if (isLoading || !detail) {
      return (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-tertiary)" }}>
          Loading…
        </div>
      );
    }

    const assignedBranches = allBranches.filter((b) => detail.branchIds?.includes(b.id));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "0 4px" }}>
        {/* Profile Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "var(--matcha-100)", color: "var(--matcha-700)",
            display: "grid", placeItems: "center", fontSize: 22, fontWeight: 700,
          }}>
            {(detail.firstName?.[0] || detail.employeeCode?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {[detail.firstName, detail.lastName].filter(Boolean).join(" ") || detail.employeeCode}
            </div>
            {detail.firstNameThai && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {[detail.firstNameThai, detail.lastNameThai].filter(Boolean).join(" ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <span className={"pill " + (roleClass[detail.role] || "")}>{roleLabel[detail.role] || detail.role}</span>
              <span className={"pill " + (detail.status === "active" ? "pill-green" : "pill-red")}>
                {statusLabel[detail.status] || detail.status}
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <InfoItem label="Employee Code" value={detail.employeeCode} />
          <InfoItem label="Employment" value={detail.employmentType || "—"} />
          <InfoItem label="Email" value={detail.email || "—"} />
          <InfoItem label="Phone" value={detail.phone || "—"} />
          <InfoItem label="Hire Date" value={detail.hireDate ? new Date(detail.hireDate).toLocaleDateString() : "—"} />
          <InfoItem label="Last Login" value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString() : "Never"} />
        </div>

        {/* Emergency Contact */}
        {(detail.emergencyContactName || detail.emergencyContactPhone) && (
          <div style={{ padding: 12, background: "var(--bg-muted)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 4 }}>Emergency Contact</div>
            <div style={{ fontSize: 13 }}>{detail.emergencyContactName} · {detail.emergencyContactPhone}</div>
          </div>
        )}

        {/* Branches Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--text-tertiary)" }}>Assigned Branches</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode("branches")}>Manage</button>
          </div>
          {assignedBranches.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "8px 0" }}>No branches assigned</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {assignedBranches.map((b, i) => (
                <span key={b.id} className="pill" style={{ background: i === 0 ? "var(--matcha-100)" : undefined, color: i === 0 ? "var(--matcha-700)" : undefined }}>
                  {b.name} {i === 0 && "(Primary)"}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* PIN Management */}
        <PinSection staffId={staffId} isSuperAdmin={isSuperAdmin} />

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-default)" }}>
          <button className="btn btn-primary" onClick={() => setMode("edit")}>Edit Profile</button>
          {isSuperAdmin && detail.status === "active" && (
            <button className="btn btn-ghost" style={{ color: "var(--red-600)" }}
              onClick={() => { if (window.confirm("Archive this staff member?")) archiveStaff.mutate({ id: staffId }); }}>
              Archive
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- EDIT MODE ---
  const renderEdit = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 4px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="First Name">
          <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </Field>
        <Field label="Last Name">
          <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </Field>
        <Field label="ชื่อ (ไทย)">
          <input className="input" value={form.firstNameThai} onChange={(e) => setForm({ ...form, firstNameThai: e.target.value })} />
        </Field>
        <Field label="นามสกุล (ไทย)">
          <input className="input" value={form.lastNameThai} onChange={(e) => setForm({ ...form, lastNameThai: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Role">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={!isSuperAdmin}>
            <option value="staff">Staff</option>
            <option value="staff_admin">Staff Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </Field>
        <Field label="Employment Type">
          <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
          </select>
        </Field>
      </div>

      <Field label="Status">
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
      </Field>
    </div>
  );

  // --- BRANCHES MODE ---
  const renderBranches = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 4px" }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
        Select branches this staff member works at. The first selected branch is the primary.
      </div>
      {allBranches.map((b) => {
        const checked = selectedBranches.has(b.id);
        return (
          <button
            key={b.id}
            onClick={() => {
              const next = new Set(selectedBranches);
              if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
              setSelectedBranches(next);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 8,
              background: checked ? "var(--matcha-50)" : "var(--bg-surface)",
              border: checked ? "1.5px solid var(--matcha-400)" : "1px solid var(--border-default)",
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "all 160ms",
            }}
          >
            <Checkbox checked={checked} onChange={() => {}} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {b.branchType === "hq" ? "HQ" : "Branch"} · {b.province || "Bangkok"}
              </div>
            </div>
            {checked && Array.from(selectedBranches)[0] === b.id && (
              <span className="pill pill-matcha" style={{ fontSize: 10 }}>Primary</span>
            )}
          </button>
        );
      })}
    </div>
  );

  // --- FOOTER ---
  const renderFooter = () => {
    if (mode === "edit") {
      return (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={updateStaff.isPending}
            onClick={() => updateStaff.mutate({ id: staffId, ...form })}
          >
            {updateStaff.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      );
    }
    if (mode === "branches") {
      return (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={() => setMode("view")}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={assignBranches.isPending}
            onClick={() => assignBranches.mutate({ staffId, branchIds: Array.from(selectedBranches) })}
          >
            {assignBranches.isPending ? "Saving…" : `Assign ${selectedBranches.size} branch${selectedBranches.size !== 1 ? "es" : ""}`}
          </button>
        </div>
      );
    }
    return null;
  };

  const title = mode === "edit" ? "Edit Staff" : mode === "branches" ? "Manage Branches" : "Staff Detail";
  const subtitle = detail ? (detail.employeeCode || "") : "";

  return (
    <Drawer open={open} onClose={onClose} title={title} subtitle={subtitle} width={520} footer={renderFooter()}>
      {mode === "view" && renderView()}
      {mode === "edit" && renderEdit()}
      {mode === "branches" && renderBranches()}
    </Drawer>
  );
}


