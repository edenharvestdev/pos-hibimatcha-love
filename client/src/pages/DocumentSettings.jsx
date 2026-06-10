import React, { useState } from "react";
import { useApp } from "@/components";
import { trpc } from "@/lib/trpc";
import {
  IconSettings,
  IconCheck,
  IconEdit,
  IconInfo,
} from "@/icons";

export const PageDocumentSettings = () => {
  const { t, lang, branch } = useApp();
  const branchId = branch?.id || 1;

  const { data: sequences = [], isLoading, refetch } =
    trpc.enterprise.listDocumentSequences.useQuery({ branchId });

  const updateSeqMut = trpc.enterprise.updateDocumentSequence.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err) => alert(err.message),
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ prefix: "", includeBranchCode: true, includeDate: true });

  const handleStartEdit = (seq) => {
    setEditingId(seq.id);
    setEditForm({
      prefix: seq.prefix,
      includeBranchCode: !!seq.includeBranchCode,
      includeDate: !!seq.includeDate,
    });
  };

  const handleSave = (id) => {
    updateSeqMut.mutate({
      id,
      prefix: editForm.prefix.trim(),
      includeBranchCode: editForm.includeBranchCode,
      includeDate: editForm.includeDate,
    });
    setEditingId(null);
  };

  const docTypeLabels = {
    pos_receipt: "POS Receipt",
    sales_receipt: "Sales Receipt / Bill",
    full_tax_invoice: "Full Tax Invoice (TAX)",
    credit_note: "Credit Note (CN)",
    debit_note: "Debit Note (DN)",
    delivery_note: "Delivery Note (DN)",
    billing_statement: "Billing Statement",
  };

  return (
    <div className="page" style={{ padding: 24 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="breadcrumb">
          {t("admin.title")} / Settings
        </div>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
            {lang === "th" ? "ตั้งค่ารูปแบบเลขที่เอกสาร" : "Document Numbering System"}
          </h1>
          <p className="page-desc" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
            Configure prefix layouts, date elements, and sequences for receipts and tax invoices.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
          <IconInfo size={20} style={{ color: "var(--matcha-600)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Document numbering operates at the branch level. Sequencers auto-reset daily if dates are included.
          </span>
        </div>

        {isLoading ? (
          <div className="muted" style={{ padding: 20, textAlign: "center" }}>Loading document numbering configuration...</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {sequences.map((seq) => {
              const isEditing = editingId === seq.id;
              return (
                <div
                  key={seq.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid var(--border-default)",
                    background: isEditing ? "var(--bg-muted)" : "transparent",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{docTypeLabels[seq.docType] || seq.docType}</div>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
                        <div style={{ width: 140 }}>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-tertiary)", marginBottom: 4 }}>Prefix</label>
                          <input
                            className="input"
                            value={editForm.prefix}
                            onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                          />
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 16 }}>
                          <input
                            type="checkbox"
                            checked={editForm.includeBranchCode}
                            onChange={(e) => setEditForm({ ...editForm, includeBranchCode: e.target.checked })}
                          />
                          Include Branch
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 16 }}>
                          <input
                            type="checkbox"
                            checked={editForm.includeDate}
                            onChange={(e) => setEditForm({ ...editForm, includeDate: e.target.checked })}
                          />
                          Include Date Stamp
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                        <span>Prefix: <strong className="mono" style={{ color: "var(--text-primary)" }}>{seq.prefix}</strong></span>
                        <span>Include Branch: <strong>{seq.includeBranchCode ? "Yes" : "No"}</strong></span>
                        <span>Include Date: <strong>{seq.includeDate ? "Yes" : "No"}</strong></span>
                        <span>Sequence Count: <strong className="mono">{seq.currentSequence}</strong></span>
                      </div>
                    )}
                  </div>

                  <div>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleSave(seq.id)}>
                          <IconCheck size={14} /> Save
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => handleStartEdit(seq)}>
                        <IconEdit size={14} /> Configure
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {sequences.length === 0 && (
              <div className="muted" style={{ padding: 20, textAlign: "center" }}>
                No sequences initialized yet for this branch. Issue a checkout or tax invoice to auto-create sequences.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
