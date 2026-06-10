import React, { useState, useEffect } from "react";
import { useApp } from "@/components";
import { trpc } from "@/lib/trpc";
import {
  IconPlus,
  IconX,
  IconEdit,
  IconCheck,
  IconTrash,
  IconPayment,
  IconSearch,
  IconCalendar,
  IconInfo,
} from "@/icons";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

// Simple wrapper that maps open/onClose/title/subtitle/footer to vaul compound API
const SlideOver = ({ open, onClose, title, subtitle, footer, children }) => (
  <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }} direction="right">
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        {subtitle && <DrawerDescription>{subtitle}</DrawerDescription>}
      </DrawerHeader>
      <div style={{ padding: "0 16px", flex: 1, overflowY: "auto" }}>{children}</div>
      {footer && <DrawerFooter style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>{footer}</DrawerFooter>}
    </DrawerContent>
  </Drawer>
);

// Reusable Field component
const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>
      {label} {required && <span style={{ color: "var(--red-500)" }}>*</span>}
    </label>
    {children}
  </div>
);

// Reusable Toggle component
const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: 36,
        height: 20,
        appearance: "none",
        backgroundColor: checked ? "var(--matcha-500)" : "var(--bg-subtle)",
        borderRadius: 10,
        position: "relative",
        cursor: "pointer",
        transition: "background-color 200ms",
        border: "1px solid var(--border-default)",
      }}
      className="toggle-checkbox"
    />
    {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
    <style dangerouslySetInnerHTML={{ __html: `
      .toggle-checkbox::before {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: white;
        transition: transform 200ms;
        transform: translateX(${checked ? "16px" : "0"});
        box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      }
    `}} />
  </label>
);

