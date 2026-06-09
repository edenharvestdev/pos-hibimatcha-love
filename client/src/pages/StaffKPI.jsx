import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Avatar } from "@/components";

export const PageStaffKPI = () => {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const { data: kpiData, isLoading } = trpc.reports.getStaffKpi.useQuery({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <TopActionBar title="Staff KPI & Commission" />

      <div className="p-6 flex-1 overflow-y-auto space-y-6 max-w-5xl mx-auto w-full">
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
          <div className="animate-pulse h-64 bg-muted rounded-xl"></div>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 font-semibold">พนักงาน</th>
                  <th className="p-4 font-semibold text-right">จำนวนออเดอร์</th>
                  <th className="p-4 font-semibold text-right">ยอดขายรวม</th>
                  <th className="p-4 font-semibold text-right">ยอดต่อบิล (Avg Ticket)</th>
                  <th className="p-4 font-semibold text-right text-primary">ค่าคอมมิชชั่น</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {kpiData?.map((row, idx) => (
                  <tr key={row.staffId} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {idx + 1}
                         </div>
                         <Avatar src={row.staff?.avatar} fallback={row.staff?.firstName?.charAt(0) || "U"} size="md" />
                         <div>
                           <p className="font-medium">{row.staff?.firstNameThai || row.staff?.firstName} {row.staff?.lastNameThai || row.staff?.lastName}</p>
                           <p className="text-xs text-muted-foreground">{row.staff?.employeeCode}</p>
                         </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">{row.orders}</td>
                    <td className="p-4 text-right font-medium">฿{row.revenue.toLocaleString()}</td>
                    <td className="p-4 text-right text-muted-foreground">฿{row.avgTicket.toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-primary bg-primary/5">฿{row.commission.toLocaleString()}</td>
                  </tr>
                ))}
                {kpiData?.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูลการขายในช่วงเวลานี้</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
