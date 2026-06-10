import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Drawer, Select } from "@/components";
import { IconSearch, IconX, IconInfo } from "@/icons";

export const PageAuditLogCenter = () => {
  const [filters, setFilters] = useState({
    branchId: "",
    action: "",
    entity: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selectedLog, setSelectedLog] = useState(null);

  // Queries
  const { data: branches = [] } = trpc.branches.listPublic.useQuery();
  const { data: auditData, isLoading } = trpc.enterprise.getAuditLogs.useQuery({
    branchId: filters.branchId ? Number(filters.branchId) : undefined,
    action: filters.action || undefined,
    entity: filters.entity || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    limit: 100,
  });

  const logs = auditData?.logs ?? [];

  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "payment", label: "Payment" },
    { value: "refund_requested", label: "Refund Requested" },
    { value: "refund_approved", label: "Refund Approved" },
    { value: "void_order", label: "Void Order" },
    { value: "adjusted", label: "Stock Adjustment" },
    { value: "waste_recorded", label: "Waste Recorded" },
    { value: "sop_published", label: "SOP Publish" },
    { value: "recipe_update", label: "Recipe Change" },
    { value: "permission_update", label: "User Permission Change" },
  ];

  const entityTypes = [
    { value: "", label: "All Entities" },
    { value: "staff", label: "Staff" },
    { value: "pos_orders", label: "POS Orders" },
    { value: "pos_refunds", label: "POS Refunds" },
    { value: "pos_waste_records", label: "Waste Records" },
    { value: "pos_recipe_ingredients", label: "Recipes" },
    { value: "sop_documents", label: "SOP Documents" },
    { value: "pos_branch_inventory_stock", label: "Inventory Stock" },
  ];

  // Action badge style generator
  const getActionBadge = (action) => {
    let color = "bg-stone-100 text-stone-700";
    if (action.includes("login")) color = "bg-emerald-50 text-emerald-700 border-emerald-100";
    else if (action.includes("logout")) color = "bg-stone-100 text-stone-600 border-stone-200";
    else if (action.includes("void") || action.includes("reject")) color = "bg-rose-50 text-rose-700 border-rose-100";
    else if (action.includes("refund")) color = "bg-amber-50 text-amber-700 border-amber-100";
    else if (action.includes("adjust") || action.includes("waste")) color = "bg-indigo-50 text-indigo-700 border-indigo-100";
    else if (action.includes("create") || action.includes("publish")) color = "bg-teal-50 text-teal-700 border-teal-100";

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>
        {action.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar title="Audit Log Center" />

      {/* Filter panel */}
      <div className="px-6 mb-4 max-w-7xl mx-auto w-full">
        <div className="bg-card p-4 rounded-xl border shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Branch</label>
            <select 
              className="input text-xs" 
              value={filters.branchId} 
              onChange={e => setFilters(prev => ({...prev, branchId: e.target.value}))}
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Action Type</label>
            <select 
              className="input text-xs" 
              value={filters.action} 
              onChange={e => setFilters(prev => ({...prev, action: e.target.value}))}
            >
              {actionTypes.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Target Area</label>
            <select 
              className="input text-xs" 
              value={filters.entity} 
              onChange={e => setFilters(prev => ({...prev, entity: e.target.value}))}
            >
              {entityTypes.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From Date</label>
            <input 
              type="date" 
              className="input text-xs" 
              value={filters.dateFrom} 
              onChange={e => setFilters(prev => ({...prev, dateFrom: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To Date</label>
            <input 
              type="date" 
              className="input text-xs" 
              value={filters.dateTo} 
              onChange={e => setFilters(prev => ({...prev, dateTo: e.target.value}))}
            />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading system event trail...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-base font-semibold">No audit logs found</p>
              <p className="text-xs mt-1">Try adjusting the filter options to view other periods or actions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Time</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Actor</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Action</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Target Entity</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Branch</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">IP/Device</th>
                    <th className="p-4 font-semibold text-muted-foreground text-xs uppercase text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => {
                    const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleString("en-GB") : "—";
                    const actorName = log.actorName || `User ID: ${log.actorId}`;
                    const targetName = log.entity ? `${log.entity} #${log.entityId || ""}` : "—";
                    
                    return (
                      <tr 
                        key={log.id} 
                        className="hover:bg-muted/15 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="p-4 font-medium text-xs tabular">{timeStr}</td>
                        <td className="p-4">
                          <span className="font-semibold">{actorName}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">{log.actorType}</span>
                        </td>
                        <td className="p-4">{getActionBadge(log.action || "")}</td>
                        <td className="p-4 font-mono text-xs">{targetName}</td>
                        <td className="p-4 text-xs font-medium">Branch ID: {log.branchId ?? "HQ"}</td>
                        <td className="p-4 text-xs text-muted-foreground font-mono">
                          {log.ipAddress || "—"}
                          <span className="block text-[10px] truncate max-w-[140px]" title={log.userAgent || ""}>
                            {log.userAgent || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="text-primary hover:bg-primary/5 p-1 rounded">
                            <IconInfo size={16} />
                          </button>
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

      {/* Drawer: Detailed JSON Diff Viewer */}
      <Drawer
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Details"
        subtitle={`Log ID: #${selectedLog?.id}`}
        width={640}
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Actor</span>
                <span className="text-sm font-semibold">{selectedLog.actorName || `ID: ${selectedLog.actorId}`} ({selectedLog.actorType})</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Action Event</span>
                <span className="text-sm">{getActionBadge(selectedLog.action || "")}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Target Entity</span>
                <span className="text-sm font-mono">{selectedLog.entity} #{selectedLog.entityId}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Timestamp</span>
                <span className="text-sm">{selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString("en-GB") : "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Source IP Address</span>
                <span className="text-sm font-mono">{selectedLog.ipAddress || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold">Client Device</span>
                <span className="text-xs truncate block" title={selectedLog.userAgent || ""}>{selectedLog.userAgent || "—"}</span>
              </div>
            </div>

            {selectedLog.details && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Event Notes</h4>
                <div className="bg-card p-3 rounded border text-sm font-mono text-primary bg-primary/5 border-primary/10">
                  {typeof selectedLog.details === "string" ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                </div>
              </div>
            )}

            {/* Before / After States */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data State Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs font-medium text-rose-600 mb-1">State Before (Old)</span>
                  <div className="bg-stone-900 text-stone-200 text-xs font-mono p-4 rounded-lg overflow-x-auto max-h-[300px] border border-stone-800">
                    {selectedLog.beforeData ? (
                      <pre>{JSON.stringify(typeof selectedLog.beforeData === "string" ? JSON.parse(selectedLog.beforeData) : selectedLog.beforeData, null, 2)}</pre>
                    ) : (
                      <span className="text-stone-500 italic">No historical state</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-emerald-600 mb-1">State After (New)</span>
                  <div className="bg-stone-900 text-stone-200 text-xs font-mono p-4 rounded-lg overflow-x-auto max-h-[300px] border border-stone-800">
                    {selectedLog.afterData ? (
                      <pre>{JSON.stringify(typeof selectedLog.afterData === "string" ? JSON.parse(selectedLog.afterData) : selectedLog.afterData, null, 2)}</pre>
                    ) : (
                      <span className="text-stone-500 italic">No modifications / Empty state</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