export const PagePaymentMethods = ({ defaultTab = "methods" }) => {
  const { t, lang, branch } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  
  // Settlements states
  const [settlementFilter, setSettlementFilter] = useState("all");
  const [reconcileDrawerOpen, setReconcileDrawerOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [actualAmount, setActualAmount] = useState("");
  const [settlementRef, setSettlementRef] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [slipUrl, setSlipUrl] = useState("");

  const { data: methods = [], isLoading: methodsLoading, refetch: refetchMethods } =
    trpc.enterprise.listMasterPaymentMethods.useQuery();

  const { data: settlements = [], isLoading: settlementsLoading, refetch: refetchSettlements } =
    trpc.enterprise.listSettlements.useQuery(
      { branchId: branch?.id || undefined },
      { staleTime: 5000 }
    );

  const updateMethodMut = trpc.enterprise.updateMasterPaymentMethod.useMutation({
    onSuccess: () => {
      refetchMethods();
      setEditDrawerOpen(false);
    },
    onError: (err) => alert(err.message),
  });

  const reconcileMut = trpc.enterprise.reconcileSettlement.useMutation({
    onSuccess: () => {
      refetchSettlements();
      setReconcileDrawerOpen(false);
    },
    onError: (err) => alert(err.message),
  });

  const handleEditClick = (m) => {
    setSelectedMethod({
      ...m,
      roleAvailability: m.roleAvailability || ["cashier", "manager", "branch_admin", "super_admin"],
    });
    setEditDrawerOpen(true);
  };

  const handleSaveMethod = () => {
    if (!selectedMethod) return;
    updateMethodMut.mutate({
      id: selectedMethod.id,
      name: selectedMethod.name,
      nameThai: selectedMethod.nameThai || undefined,
      type: selectedMethod.type,
      iconName: selectedMethod.iconName || undefined,
      requiresManagerPin: selectedMethod.requiresManagerPin,
      requiresSlipUpload: selectedMethod.requiresSlipUpload,
      requiresReference: selectedMethod.requiresReference,
      requiresSettlement: selectedMethod.requiresSettlement,
      feeType: selectedMethod.feeType || "none",
      feeAmount: selectedMethod.feeAmount || "0.00",
      providerName: selectedMethod.providerName || undefined,
      externalAccountId: selectedMethod.externalAccountId || undefined,
      color: selectedMethod.color || undefined,
      isDeliveryPlatform: selectedMethod.isDeliveryPlatform,
      isCashEquivalent: selectedMethod.isCashEquivalent,
      isCreditAccount: selectedMethod.isCreditAccount,
      roleAvailability: selectedMethod.roleAvailability,
      isActive: selectedMethod.isActive,
    });
  };

  const handleReconcileClick = (s) => {
    setSelectedSettlement(s);
    setActualAmount(String(s.netAmount));
    setSettlementRef(s.settlementReference || "");
    setBankAccount(s.bankAccount || "");
    setSlipUrl(s.slipImageUrl || "");
    setReconcileDrawerOpen(true);
  };

  const handleSaveReconcile = () => {
    if (!selectedSettlement) return;
    reconcileMut.mutate({
      settlementId: selectedSettlement.id,
      actualAmount: actualAmount,
      settlementReference: settlementRef || undefined,
      bankAccount: bankAccount || undefined,
      slipImageUrl: slipUrl || undefined,
    });
  };

  const filteredMethods = methods.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(term) ||
      (m.nameThai && m.nameThai.toLowerCase().includes(term)) ||
      m.code.toLowerCase().includes(term)
    );
  });

  const renderMethodsTab = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", width: 320 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}>
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder={lang === "th" ? "ค้นหาวิธีชำระเงิน..." : "Search payment methods..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {methodsLoading ? (
        <div className="card muted" style={{ padding: 40, textAlign: "center" }}>Loading payment methods...</div>
      ) : filteredMethods.length === 0 ? (
        <div className="card muted" style={{ padding: 40, textAlign: "center" }}>No payment methods found.</div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Method</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Code</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Type</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Settlement</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Fees</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMethods.map((m) => (
                <tr key={m.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: m.color ? `var(--${m.color}-50, #f3f4f6)` : "#f3f4f6",
                          color: m.color ? `var(--${m.color}-600, #4b5563)` : "#4b5563",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <IconPayment size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{lang === "th" ? m.nameThai || m.name : m.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {m.providerName || "No Provider"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }} className="mono">
                    {m.code}
                  </td>
                  <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>{m.type}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {m.requiresSettlement ? (
                      <span className="pill pill-matcha" style={{ fontSize: 11 }}>
                        Reconciled ({m.settlementDays}d delay)
                      </span>
                    ) : (
                      <span className="pill" style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                        Direct
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {m.feeType === "percentage"
                      ? `${m.feeAmount}%`
                      : m.feeType === "fixed"
                      ? `฿${m.feeAmount}`
                      : "None"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <Toggle
                      checked={!!m.isActive}
                      onChange={(val) => {
                        updateMethodMut.mutate({ id: m.id, isActive: val });
                      }}
                    />
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(m)}>
                      <IconEdit size={14} /> Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderPermissionsTab = () => (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Permission Matrix & Security Overrides</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
            <th style={{ padding: "10px 12px", textAlign: "left" }}>Payment Method</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Cashier Available</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Manager PIN Required</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Requires Slip Upload</th>
            <th style={{ padding: "10px 12px", textAlign: "center" }}>Requires Ref Num</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m) => {
            const hasCashierRole = m.roleAvailability?.includes("cashier") ?? true;
            return (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{lang === "th" ? m.nameThai || m.name : m.name}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Toggle
                    checked={hasCashierRole}
                    onChange={(checked) => {
                      let nextRoles = [...(m.roleAvailability || [])];
                      if (checked) {
                        if (!nextRoles.includes("cashier")) nextRoles.push("cashier");
                      } else {
                        nextRoles = nextRoles.filter(r => r !== "cashier");
                      }
                      updateMethodMut.mutate({ id: m.id, roleAvailability: nextRoles });
                    }}
                  />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Toggle
                    checked={!!m.requiresManagerPin}
                    onChange={(val) => {
                      updateMethodMut.mutate({ id: m.id, requiresManagerPin: val });
                    }}
                  />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Toggle
                    checked={!!m.requiresSlipUpload}
                    onChange={(val) => {
                      updateMethodMut.mutate({ id: m.id, requiresSlipUpload: val });
                    }}
                  />
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <Toggle
                    checked={!!m.requiresReference}
                    onChange={(val) => {
                      updateMethodMut.mutate({ id: m.id, requiresReference: val });
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSettlementsTab = () => {
    const filteredSettlements = settlements.filter(s => {
      if (settlementFilter === "all") return true;
      return s.status === settlementFilter;
    });

    const pendingTotal = settlements.filter(s => s.status === "pending").reduce((acc, s) => acc + Number(s.netAmount), 0);
    const settledTotal = settlements.filter(s => s.status === "settled").reduce((acc, s) => acc + Number(s.netAmount), 0);

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Expected Today</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }} className="tabular">฿{pendingTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Non-cash payout pending clearing</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Cleared This Month</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }} className="tabular">฿{settledTotal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Reconciled settlements matching ledger</div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Disputed Entries</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: "var(--red-600)" }}>
              {settlements.filter(s => ["short_paid", "disputed"].includes(s.status)).length}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>Discrepancies matching bank transfers</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["all", "pending", "settled", "short_paid", "over_paid", "disputed"].map((tab) => (
              <button
                key={tab}
                className={`btn btn-sm ${settlementFilter === tab ? "btn-primary" : "btn-secondary"}`}
                style={{ textTransform: "capitalize" }}
                onClick={() => setSettlementFilter(tab)}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {settlementsLoading ? (
          <div className="card muted" style={{ padding: 40, textAlign: "center" }}>Loading settlements...</div>
        ) : filteredSettlements.length === 0 ? (
          <div className="card muted" style={{ padding: 40, textAlign: "center" }}>No settlements matching filter.</div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border-default)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>Expected Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>Provider</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Gross</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Fee Cut</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Expected Net</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettlements.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <IconCalendar size={14} style={{ color: "var(--text-tertiary)" }} />
                        <span>{s.expectedSettlementDate || "Immediate"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{s.providerName}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>฿{Number(s.grossAmount).toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--red-600)" }}>
                      -฿{Number(s.feeAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>
                      ฿{Number(s.netAmount).toFixed(2)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        className={`pill ${
                          s.status === "settled"
                            ? "pill-matcha"
                            : s.status === "pending"
                            ? "pill-gold"
                            : "pill-red"
                        }`}
                        style={{ textTransform: "capitalize" }}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {s.status === "settled" ? (
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>✓ Reconciled</span>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleReconcileClick(s)}>
                          Reconcile Bank
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page" style={{ padding: 24 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="breadcrumb">
          {t("admin.title")} / {t("settings.payment")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {lang === "th" ? "การตั้งค่าชำระเงินและตรวจสอบบัญชี" : "Payment Methods & Audits"}
            </h1>
            <p className="page-desc" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
              Define permission criteria, merchant surcharge parameters, and match non-cash payouts.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--border-default)", marginBottom: 20 }}>
        {[
          { id: "methods", label: lang === "th" ? "วิธีการชำระเงิน" : "Methods Control" },
          { id: "permissions", label: lang === "th" ? "สิทธิ์การเข้าใช้งาน" : "Permission Matrix" },
          { id: "settlements", label: lang === "th" ? "การกระทบยอดบัญชี" : "Settlements Reconciliation" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "transparent",
              borderBottom: activeTab === tab.id ? "2px solid var(--matcha-500)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--matcha-700)" : "var(--text-secondary)",
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "methods" && renderMethodsTab()}
      {activeTab === "permissions" && renderPermissionsTab()}
      {activeTab === "settlements" && renderSettlementsTab()}

      {/* Edit Drawer */}
      <SlideOver
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title={lang === "th" ? "ตั้งค่าระบบชำระเงิน" : "Payment Configurations"}
        subtitle="Master override settings"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditDrawerOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveMethod} disabled={updateMethodMut.isPending}>
              {updateMethodMut.isPending ? "Saving..." : "Save Settings"}
            </button>
          </>
        }
      >
        {selectedMethod && (
          <div>
            <Field label="Display Name (En) *" required>
              <input
                className="input"
                value={selectedMethod.name}
                onChange={(e) => setSelectedMethod({ ...selectedMethod, name: e.target.value })}
              />
            </Field>
            <Field label="Display Name (Th)">
              <input
                className="input"
                value={selectedMethod.nameThai || ""}
                onChange={(e) => setSelectedMethod({ ...selectedMethod, nameThai: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Provider Name">
                <input
                  className="input"
                  value={selectedMethod.providerName || ""}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, providerName: e.target.value })}
                  placeholder="e.g. Omise, Kasikorn Bank"
                />
              </Field>
              <Field label="External Account ID">
                <input
                  className="input"
                  value={selectedMethod.externalAccountId || ""}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, externalAccountId: e.target.value })}
                  placeholder="MID-0001-999"
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Fee Calculation Mode">
                <select
                  className="input"
                  style={{ appearance: "auto" }}
                  value={selectedMethod.feeType || "none"}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, feeType: e.target.value })}
                >
                  <option value="none">None</option>
                  <option value="fixed">Fixed Per Sale</option>
                  <option value="percentage">Percentage Rate</option>
                </select>
              </Field>
              <Field label="Fee Value">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={selectedMethod.feeAmount || "0"}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, feeAmount: e.target.value })}
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Settlement Delay Days">
                <input
                  className="input"
                  type="number"
                  value={selectedMethod.settlementDays ?? 0}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, settlementDays: Number(e.target.value) })}
                />
              </Field>
              <Field label="Display Color Theme">
                <select
                  className="input"
                  style={{ appearance: "auto" }}
                  value={selectedMethod.color || "slate"}
                  onChange={(e) => setSelectedMethod({ ...selectedMethod, color: e.target.value })}
                >
                  <option value="emerald">Emerald Green</option>
                  <option value="sky">Sky Blue</option>
                  <option value="indigo">Indigo Purple</option>
                  <option value="purple">Royal Violet</option>
                  <option value="pink">Hot Pink</option>
                  <option value="orange">Bright Orange</option>
                  <option value="slate">Classic Gray</option>
                </select>
              </Field>
            </div>

            <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: 16, marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Toggle
                  checked={!!selectedMethod.requiresSettlement}
                  onChange={(v) => setSelectedMethod({ ...selectedMethod, requiresSettlement: v })}
                  label="Requires Settlement Auditing & Payout Matching"
                />
                <Toggle
                  checked={!!selectedMethod.isDeliveryPlatform}
                  onChange={(v) => setSelectedMethod({ ...selectedMethod, isDeliveryPlatform: v })}
                  label="Is Third-party Delivery Merchant (Grab, Shopee, etc.)"
                />
                <Toggle
                  checked={!!selectedMethod.isCashEquivalent}
                  onChange={(v) => setSelectedMethod({ ...selectedMethod, isCashEquivalent: v })}
                  label="Is Cash Drawer Equivalent (Drawer open event)"
                />
                <Toggle
                  checked={!!selectedMethod.isCreditAccount}
                  onChange={(v) => setSelectedMethod({ ...selectedMethod, isCreditAccount: v })}
                  label="Is Credit Account / Accounts Receivable Ledger"
                />
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Reconcile Drawer */}
      <SlideOver
        open={reconcileDrawerOpen}
        onClose={() => setReconcileDrawerOpen(false)}
        title="Bank Reconciliation Matcher"
        subtitle="Confirm bank settlement details"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setReconcileDrawerOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveReconcile} disabled={reconcileMut.isPending}>
              {reconcileMut.isPending ? "Matching..." : "Confirm & Clear"}
            </button>
          </>
        }
      >
        {selectedSettlement && (
          <div>
            <div style={{ background: "var(--bg-muted)", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Expected net transfer:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>฿{Number(selectedSettlement.netAmount).toFixed(2)}</span>
              </div>
            </div>
            <Field label="Actual Cleared Amount (THB) *" required>
              <input
                className="input"
                type="number"
                step="0.01"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
              />
            </Field>
            <Field label="Bank Transaction Ref Code">
              <input
                className="input"
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
                placeholder="e.g. K-99182312A"
              />
            </Field>
            <Field label="Receiving Bank Account ID">
              <input
                className="input"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g. KBank 112-2-00122"
              />
            </Field>
            <Field label="Slip Upload URL">
              <input
                className="input"
                value={slipUrl}
                onChange={(e) => setSlipUrl(e.target.value)}
                placeholder="https://bucket.gcs.com/slips/slip-2026.png"
              />
            </Field>
          </div>
        )}
      </SlideOver>
    </div>
  );
};
