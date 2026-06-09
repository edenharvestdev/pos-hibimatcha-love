// ============================================
// Distribute Center — HQ control panel
// ============================================
// Single page where HBCN-03 (or any super admin) can:
//   • Send menu items to branches
//   • Transfer stock to branches
//   • Push SOPs to branches
// Reachable from sidebar (super_admin only) and from quick-action chips
// on Menu / Inventory / SOP pages.

import React, { useState, useMemo } from "react";
import {
  IconBox, IconBookmark, IconBrand, IconCart, IconCheck, IconShare,
  IconTruck, IconWhisk,
} from "@/icons";
import { useApp, SectionHeader } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { DistributeDrawer } from "@/components/DistributeDrawer";

export const PageDistribute = () => {
  const { navigate } = useApp();
  const session = getSession();
  const isSuper = session?.role === "super_admin";

  const [mode, setMode] = useState(null); // 'menu_items' | 'stock_items' | 'sops' | null

  // Pull entity counts for the cards
  const { data: menu = [], isLoading: menuLoading } = trpc.menu.list.useQuery({});
  const { data: stock = [], isLoading: stockLoading } = trpc.inventory.listStock.useQuery(
    { branchId: 0 }, // 0 means "use HQ" — server handles it
    { staleTime: 5000, refetchOnWindowFocus: true }
  );
  const { data: sops = [] } = trpc.sop.list.useQuery({ status: "published" });
  const { data: branches = [], isLoading: branchLoading } = trpc.branches.list.useQuery({});
  const isLoading = menuLoading || stockLoading || branchLoading;

  const hq = branches.find((b) => b.branchType === "hq");
  const targets = branches.filter((b) => b.branchType !== "hq" && b.status === "active");

  if (!isSuper) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Distribute Center</h1>
        </div>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div className="muted">
            ⚠ Only the Super Admin (Hibi House HQ) can access the Distribute Center.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Distribute Center</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map((i) => <div key={i} className="card" style={{ height: 160, background: 'var(--bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
        </div>
      </div>
    );
  }

  // Entity options for the picker (when mode is chosen)
  const pickerEntities = useMemo(() => {
    if (mode === "menu_items") return menu.map((m) => ({ id: m.id, name: m.name, sub: `${m.sku || ""} · ฿${m.basePrice}` }));
    if (mode === "stock_items") return stock.map((s) => ({
      id: s.item?.id ?? s.itemId,
      name: s.item?.name ?? `Item #${s.itemId}`,
      sub: `${s.item?.sku || ""} · HQ stock: ${s.currentStock} ${s.item?.unitOfMeasure || ""}`,
    }));
    if (mode === "sops") return sops.map((s) => ({ id: s.id, name: s.title, sub: s.subtitle || "" }));
    return [];
  }, [mode, menu, stock, sops]);

  const cards = [
    {
      key: "menu_items",
      icon: IconWhisk,
      title: "Menu",
      titleThai: "เมนู",
      desc: "Send menu items to selected branches",
      stat: `${menu.length} items at HQ`,
      color: "var(--matcha-600)",
      bg: "var(--matcha-50)",
    },
    {
      key: "stock_items",
      icon: IconBox,
      title: "Stock",
      titleThai: "สต๊อก",
      desc: "Transfer inventory from HQ to branches",
      stat: `${stock.length} item types in HQ stock`,
      color: "var(--info)",
      bg: "rgba(2,132,199,0.08)",
    },
    {
      key: "sops",
      icon: IconBookmark,
      title: "SOPs",
      titleThai: "คู่มือ",
      desc: "Push SOPs as required reading to branches",
      stat: `${sops.length} published SOPs`,
      color: "var(--gold)",
      bg: "rgba(234,179,8,0.08)",
    },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">Administration / Distribute Center</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Distribute Center</h1>
            <p className="page-desc">
              <span className="jp" style={{ color: "var(--matcha-700)" }}>配布センター</span> · {hq?.name || "Hibi House HQ"} → {targets.length} branch(es)
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center" }}>
            <span className="pill pill-matcha"><span className="dot"/> Connected to {targets.length} branches</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, background: "linear-gradient(135deg, var(--matcha-50), var(--bg-surface) 70%)" }}>
        <SectionHeader
          title="What would you like to distribute today?"
          desc="Pick one type below. You'll then choose which items to send and which branches to send them to."
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {cards.map((c) => {
          const I = c.icon;
          return (
            <button
              key={c.key}
              onClick={() => setMode(c.key)}
              className="card"
              style={{
                padding: 24, textAlign: "left", cursor: "pointer",
                transition: "transform 200ms, box-shadow 200ms",
                border: "1.5px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md), var(--glow-soft)";
                e.currentTarget.style.borderColor = c.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "var(--shadow-xs)";
                e.currentTarget.style.borderColor = "transparent";
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: c.bg, color: c.color,
                display: "grid", placeItems: "center", marginBottom: 16,
              }}>
                <I size={28}/>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{c.title}</span>
                <span className="muted" style={{ fontSize: 14 }}>{c.titleThai}</span>
              </div>
              <div className="muted" style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>{c.desc}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="tabular" style={{ fontSize: 12, color: c.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {c.stat}
                </div>
                <div className="btn btn-primary btn-sm" style={{ pointerEvents: "none" }}>
                  <IconShare size={14}/> Distribute
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent activity / branch overview */}
      <div className="card" style={{ padding: 24 }}>
        <SectionHeader title="Target branches" desc="Distribution destinations"/>
        {targets.length === 0 ? (
          <div className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
            No active branches besides HQ. Add a branch under Franchise → All Branches.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {targets.map((b) => (
              <div key={b.id} style={{
                padding: 16, border: "1px solid var(--border-default)",
                borderRadius: "var(--r-default)", background: "var(--bg-surface)",
              }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{b.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {b.branchCode} · {b.province || b.district || "—"}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <span className={"pill " + (b.status === "active" ? "pill-matcha" : "")} style={{ fontSize: 10, height: 18 }}>{b.status}</span>
                  <span className="pill" style={{ fontSize: 10, height: 18 }}>{b.branchType}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Distribute drawer — opens after picking a card */}
      <DistributeDrawer
        open={!!mode}
        onClose={() => setMode(null)}
        entityType={mode || "menu_items"}
        pickerEntities={pickerEntities}
        onDone={() => setMode(null)}
      />
    </div>
  );
};
