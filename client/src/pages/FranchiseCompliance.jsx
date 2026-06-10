import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Tabs, useToast, StatCard, Field } from "@/components";
import { IconBuilding, IconRefresh, IconCheckCircle, IconX } from "@/icons";

export const PageFranchiseCompliance = ({ defaultTab = "compliance" }) => {
  const { navigate, route } = useApp();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. "2026-06"

  // Sync tab with path
  useEffect(() => {
    if (route.includes("/royalty")) {
      setActiveTab("royalty");
    } else {
      setActiveTab("compliance");
    }
  }, [route]);

  const handleTabChange = (val) => {
    setActiveTab(val);
    if (val === "royalty") {
      navigate("/backoffice/franchise/royalty");
    } else {
      navigate("/backoffice/franchise/compliance");
    }
  };

  // Queries
  const { data: branches = [] } = trpc.branches.listPublic.useQuery();
  
  // Set default branch on load
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      const firstFranchise = branches.find(b => b.branchType === "franchise") || branches[0];
      setSelectedBranchId(String(firstFranchise.id));
    }
  }, [branches]);

  // Royalty queries & mutations
  const { data: royalties = [], isLoading: loadingRoyalties } = trpc.enterprise.listRoyalties.useQuery(
    { branchId: selectedBranchId ? Number(selectedBranchId) : undefined },
    { enabled: !!selectedBranchId }
  );

  const calculateRoyaltyMut = trpc.enterprise.calculateMonthlyRoyalty.useMutation({
    onSuccess: (data) => {
      utils.enterprise.listRoyalties.invalidate();
      toast.push({ 
        type: "success", 
        msg: `Calculated monthly royalty: ฿${Number(data.calculatedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
      });
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || "Failed to calculate royalty" });
    }
  });

  // Compliance query
  const { data: compliance, isLoading: loadingCompliance } = trpc.enterprise.getFranchiseCompliance.useQuery(
    { branchId: selectedBranchId ? Number(selectedBranchId) : 1, month: selectedMonth },
    { enabled: !!selectedBranchId }
  );

  const handleCalculateRoyalty = () => {
    if (!selectedBranchId) {
      toast.push({ type: "error", msg: "Please select a branch first" });
      return;
    }
    calculateRoyaltyMut.mutate({
      branchId: Number(selectedBranchId),
      month: selectedMonth
    });
  };

  const getScoreColor = (score) => {
    const s = Number(score);
    if (s >= 90) return "text-emerald-600 border-emerald-200 bg-emerald-50";
    if (s >= 75) return "text-amber-600 border-amber-200 bg-amber-50";
    return "text-rose-600 border-rose-200 bg-rose-50";
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar title="Franchise Performance Portal" />

      {/* Select Controls Bar */}
      <div className="px-6 mb-4 max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <Field label="Select Franchise Branch" style={{ marginBottom: 0 }}>
          <select 
            className="input text-xs" 
            value={selectedBranchId} 
            onChange={e => setSelectedBranchId(e.target.value)}
          >
            <option value="">Choose branch...</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.branchType})</option>
            ))}
          </select>
        </Field>
        
        <Field label="Audit Period (Month)" style={{ marginBottom: 0 }}>
          <input 
            type="month" 
            className="input text-xs"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </Field>

        <div className="flex items-end">
          <Tabs 
            items={[
              { value: "compliance", label: "Compliance Index" },
              { value: "royalty", label: "Royalty Ledger" }
            ]}
            value={activeTab}
            onChange={handleTabChange}
            size="sm"
          />
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {selectedBranchId ? (
          activeTab === "compliance" ? (
            /* Tab 1: Compliance Scores */
            <div className="space-y-6">
              {loadingCompliance ? (
                <div className="text-center py-12 text-muted-foreground">Calculating compliance audit scorecards...</div>
              ) : compliance ? (
                <>
                  {/* Giant Score Header */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
                    <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center font-bold font-mono text-3xl shadow-sm ${getScoreColor(compliance.overallScore)}`}>
                      <span>{Number(compliance.overallScore).toFixed(1)}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Overall</span>
                    </div>
                    <div className="space-y-2 text-center md:text-left flex-1">
                      <h2 className="text-xl font-bold text-primary">Monthly Franchise SOP Audit Score</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Evaluated compliance across standard workflows, stock levels, waste rates, and POS revenue sync. 
                        A score above 90 denotes premium operational compliance.
                      </p>
                      <div className="pt-2">
                        {Number(compliance.overallScore) >= 90 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                            <IconCheckCircle size={14} /> EXCELLENT COMPLIANCE GRADE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                            ⚠️ NEEDS IMPROVEMENT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Criteria scores card */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-primary mb-4 border-b pb-2">Compliance Metrics Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      
                      {[
                        { label: "SOP Execution", value: compliance.sopCompliance, suffix: "%", desc: "Recipe compliance rate" },
                        { label: "Waste Index", value: compliance.wasteRate, suffix: "%", desc: "Target waste limit: < 5.0%" },
                        { label: "Stock Count", value: compliance.stockCountCompletion, suffix: "%", desc: "Audit count completions" },
                        { label: "Expiry Check", value: compliance.expiryCompliance, suffix: "%", desc: "Lot compliance index" },
                        { label: "Revenue Accuracy", value: compliance.revenueCompliance, suffix: "%", desc: "POS order sync accuracy" }
                      ].map((item, idx) => (
                        <div key={idx} className="border rounded-xl p-4 bg-muted/20 text-center flex flex-col justify-between">
                          <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
                          <span className="text-2xl font-bold font-mono my-2 text-primary">{Number(item.value).toFixed(1)}{item.suffix}</span>
                          <span className="text-[10px] text-muted-foreground leading-snug">{item.desc}</span>
                        </div>
                      ))}

                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No compliance scorecard generated for this period yet.</div>
              )}
            </div>
          ) : (
            /* Tab 2: Royalty Fees */
            <div className="space-y-6">
              <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary">Calculate Franchise Monthly Royalty</h3>
                  <p className="text-xs text-muted-foreground mt-1">Trigger royalty calculation based on the branch configuration fee (percentage, fixed or hybrid).</p>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={handleCalculateRoyalty}
                  disabled={calculateRoyaltyMut.isPending}
                >
                  {calculateRoyaltyMut.isPending ? "Calculating..." : "Auto-calculate Royalty"}
                </button>
              </div>

              {/* Royalty List */}
              <div className="bg-card border rounded-xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-base font-bold text-primary mb-4 border-b pb-2">Royalty Ledger</h3>
                {loadingRoyalties ? (
                  <div className="text-center py-12 text-muted-foreground">Loading royalties...</div>
                ) : royalties.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No royalty records calculations generated yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Month</th>
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">POS Revenue</th>
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Fee Model</th>
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Royalty Rate</th>
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Royalty Owed</th>
                          <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono text-xs">
                        {royalties.map(r => (
                          <tr key={r.id} className="hover:bg-muted/15">
                            <td className="p-3 font-semibold">{r.month}</td>
                            <td className="p-3 text-right">฿{Number(r.revenue).toLocaleString()}</td>
                            <td className="p-3 text-xs capitalize font-sans">{r.royaltyType}</td>
                            <td className="p-3 text-right">
                              {r.royaltyType === "percentage" ? `${r.royaltyRate}%` : `฿${Number(r.royaltyRate).toLocaleString()}`}
                            </td>
                            <td className="p-3 text-right font-bold text-primary">
                              ฿{Number(r.calculatedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 font-sans">
                              <span className={`pill font-bold ${r.status === "paid" ? "pill-matcha" : "pill-warning"}`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Please select a franchise branch to review compliance scoring and royalty ledgers.
          </div>
        )}
      </div>
    </div>
  );
};
