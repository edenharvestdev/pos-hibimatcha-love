import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Tabs, useToast, StatCard, Field, Modal } from "@/components";
import { IconPlus, IconExport, IconImport, IconCheck } from "@/icons";

export const PageAccounting = ({ defaultTab = "cashflow" }) => {
  const { navigate, route, branch } = useApp();
  const toast = useToast();
  const utils = trpc.useUtils();
  const branchId = branch?.id ?? 1;
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Date filter for Cash Flow
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().slice(0, 10), // First day of current month
    to: new Date().toISOString().slice(0, 10)
  });

  // Modal form for AR invoice creation
  const [showAddArModal, setShowAddArModal] = useState(false);
  const [newArInvoice, setNewArInvoice] = useState({
    customerId: "",
    customerType: "corporate",
    invoiceNumber: "",
    amount: "",
    dueDate: new Date().toISOString().slice(0, 10)
  });

  // Sync tab with path
  useEffect(() => {
    if (route.includes("/ap")) {
      setActiveTab("ap");
    } else if (route.includes("/ar")) {
      setActiveTab("ar");
    } else {
      setActiveTab("cashflow");
    }
  }, [route]);

  const handleTabChange = (val) => {
    setActiveTab(val);
    if (val === "ap") navigate("/backoffice/accounting/ap");
    else if (val === "ar") navigate("/backoffice/accounting/ar");
    else navigate("/backoffice/accounting/cashflow");
  };

  // Queries
  const { data: apBills = [], isLoading: loadingAP } = trpc.enterprise.getAccountsPayable.useQuery();
  const { data: arInvoices = [], isLoading: loadingAR } = trpc.enterprise.getAccountsReceivable.useQuery();
  const { data: cashFlow, isLoading: loadingCash } = trpc.enterprise.getCashFlowStats.useQuery({
    dateFrom: dateRange.from,
    dateTo: dateRange.to
  });

  // Mutation
  const createArMut = trpc.enterprise.createAccountsReceivable.useMutation({
    onSuccess: () => {
      utils.enterprise.getAccountsReceivable.invalidate();
      toast.push({ type: "success", msg: "AR Invoice created successfully" });
      setShowAddArModal(false);
      setNewArInvoice({
        customerId: "",
        customerType: "corporate",
        invoiceNumber: "",
        amount: "",
        dueDate: new Date().toISOString().slice(0, 10)
      });
    },
    onError: (err) => {
      toast.push({ type: "error", msg: err.message || "Failed to create invoice" });
    }
  });

  const handleCreateArInvoice = () => {
    if (!newArInvoice.customerId || !newArInvoice.invoiceNumber || !newArInvoice.amount) {
      toast.push({ type: "error", msg: "Please fill in all required fields" });
      return;
    }
    createArMut.mutate({
      branchId,
      customerId: Number(newArInvoice.customerId),
      customerType: newArInvoice.customerType,
      invoiceNumber: newArInvoice.invoiceNumber,
      amount: newArInvoice.amount,
      dueDate: newArInvoice.dueDate
    });
  };

  const getStatusBadge = (status) => {
    if (status === "paid") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "overdue") return "bg-red-100 text-red-800 border-red-200";
    if (status === "due_soon") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-stone-100 text-stone-700 border-stone-200"; // Pending
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar 
        title="Accounting & Ledger Control" 
        actions={
          activeTab === "ar" && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddArModal(true)}>
              <IconPlus size={16} /> Create Invoice
            </button>
          )
        }
      />

      <div className="px-6 mb-4 max-w-7xl mx-auto w-full flex items-center justify-between border-b bg-card p-4 rounded-xl border shadow-sm">
        <Tabs 
          items={[
            { value: "cashflow", label: "Cash Flow Forecast" },
            { value: "ap", label: "Accounts Payable (AP)" },
            { value: "ar", label: "Accounts Receivable (AR)" }
          ]}
          value={activeTab}
          onChange={handleTabChange}
          size="sm"
        />

        {activeTab === "cashflow" && (
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="border rounded px-2 py-1 text-xs" 
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))}
            />
            <span className="text-xs font-semibold text-muted-foreground">to</span>
            <input 
              type="date" 
              className="border rounded px-2 py-1 text-xs" 
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))}
            />
          </div>
        )}
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === "cashflow" && (
          /* Tab 1: Cash Flow */
          <div className="space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                label="Cash Inflow (Sales)" 
                value={`฿${(cashFlow?.cashIn ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                sub="Inflow from POS transactions"
                accent
                glow
              />
              <StatCard 
                label="Cash Outflow (Expenses)" 
                value={`฿${(cashFlow?.cashOut ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                sub="Outflow from confirmed expenses"
              />
              <StatCard 
                label="Net Cash Flow" 
                value={`฿${(cashFlow?.netCashFlow ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                sub="Revenue minus expenses"
                accent={Number(cashFlow?.netCashFlow) >= 0}
                glow={Number(cashFlow?.netCashFlow) >= 0}
              />
            </div>

            {/* Custom SVG Trend Graph */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-primary mb-4 border-b pb-2">Daily Net Inflow vs Outflow</h3>
              {loadingCash ? (
                <div className="text-center py-12 text-muted-foreground">Drawing cash trends graph...</div>
              ) : !cashFlow?.trends || cashFlow.trends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No operations recorded during this timeframe.</div>
              ) : (
                <div className="h-64 flex items-end gap-3 justify-center pt-8 border-b border-l pb-2 pl-2">
                  {cashFlow.trends.map((t, idx) => {
                    const max = Math.max(...cashFlow.trends.map(x => Math.max(x.cashIn, x.cashOut))) || 1;
                    const inHeight = (t.cashIn / max) * 160;
                    const outHeight = (t.cashOut / max) * 160;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1 group relative">
                        <div className="flex gap-1 items-end">
                          {/* Green Bar (Inflow) */}
                          <div 
                            style={{ height: `${Math.max(4, inHeight)}px` }} 
                            className="w-4 bg-emerald-500 rounded-t transition-all duration-300"
                            title={`Inflow: ฿${t.cashIn}`}
                          />
                          {/* Red Bar (Outflow) */}
                          <div 
                            style={{ height: `${Math.max(4, outHeight)}px` }} 
                            className="w-4 bg-rose-500 rounded-t transition-all duration-300"
                            title={`Outflow: ฿${t.cashOut}`}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono mt-1 rotate-45 select-none block origin-left whitespace-nowrap">
                          {t.date.slice(5)}
                        </span>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-stone-900 text-stone-100 text-[10px] p-2 rounded shadow opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 w-24">
                          <div>In: ฿{t.cashIn}</div>
                          <div className="text-rose-400">Out: ฿{t.cashOut}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "ap" && (
          /* Tab 2: Accounts Payable */
          <div className="bg-card border rounded-2xl p-6 shadow-sm overflow-hidden">
            <h3 className="text-base font-bold text-primary mb-4 border-b pb-2">Outstanding Supplier Bills</h3>
            {loadingAP ? (
              <div className="text-center py-12 text-muted-foreground">Loading accounts payable...</div>
            ) : apBills.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Excellent! No outstanding supplier balances.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs">
                      <th className="p-3">Supplier Account</th>
                      <th className="p-3 text-right">Total Invoice</th>
                      <th className="p-3 text-right">Paid Amount</th>
                      <th className="p-3 text-right">Outstanding</th>
                      <th className="p-3">Next Due Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono text-xs">
                    {apBills.map(bill => (
                      <tr key={bill.id} className="hover:bg-muted/15">
                        <td className="p-3 font-sans font-semibold text-primary">Supplier #{bill.supplierId}</td>
                        <td className="p-3 text-right">฿{Number(bill.totalAmount).toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-600">฿{Number(bill.paidAmount).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-rose-600">฿{Number(bill.outstandingAmount).toLocaleString()}</td>
                        <td className="p-3 font-sans text-xs">{bill.dueDate}</td>
                        <td className="p-3 font-sans">
                          <span className={`pill font-bold ${getStatusBadge(bill.status)}`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "ar" && (
          /* Tab 3: Accounts Receivable */
          <div className="bg-card border rounded-2xl p-6 shadow-sm overflow-hidden">
            <h3 className="text-base font-bold text-primary mb-4 border-b pb-2">Corporate & Franchise Accounts Receivable</h3>
            {loadingAR ? (
              <div className="text-center py-12 text-muted-foreground">Loading accounts receivable...</div>
            ) : arInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No accounts receivable records active.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs">
                      <th className="p-3">Invoice Number</th>
                      <th className="p-3">Customer Account</th>
                      <th className="p-3">Customer Type</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3 text-right">Outstanding</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono text-xs">
                    {arInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/15">
                        <td className="p-3 font-semibold">{inv.invoiceNumber}</td>
                        <td className="p-3 font-sans">Account #{inv.customerId}</td>
                        <td className="p-3 font-sans capitalize text-xs">{inv.customerType}</td>
                        <td className="p-3 text-right">฿{Number(inv.amount).toLocaleString()}</td>
                        <td className="p-3 text-right text-rose-600 font-bold">฿{Number(inv.outstandingAmount).toLocaleString()}</td>
                        <td className="p-3 font-sans text-xs">{inv.dueDate}</td>
                        <td className="p-3 font-sans">
                          <span className={`pill font-bold ${getStatusBadge(inv.status)}`}>
                            {inv.status}
                          </span>
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

      {/* Modal: Create AR Invoice */}
      <Modal open={showAddArModal} onClose={() => setShowAddArModal(false)} title="Create Accounts Receivable Invoice">
        <div className="space-y-4 pt-2">
          
          <div className="grid grid-cols-2 gap-4">
            <Field label="Customer Type" required>
              <select 
                className="input"
                value={newArInvoice.customerType}
                onChange={e => setNewArInvoice(prev => ({...prev, customerType: e.target.value}))}
              >
                <option value="corporate">Corporate Customer</option>
                <option value="franchise">Franchise Customer</option>
              </select>
            </Field>
            <Field label="Customer / Branch Account ID" required>
              <input 
                type="number"
                placeholder="e.g. 1"
                className="input"
                value={newArInvoice.customerId}
                onChange={e => setNewArInvoice(prev => ({...prev, customerId: e.target.value}))}
              />
            </Field>
          </div>

          <Field label="Invoice Number" required>
            <input 
              type="text"
              placeholder="e.g. AR-2026-0034"
              className="input font-mono"
              value={newArInvoice.invoiceNumber}
              onChange={e => setNewArInvoice(prev => ({...prev, invoiceNumber: e.target.value}))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice Amount" required>
              <input 
                type="number"
                placeholder="e.g. 15000"
                className="input font-mono"
                value={newArInvoice.amount}
                onChange={e => setNewArInvoice(prev => ({...prev, amount: e.target.value}))}
              />
            </Field>
            <Field label="Payment Due Date" required>
              <input 
                type="date"
                className="input"
                value={newArInvoice.dueDate}
                onChange={e => setNewArInvoice(prev => ({...prev, dueDate: e.target.value}))}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setShowAddArModal(false)}>Cancel</button>
            <button 
              className="btn btn-primary"
              disabled={!newArInvoice.customerId || !newArInvoice.invoiceNumber || !newArInvoice.amount || createArMut.isPending}
              onClick={handleCreateArInvoice}
            >
              {createArMut.isPending ? "Creating..." : "Post Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
