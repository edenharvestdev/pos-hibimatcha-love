import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, TopActionBar, Drawer, Tabs, StatCard } from "@/components";
import { IconSearch, IconUser, IconDiscount, IconBook, IconCheck } from "@/icons";

export const PageCustomers = ({ defaultTab = "directory" }) => {
  const { navigate, route } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState(null);

  // Sync state with prop if route changes
  useEffect(() => {
    if (route.includes("/segments")) {
      setActiveTab("segments");
    } else {
      setActiveTab("directory");
    }
  }, [route]);

  const handleTabChange = (val) => {
    setActiveTab(val);
    if (val === "segments") {
      navigate("/backoffice/customers/segments");
    } else {
      navigate("/backoffice/customers");
    }
  };

  // Queries
  const { data: customers = [], isLoading } = trpc.enterprise.listCustomers.useQuery({
    search: searchQuery || undefined
  });

  const getTierColor = (tier) => {
    if (tier === "VIP") return "bg-purple-100 text-purple-800 border-purple-200";
    if (tier === "Gold") return "bg-amber-100 text-amber-800 border-amber-200";
    if (tier === "Silver") return "bg-gray-100 text-gray-800 border-gray-200";
    return "bg-amber-50 text-amber-700 border-amber-100"; // Bronze
  };

  const getSegmentBadge = (seg) => {
    if (seg === "VIP") return "bg-purple-100 text-purple-700 font-semibold";
    if (seg === "Franchise Partner") return "bg-emerald-100 text-emerald-700 font-semibold";
    if (seg === "High Value") return "bg-blue-100 text-blue-700";
    if (seg === "Active") return "bg-teal-100 text-teal-700";
    if (seg === "Inactive") return "bg-stone-100 text-stone-600";
    return "bg-sky-100 text-sky-700"; // New
  };

  // Segmentation Stats
  const segments = [
    { name: "New", desc: "No purchase history or newly registered", color: "border-sky-200 bg-sky-50/20" },
    { name: "Active", desc: "Frequent visitors with > 5 completed orders", color: "border-teal-200 bg-teal-50/20" },
    { name: "VIP", desc: "Premium tier customers with > ฿10,000 spend", color: "border-purple-200 bg-purple-50/20" },
    { name: "High Value", desc: "High basket spenders with > ฿3,000 spend", color: "border-blue-200 bg-blue-50/20" },
    { name: "Inactive", desc: "Registered customers with zero completed orders", color: "border-stone-200 bg-stone-50/20" },
    { name: "Franchise Partner", desc: "B2B Franchise owners & corporate clients", color: "border-emerald-200 bg-emerald-50/20" }
  ];

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar 
        title="Customer CRM" 
        search={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="px-6 mb-4 max-w-7xl mx-auto w-full">
        <Tabs 
          items={[
            { value: "directory", label: "Customer 360 Directory" },
            { value: "segments", label: "Customer Tiers & Segments" }
          ]}
          value={activeTab}
          onChange={handleTabChange}
        />
      </div>

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {activeTab === "directory" ? (
          /* Tab 1: Customer Directory */
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading CRM records...</div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No customer records found matching search query.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Name</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Phone</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Email</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Tier</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase">Segment</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase text-right">Loyalty Points</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase text-right">Total Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((c) => (
                      <tr 
                        key={c.id} 
                        className="hover:bg-muted/15 cursor-pointer"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <td className="p-4 font-semibold text-primary">
                          {c.firstName} {c.lastName}
                        </td>
                        <td className="p-4 font-mono text-xs">{c.phone || "—"}</td>
                        <td className="p-4 text-xs">{c.email || "—"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs border font-medium ${getTierColor(c.membershipTier)}`}>
                            {c.membershipTier}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSegmentBadge(c.segment)}`}>
                            {c.segment}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-emerald-600">{Number(c.points || 0).toLocaleString()} pts</td>
                        <td className="p-4 text-right font-mono font-bold">฿{Number(c.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Segments Dashboard */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {segments.map((seg) => {
                const count = customers.filter(c => c.segment === seg.name).length;
                return (
                  <div 
                    key={seg.name}
                    onClick={() => setSelectedSegmentFilter(seg.name)}
                    className={`border rounded-xl p-5 shadow-sm cursor-pointer transition-all ${seg.color} ${
                      selectedSegmentFilter === seg.name 
                        ? "ring-2 ring-primary border-primary scale-[1.02]" 
                        : "hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getSegmentBadge(seg.name)}`}>
                        {seg.name}
                      </span>
                      <span className="text-2xl font-bold font-mono">{count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{seg.desc}</p>
                  </div>
                );
              })}
            </div>

            {selectedSegmentFilter && (
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                  <h3 className="text-base font-bold text-primary">Customers in "{selectedSegmentFilter}" Segment</h3>
                  <button className="text-xs text-muted-foreground hover:text-primary" onClick={() => setSelectedSegmentFilter(null)}>
                    Clear Filter
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-muted/40 text-xs text-muted-foreground border-b">
                        <th className="p-3">Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Tier</th>
                        <th className="p-3 text-right">Points</th>
                        <th className="p-3 text-right">Total Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customers.filter(c => c.segment === selectedSegmentFilter).map(c => (
                        <tr key={c.id} className="hover:bg-muted/10 cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                          <td className="p-3 font-semibold">{c.firstName} {c.lastName}</td>
                          <td className="p-3 font-mono text-xs">{c.phone}</td>
                          <td className="p-3 text-xs">{c.membershipTier}</td>
                          <td className="p-3 text-right font-mono">{c.points} pts</td>
                          <td className="p-3 text-right font-mono font-bold">฿{Number(c.totalSpend || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {customers.filter(c => c.segment === selectedSegmentFilter).length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No customers currently fall under this segment.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer 360 Slide-Out Profile */}
      <Drawer
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer 360° Profile"
        subtitle={`Member Account #${selectedCustomer?.id}`}
        width={540}
      >
        {selectedCustomer && (
          <div className="space-y-6">
            
            {/* Membership card mock */}
            <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-emerald-200 uppercase font-bold tracking-widest">Hibi Member Card</span>
                  <h3 className="text-xl font-bold mt-1">{selectedCustomer.firstName} {selectedCustomer.lastName}</h3>
                </div>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                  {selectedCustomer.membershipTier} Tier
                </span>
              </div>
              <div className="mt-8 flex justify-between items-end">
                <div>
                  <span className="text-[9px] text-emerald-200 block uppercase">Phone Number</span>
                  <span className="text-sm font-mono tracking-wider">{selectedCustomer.phone || "—"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-emerald-200 block uppercase">Total Balance</span>
                  <span className="text-base font-bold font-mono">{selectedCustomer.points} Points</span>
                </div>
              </div>
            </div>

            {/* Profile Overview Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 bg-muted/20 text-center">
                <span className="text-xs text-muted-foreground uppercase block font-medium">Total Spend</span>
                <span className="text-xl font-bold text-primary mt-1 block font-mono">฿{Number(selectedCustomer.totalSpend).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border rounded-xl p-4 bg-muted/20 text-center">
                <span className="text-xs text-muted-foreground uppercase block font-medium">Completed Visits</span>
                <span className="text-xl font-bold text-primary mt-1 block font-mono">{selectedCustomer.orderCount} orders</span>
              </div>
            </div>

            {/* Details & Segments */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Demographics & Tags</h4>
              <div className="border rounded-xl p-4 space-y-3 bg-card text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email Address:</span>
                  <span className="font-medium">{selectedCustomer.email || "No Email linked"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dynamic Segment:</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getSegmentBadge(selectedCustomer.segment)}`}>
                    {selectedCustomer.segment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vouchers / Coupons:</span>
                  <span className="font-medium text-emerald-600">3 Active Coupons</span>
                </div>
              </div>
            </div>

            {/* Favorites */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Favorite Beverages</h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedCustomer.favoriteProducts?.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 border p-2.5 rounded-lg bg-card">
                    <span className="text-lg">🍵</span>
                    <span className="text-xs font-medium">{p}</span>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
        )}
      </Drawer>
    </div>
  );
};
