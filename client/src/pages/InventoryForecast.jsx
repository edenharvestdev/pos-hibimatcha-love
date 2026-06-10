import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, useToast, Field, StatCard, Modal } from "@/components";
import { IconReceipt, IconRefresh, IconCheck } from "@/icons";

export const PageInventoryForecast = () => {
  const { branch } = useApp();
  const toast = useToast();
  const branchId = branch?.id ?? 1;
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [showPoModal, setShowPoModal] = useState(false);
  const [generatedPoResult, setGeneratedPoResult] = useState(null);

  // Queries
  const { data: forecast = [], isLoading: loadingForecast, refetch } = trpc.enterprise.getInventoryForecast.useQuery({ branchId });
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Mutation
  const generateSuggestedPoMut = trpc.enterprise.generateSuggestedPO.useMutation({
    onSuccess: (data) => {
      setGeneratedPoResult(data);
      toast.push({ type: "success", msg: "Suggested PO generated successfully!" });
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || "Failed to generate suggested PO" });
    }
  });

  const handleGeneratePO = () => {
    if (!selectedSupplierId) {
      toast.push({ type: "error", msg: "Please select a supplier first" });
      return;
    }
    generateSuggestedPoMut.mutate({
      branchId,
      supplierId: Number(selectedSupplierId)
    });
  };

  const criticalCount = forecast.filter(item => item.status === "critical").length;
  const warningCount = forecast.filter(item => item.status === "warning").length;

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar 
        title="Inventory Forecast & PO Suggestion" 
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
              <IconRefresh size={14} /> Refresh Analysis
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setGeneratedPoResult(null);
              setShowPoModal(true);
            }}>
              <IconReceipt size={14} /> Generate Suggested PO
            </button>
          </div>
        }
      />

      {/* Overview StatCards */}
      <div className="px-6 mb-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Critical Low Stock" 
          value={`${criticalCount} items`}
          sub="Depleting before supplier lead time"
          accent={criticalCount > 0}
          glow={criticalCount > 0}
        />
        <StatCard 
          label="Warning Alerts" 
          value={`${warningCount} items`}
          sub="Depleting within next 3 days"
        />
        <StatCard 
          label="Average Consumption Rate" 
          value="Calculated (30D)"
          sub="Derived from daily POS recipe usage"
        />
        <StatCard 
          label="Suggested Reorders" 
          value={`${forecast.filter(item => item.suggestedQty > 0).length} items`}
          sub="Need purchasing soon"
        />
      </div>

      {/* Main Forecast Table */}
      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-base font-bold text-primary mb-4 border-b pb-2">Runout Forecasting Analysis</h2>
          {loadingForecast ? (
            <div className="text-center py-12 text-muted-foreground">Calculating usage speeds and Days Left...</div>
          ) : forecast.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No stock levels found at this branch. Add inventory lots or initial stock values.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">SKU</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Ingredient / Item</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Current Stock</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Avg Daily Usage</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Days Left</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Reorder Date</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Suggested Qty</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forecast.map(item => (
                    <tr key={item.id} className="hover:bg-muted/15">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{item.sku || "—"}</td>
                      <td className="p-3 font-semibold">{item.itemName}</td>
                      <td className="p-3 text-right font-mono text-xs font-semibold">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {Number(item.avgDailyUsage).toFixed(2)} {item.unit}/day
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-bold">
                        <span className={`inline-block px-1.5 py-0.5 rounded ${
                          item.status === "critical" ? "bg-red-100 text-red-800" :
                          item.status === "warning" ? "bg-amber-100 text-amber-800" :
                          "bg-emerald-100 text-emerald-800"
                        }`}>
                          {item.daysLeft} days remaining
                        </span>
                      </td>
                      <td className="p-3 text-xs">{item.suggestedOrderDate}</td>
                      <td className="p-3 text-right font-mono text-xs font-bold text-primary">
                        {item.suggestedQty > 0 ? `${item.suggestedQty} ${item.unit}` : "—"}
                      </td>
                      <td className="p-3 text-xs capitalize">
                        <span className={`pill font-medium ${
                          item.status === "critical" ? "pill-danger" :
                          item.status === "warning" ? "pill-warning" :
                          "pill-matcha"
                        }`}>
                          {item.status}
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

      {/* Modal: Suggested PO Engine */}
      <Modal open={showPoModal} onClose={() => setShowPoModal(false)} title="Generate Suggested PO">
        <div className="space-y-4 pt-2">
          {generatedPoResult ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                <IconCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Purchase Order Created</h3>
                <p className="text-sm font-mono mt-1 font-semibold text-emerald-600">{generatedPoResult.poNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Automatically generated with <strong>{generatedPoResult.itemsCount} items</strong> that were below safety limits.
                </p>
              </div>
              <button className="btn btn-secondary w-full" onClick={() => setShowPoModal(false)}>Close</button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Select a primary supplier. The engine will inspect the forecast statistics for all items linked to this supplier at your branch and automatically create a suggested draft PO for items under safety stock.
              </p>
              <Field label="Select Primary Supplier" required>
                <select 
                  className="input"
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contactName || "B2B"})</option>
                  ))}
                </select>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button className="btn btn-secondary" onClick={() => setShowPoModal(false)}>Cancel</button>
                <button 
                  className="btn btn-primary" 
                  disabled={!selectedSupplierId || generateSuggestedPoMut.isPending}
                  onClick={handleGeneratePO}
                >
                  {generateSuggestedPoMut.isPending ? "Generating..." : "Generate PO"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
