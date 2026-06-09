import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, EmptyState } from "@/components";
import { IconExport } from "@/icons";

export const PagePnLDashboard = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().slice(0, 10), // First day of current month
    to: new Date().toISOString().slice(0, 10),
  });

  const { data: pnl, isLoading } = trpc.reports.getPnL.useQuery({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  const { data: multiBranch } = trpc.reports.getPnLMultiBranch.useQuery({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <TopActionBar title="P&L Dashboard" />

      <div className="p-6 flex-1 overflow-y-auto space-y-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4 bg-card p-4 rounded-xl border">
           <div className="flex items-center gap-2">
             <label className="text-sm font-medium">ตั้งแต่</label>
             <input 
               type="date" 
               className="border rounded px-3 py-1.5 text-sm"
               value={dateRange.from}
               onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))}
             />
           </div>
           <div className="flex items-center gap-2">
             <label className="text-sm font-medium">ถึง</label>
             <input 
               type="date" 
               className="border rounded px-3 py-1.5 text-sm"
               value={dateRange.to}
               onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))}
             />
           </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-xl"></div>
            <div className="h-64 bg-muted rounded-xl"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-card p-5 rounded-xl border shadow-sm">
                 <p className="text-sm text-muted-foreground font-medium">ยอดขาย (Revenue)</p>
                 <h3 className="text-2xl font-bold text-primary mt-1">฿{pnl?.revenue?.toLocaleString()}</h3>
                 <p className="text-xs text-muted-foreground mt-2">{pnl?.orderCount} ออเดอร์</p>
               </div>
               <div className="bg-card p-5 rounded-xl border shadow-sm">
                 <p className="text-sm text-muted-foreground font-medium">ต้นทุนขาย (COGS)</p>
                 <h3 className="text-2xl font-bold text-destructive mt-1">฿{pnl?.cogsCost?.toLocaleString()}</h3>
                 <p className="text-xs text-muted-foreground mt-2">
                   {pnl?.revenue ? Math.round((pnl.cogsCost / pnl.revenue) * 100) : 0}% ของยอดขาย
                 </p>
               </div>
               <div className="bg-card p-5 rounded-xl border shadow-sm">
                 <p className="text-sm text-muted-foreground font-medium">ค่าใช้จ่าย (Expenses)</p>
                 <h3 className="text-2xl font-bold text-destructive mt-1">฿{pnl?.expenseCost?.toLocaleString()}</h3>
               </div>
               <div className="bg-card p-5 rounded-xl border shadow-sm relative overflow-hidden">
                 <div className="absolute inset-0 bg-primary/5"></div>
                 <div className="relative">
                   <p className="text-sm text-primary/80 font-medium">กำไรสุทธิ (Net Profit)</p>
                   <h3 className="text-2xl font-bold text-primary mt-1">฿{pnl?.netProfit?.toLocaleString()}</h3>
                   <div className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">
                     Margin {pnl?.margin}%
                   </div>
                 </div>
               </div>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-4">เปรียบเทียบสาขา</h3>
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 font-semibold">สาขา</th>
                    <th className="p-3 font-semibold text-right">ยอดขาย</th>
                    <th className="p-3 font-semibold text-right">ค่าใช้จ่าย</th>
                    <th className="p-3 font-semibold text-right">ค่า Royalty</th>
                    <th className="p-3 font-semibold text-right">กำไรสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {multiBranch?.map(b => (
                    <tr key={b.branch.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">
                         {b.branch.name}
                         <span className="block text-xs text-muted-foreground">{b.branch.branchCode}</span>
                      </td>
                      <td className="p-3 text-right">฿{b.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-destructive">฿{b.expenses.toLocaleString()}</td>
                      <td className="p-3 text-right text-destructive">฿{b.royalty.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-primary">฿{b.netProfit.toLocaleString()}</td>
                    </tr>
                  ))}
                  {multiBranch?.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
