import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Field, useToast, Modal, StatCard } from "@/components";
import { IconPlus, IconCheck, IconX, IconInfo, IconRefresh } from "@/icons";

export const PageCountSession = () => {
  const { branch } = useApp();
  const toast = useToast();
  const utils = trpc.useUtils();
  const branchId = branch?.id ?? 1;

  // Modals / State
  const [showStartModal, setShowStartModal] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [countedValues, setCountedValues] = useState({}); // inventoryItemId -> countedQty string
  
  // PIN verification dialog
  const [showPinModal, setShowPinModal] = useState(false);
  const [managerPin, setManagerPin] = useState("");
  const [pinAction, setPinAction] = useState(null); // 'approve' | 'reject'

  // Queries
  const { data: staffList = [] } = trpc.staff.list.useQuery({ status: "active" });
  const { data: sessions = [], isLoading: loadingSessions } = trpc.enterprise.listCountSessions.useQuery({ branchId });
  const { data: items = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 30000 });

  // Current session logic
  const activeSession = sessions.find(s => s.status === "in_progress" || s.status === "variance_review");
  const pastSessions = sessions.filter(s => s.status === "closed");

  const { data: sessionItems = [], isLoading: loadingItems } = trpc.enterprise.getCountSessionItems.useQuery(
    { sessionId: activeSession?.id ?? 0 },
    { enabled: !!activeSession }
  );

  // Mutations
  const startSessionMut = trpc.enterprise.startCountSession.useMutation({
    onSuccess: () => {
      utils.enterprise.listCountSessions.invalidate({ branchId });
      toast.push({ type: "success", msg: "Count session started!" });
      setShowStartModal(false);
      setAssignedStaffId("");
      setCountedValues({});
    }
  });

  const countStockMut = trpc.enterprise.countStockInSession.useMutation({
    onSuccess: () => {
      utils.enterprise.listCountSessions.invalidate({ branchId });
      utils.enterprise.getCountSessionItems.invalidate();
      toast.push({ type: "success", msg: "Counts submitted for variance review" });
    }
  });

  const approveVarianceMut = trpc.enterprise.approveCountSessionVariance.useMutation({
    onSuccess: () => {
      utils.enterprise.listCountSessions.invalidate({ branchId });
      utils.enterprise.getCountSessionItems.invalidate();
      toast.push({ type: "success", msg: "Variance approved and stock updated" });
      setShowPinModal(false);
      setManagerPin("");
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || "Invalid PIN or failed to approve" });
      setManagerPin("");
    }
  });

  // Action handlers
  const handleStartSession = () => {
    if (!assignedStaffId) {
      toast.push({ type: "error", msg: "Please select a staff member" });
      return;
    }
    startSessionMut.mutate({
      branchId,
      assignedStaffId: Number(assignedStaffId)
    });
  };

  const handleSubmitCounts = () => {
    if (!activeSession) return;
    const submissionItems = sessionItems.map(si => ({
      inventoryItemId: si.inventoryItemId,
      countedQty: countedValues[si.inventoryItemId] !== undefined ? String(countedValues[si.inventoryItemId]) : "0"
    }));

    countStockMut.mutate({
      sessionId: activeSession.id,
      items: submissionItems
    });
  };

  const handleApproveVariance = () => {
    setPinAction("approve");
    setShowPinModal(true);
  };

  const handleConfirmPin = () => {
    if (managerPin.length !== 4) {
      toast.push({ type: "error", msg: "PIN must be exactly 4 digits" });
      return;
    }
    
    approveVarianceMut.mutate({
      sessionId: activeSession.id,
      approved: pinAction === "approve",
      managerPin
    });
  };

  // Variance calculations
  const totalVarianceCost = sessionItems.reduce((acc, curr) => acc + Number(curr.varianceCost), 0);
  const totalVarianceQty = sessionItems.reduce((acc, curr) => acc + Math.abs(Number(curr.varianceQty)), 0);

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar 
        title="Physical Stocktake count" 
        actions={
          !activeSession && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowStartModal(true)}>
              <IconPlus size={16} /> Start New Count
            </button>
          )
        }
      />

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Scenario 1: Active count session is in progress */}
        {activeSession && activeSession.status === "in_progress" && (
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="pill pill-warning mb-1">IN PROGRESS</span>
                <h2 className="text-lg font-bold text-primary">Count Session #{activeSession.id}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Assigned Staff: <strong>{staffList.find(s => s.id === activeSession.assignedStaffId)?.firstName || "Employee"}</strong> · Started at {new Date(activeSession.startedAt).toLocaleString("en-GB")}
                </p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleSubmitCounts}
                disabled={countStockMut.isPending}
              >
                Submit & Calculate Variance
              </button>
            </div>

            {loadingItems ? (
              <div className="py-12 text-center text-muted-foreground">Loading session checklist...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionItems.map(sItem => {
                  const dbItem = items.find(i => i.id === sItem.inventoryItemId);
                  return (
                    <div key={sItem.id} className="flex items-center justify-between border p-4 rounded-xl bg-background shadow-xs hover:border-primary/30 transition-all">
                      <div>
                        <h4 className="font-semibold text-sm">{dbItem?.nameThai || dbItem?.name}</h4>
                        <span className="text-[11px] text-muted-foreground font-mono">SKU: {dbItem?.sku || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          className="input w-24 text-right font-mono"
                          placeholder="0.0"
                          value={countedValues[sItem.inventoryItemId] ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            setCountedValues(prev => ({...prev, [sItem.inventoryItemId]: val}));
                          }}
                        />
                        <span className="text-xs text-muted-foreground w-12 font-medium">
                          {dbItem?.unitOfMeasure}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Scenario 2: Active count session is in variance review */}
        {activeSession && activeSession.status === "variance_review" && (
          <div className="space-y-6">
            
            {/* Variance StatCards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                label="Total Discrepancies Cost" 
                value={`฿${totalVarianceCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                sub="Net value difference from books"
                accent={totalVarianceCost < 0}
                glow={totalVarianceCost < 0}
              />
              <StatCard 
                label="Variance Qty Volume" 
                value={`${totalVarianceQty.toLocaleString()} units`}
                sub="Gross quantity discrepancy"
              />
              <StatCard 
                label="Review Status" 
                value="VARIANCE REVIEW"
                sub="Needs Manager/Admin approval PIN"
              />
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold text-primary">Count Variance Audit Checklist</h2>
                  <p className="text-xs text-muted-foreground mt-1">Review the difference between counted stock and system books.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="btn btn-ghost border text-destructive hover:bg-destructive/5"
                    onClick={() => {
                      setPinAction("reject");
                      setShowPinModal(true);
                    }}
                  >
                    Cancel Session
                  </button>
                  <button className="btn btn-primary" onClick={handleApproveVariance}>
                    Approve Variance & Post Stock
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs">
                      <th className="p-3">Ingredient</th>
                      <th className="p-3 text-right">System Qty</th>
                      <th className="p-3 text-right">Counted Qty</th>
                      <th className="p-3 text-right">Variance Qty</th>
                      <th className="p-3 text-right">Cost Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono text-xs">
                    {sessionItems.map(sItem => {
                      const dbItem = items.find(i => i.id === sItem.inventoryItemId);
                      const variance = Number(sItem.varianceQty);
                      const costDiff = Number(sItem.varianceCost);
                      return (
                        <tr key={sItem.id} className="hover:bg-muted/15">
                          <td className="p-3 font-semibold text-primary">{dbItem?.nameThai || dbItem?.name}</td>
                          <td className="p-3 text-right">{sItem.systemQty} {dbItem?.unitOfMeasure}</td>
                          <td className="p-3 text-right">{sItem.countedQty} {dbItem?.unitOfMeasure}</td>
                          <td className={`p-3 text-right font-bold ${variance < 0 ? "text-rose-600" : variance > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </td>
                          <td className={`p-3 text-right font-bold ${costDiff < 0 ? "text-rose-600" : costDiff > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            ฿{costDiff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Scenario 3: General view showing count sessions history */}
        {!activeSession && (
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-primary border-b pb-2">Physical Stocktake History</h2>
            {loadingSessions ? (
              <div className="text-center py-12 text-muted-foreground">Loading session logs...</div>
            ) : pastSessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No stocktake sessions ran yet. Click "Start New Count" to audit your stock.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <th className="p-3">Session ID</th>
                      <th className="p-3">Date Closed</th>
                      <th className="p-3">Assigned Staff</th>
                      <th className="p-3">Approved By</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {pastSessions.map(sess => (
                      <tr key={sess.id} className="hover:bg-muted/15">
                        <td className="p-3 font-semibold font-mono">#{sess.id}</td>
                        <td className="p-3 font-mono">{sess.closedAt ? new Date(sess.closedAt).toLocaleString("en-GB") : "—"}</td>
                        <td className="p-3 font-medium">
                          {staffList.find(s => s.id === sess.assignedStaffId)?.firstName || `Staff #${sess.assignedStaffId}`}
                        </td>
                        <td className="p-3 font-medium">
                          {staffList.find(s => s.id === sess.approvedByStaffId)?.firstName || `Manager #${sess.approvedByStaffId}`}
                        </td>
                        <td className="p-3">
                          <span className="pill pill-matcha font-bold">Closed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Start Count Session */}
      <Modal open={showStartModal} onClose={() => setShowStartModal(false)} title="Start New Physical Count">
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Starting a physical count snapshot will record the current inventory items system quantities on books.
            Select a staff member who will count the shelf stock.
          </p>
          
          <Field label="Assign Staff Member" required>
            <select 
              className="input"
              value={assignedStaffId}
              onChange={e => setAssignedStaffId(e.target.value)}
            >
              <option value="">Select staff...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
              ))}
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setShowStartModal(false)}>Cancel</button>
            <button 
              className="btn btn-primary"
              disabled={!assignedStaffId || startSessionMut.isPending}
              onClick={handleStartSession}
            >
              {startSessionMut.isPending ? "Starting..." : "Begin Session"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Security PIN Confirmation */}
      <Modal open={showPinModal} onClose={() => {
        setShowPinModal(false);
        setManagerPin("");
      }} title="Manager PIN Authorization">
        <div className="space-y-4 pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Approve stock variance adjustments requires a manager or administrative 4-digit security PIN check.
          </p>

          <input 
            type="password"
            maxLength={4}
            className="input w-36 text-center text-2xl font-mono tracking-widest mx-auto block"
            placeholder="••••"
            value={managerPin}
            onChange={e => setManagerPin(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => {
              setShowPinModal(false);
              setManagerPin("");
            }}>
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              disabled={managerPin.length !== 4 || approveVarianceMut.isPending}
              onClick={handleConfirmPin}
            >
              {approveVarianceMut.isPending ? "Verifying..." : "Confirm PIN & Close"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
