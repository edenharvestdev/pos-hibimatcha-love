import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Field, useToast, StatCard } from "@/components";
import { IconPlus, IconInfo } from "@/icons";

export const PageWasteManagement = () => {
  const { branch } = useApp();
  const toast = useToast();
  const utils = trpc.useUtils();
  const branchId = branch?.id ?? 1;

  // Form states
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [category, setCategory] = useState("expired");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Queries
  const { data: items = [] } = trpc.inventory.listItems.useQuery({}, { staleTime: 30000 });
  const { data: wasteRecords = [], isLoading: loadingRecords } = trpc.enterprise.listWasteRecords.useQuery({ branchId });
  const { data: metrics } = trpc.enterprise.getWasteMetrics.useQuery({ branchId });

  // Mutations
  const recordWasteMut = trpc.enterprise.recordWaste.useMutation({
    onSuccess: () => {
      utils.enterprise.listWasteRecords.invalidate({ branchId });
      utils.enterprise.getWasteMetrics.invalidate({ branchId });
      toast.push({ type: "success", msg: "Waste logged successfully" });
      setQuantity("");
      setNotes("");
      setInventoryItemId("");
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || "Failed to log waste" });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inventoryItemId || !quantity || Number(quantity) <= 0) {
      toast.push({ type: "error", msg: "Please fill in all required fields" });
      return;
    }
    recordWasteMut.mutate({
      branchId,
      inventoryItemId: Number(inventoryItemId),
      category: category,
      quantity: quantity,
      notes: notes || undefined
    });
  };

  const categories = [
    { value: "expired", label: "Expired / Expired Lots", icon: "⏰" },
    { value: "damaged", label: "Damaged / Defect", icon: "📦" },
    { value: "spill", label: "Spill / Spillages", icon: "💧" },
    { value: "training", label: "Staff Training", icon: "🎓" },
    { value: "sampling", label: "Customer Sampling", icon: "🍵" },
    { value: "unknown", label: "Unknown / Loss", icon: "❓" }
  ];

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar title="Waste Management Dashboard" />

      {/* Metrics Cards */}
      <div className="px-6 mb-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Waste Cost" 
          value={`฿${(Number(metrics?.totalCost ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Accumulated loss this period"
          accent
          glow
        />
        <StatCard 
          label="Total Waste Quantity" 
          value={`${Number(metrics?.totalQty ?? 0).toLocaleString()} units`}
          sub="Total volume discarded"
        />
        <StatCard 
          label="Recorded Events" 
          value={`${wasteRecords.length} incidents`}
          sub="Total waste log count"
        />
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Record Waste Form */}
        <div className="lg:col-span-1 bg-card rounded-xl border p-6 shadow-sm h-fit">
          <h2 className="text-base font-bold text-primary mb-4 border-b pb-2">Record Ingredient Waste</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <Field label="Select Ingredient / Item" required>
              <select 
                className="input"
                value={inventoryItemId}
                onChange={e => setInventoryItemId(e.target.value)}
              >
                <option value="">Choose item...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nameThai || item.name} ({item.sku || "No SKU"})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Waste Category" required>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                      category === cat.value
                        ? "bg-primary/5 text-primary border-primary font-medium"
                        : "bg-background border-border-default hover:bg-muted/50"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label.split(" / ")[0]}</span>
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Quantity" required>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.5"
                  className="input"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </Field>
              <Field label="Unit">
                <input
                  type="text"
                  disabled
                  placeholder={items.find(i => i.id === Number(inventoryItemId))?.unitOfMeasure || "Units"}
                  className="input bg-muted"
                />
              </Field>
            </div>

            <Field label="Additional Notes">
              <textarea
                rows={3}
                placeholder="Describe why this item was discarded..."
                className="input text-xs"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </Field>

            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={recordWasteMut.isPending}
            >
              {recordWasteMut.isPending ? "Logging..." : "Log Waste Record"}
            </button>
          </form>
        </div>

        {/* Waste Log List */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm flex flex-col min-h-[400px]">
          <h2 className="text-base font-bold text-primary mb-4 border-b pb-2">Recent Waste Events</h2>
          {loadingRecords ? (
            <div className="text-center py-12 text-muted-foreground flex-1 flex items-center justify-center">Loading waste logs...</div>
          ) : wasteRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col justify-center items-center">
              <p className="font-semibold">No waste logged yet</p>
              <p className="text-xs mt-1">Excellent! No ingredients have been reported as wasted.</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Time</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Ingredient</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Category</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Quantity</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">Total Cost</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wasteRecords.map(rec => {
                    const item = items.find(i => i.id === rec.inventoryItemId);
                    const formattedTime = rec.createdAt ? new Date(rec.createdAt).toLocaleString("en-GB") : "—";
                    return (
                      <tr key={rec.id} className="hover:bg-muted/15">
                        <td className="p-3 text-xs tabular font-medium">{formattedTime}</td>
                        <td className="p-3 font-semibold">
                          {item?.nameThai || item?.name || `Item ID: ${rec.inventoryItemId}`}
                        </td>
                        <td className="p-3 text-xs capitalize">
                          <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                            rec.category === "expired" ? "bg-amber-100 text-amber-800" :
                            rec.category === "damaged" ? "bg-red-100 text-red-800" :
                            rec.category === "spill" ? "bg-blue-100 text-blue-800" :
                            rec.category === "training" ? "bg-purple-100 text-purple-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {rec.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-xs font-semibold">
                          {rec.quantity} {item?.unitOfMeasure}
                        </td>
                        <td className="p-3 text-right text-rose-600 font-mono text-xs font-bold">
                          ฿{Number(rec.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground italic truncate max-w-[150px]" title={rec.notes || ""}>
                          {rec.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
