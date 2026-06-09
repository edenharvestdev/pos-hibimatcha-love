import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * BulkInviteModal - Allows adding multiple staff at once via:
 * 1. Paste from spreadsheet (tab-separated)
 * 2. Manual row-by-row entry
 * 
 * Columns: firstName, lastName, role, email (optional), branches
 */

const ROLES = ['staff', 'staff_admin', 'super_admin'];
const ROLE_LABEL = { staff: 'Staff', staff_admin: 'Staff Admin', super_admin: 'Super Admin' };

const emptyRow = () => ({ firstName: '', lastName: '', role: 'staff', email: '', branchIds: [], status: 'pending' });

export default function BulkInviteModal({ open, onClose, onSuccess }) {
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [step, setStep] = useState('input'); // input | confirm | processing | done
  const [results, setResults] = useState([]);
  const [pasteMode, setPasteMode] = useState(false);

  const { data: branches = [] } = trpc.branches.listPublic.useQuery(undefined, { staleTime: 60000, enabled: open });
  const createStaff = trpc.staff.create.useMutation();
  const assignBranches = trpc.staff.assignToBranches.useMutation();

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text.includes('\t') && !text.includes('\n')) return; // not spreadsheet data
    e.preventDefault();

    const lines = text.trim().split('\n').filter(Boolean);
    const parsed = lines.map(line => {
      const cols = line.split('\t');
      return {
        firstName: (cols[0] || '').trim(),
        lastName: (cols[1] || '').trim(),
        role: ROLES.includes((cols[2] || '').trim().toLowerCase()) ? cols[2].trim().toLowerCase() : 'staff',
        email: (cols[3] || '').trim(),
        branchIds: [],
        status: 'pending',
      };
    }).filter(r => r.firstName);

    if (parsed.length > 0) {
      setRows(parsed);
      setPasteMode(false);
    }
  }, []);

  const validRows = rows.filter(r => r.firstName.trim());

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setStep('processing');
    const newResults = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const result = await createStaff.mutateAsync({
          firstName: row.firstName,
          lastName: row.lastName || undefined,
          email: row.email || undefined,
          role: row.role,
        });
        if (result?.id && row.branchIds.length > 0) {
          await assignBranches.mutateAsync({ staffId: result.id, branchIds: row.branchIds });
        }
        newResults.push({ ...row, status: 'success', code: result?.employeeCode });
      } catch (err) {
        newResults.push({ ...row, status: 'error', error: err.message });
      }
    }

    setResults(newResults);
    setStep('done');
  };

  const handleClose = () => {
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    setStep('input');
    setResults([]);
    setPasteMode(false);
    onClose();
    if (results.some(r => r.status === 'success')) onSuccess?.();
  };

  if (!open) return null;

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="modal-backdrop" onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-primary)', borderRadius: 12, width: '90%', maxWidth: 800, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Bulk Invite Staff</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {step === 'input' && 'Add multiple staff members at once'}
              {step === 'processing' && 'Creating accounts...'}
              {step === 'done' && `Done — ${successCount} created, ${errorCount} failed`}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          
          {step === 'input' && (
            <>
              {/* Paste hint */}
              <div style={{ background: 'var(--bg-muted)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>Tip:</strong> Copy from Excel/Google Sheets (columns: First Name, Last Name, Role, Email) and paste below.
                <button onClick={() => setPasteMode(true)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--matcha-600)', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                  Paste from spreadsheet
                </button>
              </div>

              {pasteMode && (
                <textarea
                  autoFocus
                  onPaste={handlePaste}
                  placeholder="Paste spreadsheet data here (Tab-separated: FirstName  LastName  Role  Email)"
                  style={{ width: '100%', height: 100, padding: 12, borderRadius: 8, border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 16, resize: 'vertical' }}
                />
              )}

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-muted)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>First Name *</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>Last Name</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>Role</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>Email</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>Branches</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--text-tertiary)' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 6px' }}>
                          <input className="input" style={{ fontSize: 13, padding: '6px 8px' }} placeholder="Yuki" value={row.firstName} onChange={(e) => updateRow(idx, 'firstName', e.target.value)}/>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input className="input" style={{ fontSize: 13, padding: '6px 8px' }} placeholder="Tanaka" value={row.lastName} onChange={(e) => updateRow(idx, 'lastName', e.target.value)}/>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <select className="input" style={{ fontSize: 13, padding: '6px 8px' }} value={row.role} onChange={(e) => updateRow(idx, 'role', e.target.value)}>
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input className="input" style={{ fontSize: 13, padding: '6px 8px' }} placeholder="email@..." value={row.email} onChange={(e) => updateRow(idx, 'email', e.target.value)}/>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <BranchPicker branches={branches} selected={row.branchIds} onChange={(ids) => updateRow(idx, 'branchIds', ids)}/>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          {rows.length > 1 && (
                            <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16 }}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={addRow} style={{ marginTop: 12, background: 'none', border: '1px dashed var(--border-default)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, width: '100%' }}>
                + Add row
              </button>
            </>
          )}

          {step === 'processing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--matcha-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
              <p style={{ color: 'var(--text-secondary)' }}>Creating {validRows.length} staff accounts...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 'done' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: 'var(--matcha-50)', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--matcha-600)' }}>{successCount}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Created</div>
                </div>
                {errorCount > 0 && (
                  <div style={{ flex: 1, background: '#fef2f2', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{errorCount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Failed</div>
                  </div>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-muted)' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '8px 10px' }}>{r.firstName} {r.lastName}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{r.code || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        {r.status === 'success' && <span style={{ color: 'var(--matcha-600)' }}>✓ Created</span>}
                        {r.status === 'error' && <span style={{ color: '#dc2626' }}>✗ {r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {step === 'input' && `${validRows.length} valid row${validRows.length !== 1 ? 's' : ''}`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={handleClose}>
              {step === 'done' ? 'Close' : 'Cancel'}
            </button>
            {step === 'input' && (
              <button className="btn btn-primary" disabled={validRows.length === 0} onClick={handleSubmit}>
                Create {validRows.length} Account{validRows.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact branch picker - shows selected count, click to toggle */
function BranchPicker({ branches, selected, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        onClick={() => setOpen(!open)}
        style={{ fontSize: 12, padding: '6px 8px', cursor: 'pointer', textAlign: 'left', minWidth: 80 }}
      >
        {selected.length === 0 ? '—' : `${selected.length} branch${selected.length > 1 ? 'es' : ''}`}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 8, minWidth: 180, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {branches.map(b => {
            const checked = selected.includes(b.id);
            return (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer', fontSize: 12, borderRadius: 4 }}>
                <input type="checkbox" checked={checked} onChange={() => {
                  onChange(checked ? selected.filter(x => x !== b.id) : [...selected, b.id]);
                }}/>
                <span>{b.name}</span>
              </label>
            );
          })}
          <button onClick={() => setOpen(false)} style={{ marginTop: 6, width: '100%', background: 'none', border: 'none', fontSize: 11, color: 'var(--matcha-600)', cursor: 'pointer' }}>Done</button>
        </div>
      )}
    </div>
  );
}
