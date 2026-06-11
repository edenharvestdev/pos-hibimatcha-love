import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Field, useToast, StatCard } from "@/components";
import { IconPlus, IconInfo } from "@/icons";

export const PageWasteManagement = () => {
  const { branch, t } = useApp();
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
      toast.push({ type: "success", msg: t("Waste logged successfully", "บันทึกวัตถุดิบเสียหายเรียบร้อยแล้ว") });
      setQuantity("");
      setNotes("");
      setInventoryItemId("");
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || t("Failed to log waste", "ไม่สามารถบันทึกวัตถุดิบเสียหายได้") });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inventoryItemId || !quantity || Number(quantity) <= 0) {
      toast.push({ type: "error", msg: t("Please fill in all required fields", "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน") });
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
    { value: "expired", label: t("Expired / Expired Lots", "หมดอายุ / ล็อตหมดอายุ"), icon: "⏰" },
    { value: "damaged", label: t("Damaged / Defect", "เสียหาย / ชำรุด"), icon: "📦" },
    { value: "spill", label: t("Spill / Spillages", "หกเลอะเทอะ / รั่วไหล"), icon: "💧" },
    { value: "training", label: t("Staff Training", "ฝึกอบรมพนักงาน"), icon: "🎓" },
    { value: "sampling", label: t("Customer Sampling", "แจกชิม / ทดลองสินค้า"), icon: "🍵" },
    { value: "unknown", label: t("Unknown / Loss", "ไม่ทราบสาเหตุ / สูญหาย"), icon: "❓" }
  ];

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar title={t("Waste Management Dashboard", "จัดการวัตถุดิบเสียหาย")} />

      {/* Metrics Cards */}
      <div className="px-6 mb-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label={t("Total Waste Cost", "มูลค่าความเสียหายรวม")} 
          value={`฿${(Number(metrics?.totalCost ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={t("Accumulated loss this period", "สะสมในรอบนี้")}
          accent
          glow
        />
        <StatCard 
          label={t("Total Waste Quantity", "ปริมาณวัตถุดิบเสียหายรวม")} 
          value={`${Number(metrics?.totalQty ?? 0).toLocaleString()} ${t("units", "หน่วย")}`}
          sub={t("Total volume discarded", "ปริมาณที่ถูกทิ้งทั้งหมด")}
        />
        <StatCard 
          label={t("Recorded Events", "ประวัติการบันทึกเสียหาย")} 
          value={`${wasteRecords.length} ${t("incidents", "รายการ")}`}
          sub={t("Total waste log count", "จำนวนรายการบันทึกทั้งหมด")}
        />
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Record Waste Form */}
        <div className="lg:col-span-1 bg-card rounded-xl border p-6 shadow-sm h-fit">
          <h2 className="text-base font-bold text-primary mb-4 border-b pb-2">{t("Record Ingredient Waste", "บันทึกวัตถุดิบเสียหาย")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <Field label={t("Select Ingredient / Item", "เลือกวัตถุดิบ / รายการ")} required>
              <select 
                className="input"
                value={inventoryItemId}
                onChange={e => setInventoryItemId(e.target.value)}
              >
                <option value="">{t("Choose item...", "เลือกรายการ...")}</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nameThai || item.name} ({item.sku || "No SKU"})
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("Waste Category", "ประเภทความเสียหาย")} required>
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
              <Field label={t("Quantity", "จำนวน")} required>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1.5"
                  className="input"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
              </Field>
              <Field label={t("Unit", "หน่วย")}>
                <input
                  type="text"
                  disabled
                  placeholder={items.find(i => i.id === Number(inventoryItemId))?.unitOfMeasure || t("Units", "หน่วย")}
                  className="input bg-muted"
                />
              </Field>
            </div>

            <Field label={t("Additional Notes", "หมายเหตุเพิ่มเติม")}>
              <textarea
                rows={3}
                placeholder={t("Describe why this item was discarded...", "ระบุเหตุผลที่ทิ้งวัตถุดิบนี้...")}
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
              {recordWasteMut.isPending ? t("Logging...", "กำลังบันทึก...") : t("Log Waste Record", "บันทึกวัตถุดิบเสียหาย")}
            </button>
          </form>
        </div>

        {/* Waste Log List */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm flex flex-col min-h-[400px]">
          <h2 className="text-base font-bold text-primary mb-4 border-b pb-2">{t("Recent Waste Events", "ประวัติการบันทึกวัตถุดิบเสียหายล่าสุด")}</h2>
          {loadingRecords ? (
            <div className="text-center py-12 text-muted-foreground flex-1 flex items-center justify-center">{t("Loading waste logs...", "กำลังโหลดประวัติวัตถุดิบเสียหาย...")}</div>
          ) : wasteRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col justify-center items-center">
              <p className="font-semibold">{t("No waste logged yet", "ยังไม่มีข้อมูลวัตถุดิบเสียหาย")}</p>
              <p className="text-xs mt-1">{t("Excellent! No ingredients have been reported as wasted.", "ยอดเยี่ยม! ยังไม่มีการรายงานวัตถุดิบเสียหาย")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">{t("Time", "เวลา")}</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">{t("Ingredient", "วัตถุดิบ")}</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">{t("Category", "ประเภท")}</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">{t("Quantity", "จำนวน")}</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase text-right">{t("Total Cost", "ต้นทุนรวม")}</th>
                    <th className="p-3 font-semibold text-muted-foreground text-xs uppercase">{t("Notes", "หมายเหตุ")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wasteRecords.map(rec => {
                    const item = items.find(i => i.id === rec.inventoryItemId);
                    const formattedTime = rec.createdAt ? new Date(rec.createdAt).toLocaleString("en-GB") : "—";
                    const catDisplay = 
                      rec.category === "expired" ? t("Expired", "หมดอายุ") :
                      rec.category === "damaged" ? t("Damaged", "ชำรุดเสียหาย") :
                      rec.category === "spill" ? t("Spill", "หกเลอะเทอะ") :
                      rec.category === "training" ? t("Training", "ฝึกอบรม") :
                      rec.category === "sampling" ? t("Sampling", "ชิมสินค้า") :
                      t("Unknown", "ไม่ทราบสาเหตุ");
                    return (
                      <tr key={rec.id} className="hover:bg-muted/15">
                        <td className="p-3 text-xs tabular font-medium">{formattedTime}</td>
                        <td className="p-3 font-semibold">
                          {item?.nameThai || item?.name || `Item ID: ${rec.inventoryItemId}`}
                        </td>
                        <td className="p-3 text-xs">
                          <span className={`pill ${
                            rec.category === "expired" ? "pill-gold" :
                            rec.category === "damaged" ? "pill-danger" :
                            rec.category === "spill" ? "pill-info" :
                            rec.category === "training" ? "pill-matcha" :
                            rec.category === "sampling" ? "pill-matcha" :
                            ""
                          }`}>
                            {catDisplay}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-xs font-semibold">
                          {rec.quantity} {item?.unitOfMeasure || t("Units", "หน่วย")}
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
