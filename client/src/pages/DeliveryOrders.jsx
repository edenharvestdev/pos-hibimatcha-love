// ============================================
// Delivery Orders — Grab / LINE MAN / Shopee Food / FoodPanda / Robinhood
// ============================================
// Single page that aggregates 3rd-party delivery orders for the current branch.
// Each platform's webhook posts to /api/trpc/delivery.webhook.

import React, { useState, useMemo } from "react";
import {
  IconBowl, IconCake, IconCart, IconCheck, IconChevRight, IconClock,
  IconExport, IconPhone, IconPlus, IconReceipt, IconRefresh, IconTruck,
} from "@/icons";
import { useApp, Drawer, Field, Select, Tabs, TopActionBar, EmptyState, StatCard } from "@/components";
import { trpc } from "@/lib/trpc";
import { getSession } from "@/lib/authStore";
import { downloadCSV, downloadXLSX } from "@/lib/export";

const PLATFORMS = [
  { code: "all",        label: "All",       color: "var(--text-secondary)", bg: "var(--bg-muted)" },
  { code: "grab",       label: "Grab",      color: "#00b14f",                bg: "rgba(0,177,79,0.10)" },
  { code: "lineman",    label: "LINE MAN",  color: "#00c300",                bg: "rgba(0,195,0,0.10)" },
  { code: "shopeefood", label: "ShopeeFood",color: "#ee4d2d",                bg: "rgba(238,77,45,0.10)" },
  { code: "foodpanda",  label: "FoodPanda", color: "#d70f64",                bg: "rgba(215,15,100,0.10)" },
  { code: "robinhood",  label: "Robinhood", color: "#7a2c8e",                bg: "rgba(122,44,142,0.10)" },
];

export const PageDeliveryOrders = () => {
  const { navigate, branch } = useApp();
  const session = getSession();
  const branchId = branch?.id || session?.currentBranchId;

  const [platform, setPlatform] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [openOrderId, setOpenOrderId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = trpc.delivery.listDeliveryOrders.useQuery(
    {
      branchId,
      platform: platform === "all" ? undefined : platform,
      status: statusFilter || undefined,
      limit: 100,
    },
    { enabled: !!branchId, refetchInterval: 15000 }
  );

  const { data: summary = [] } = trpc.delivery.platformSummary.useQuery(
    { branchId, dateFrom: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) },
    { enabled: !!branchId, staleTime: 5000, refetchOnWindowFocus: true }
  );

  const summaryMap = useMemo(() => {
    const m = {};
    summary.forEach((s) => { m[s.platform] = s; });
    return m;
  }, [summary]);

  const totalToday = orders.filter((o) => {
    if (!o.createdAt) return false;
    const t = new Date(o.createdAt).toDateString();
    return t === new Date().toDateString();
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">POS / Delivery Orders</div>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Delivery Orders</h1>
            <p className="page-desc">
              3rd-party platforms · {orders.length} active · {totalToday.length} today
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()} title="Refresh now">
              <IconRefresh size={14}/> Refresh
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const rows = orders.map((o) => ({
                orderNumber: o.orderNumber,
                platform: o.deliveryPlatform,
                externalId: o.externalOrderId,
                customer: o.customerName,
                status: o.status,
                total: o.totalAmount,
                fee: o.deliveryFee,
                payout: o.platformPayout,
                createdAt: o.createdAt,
              }));
              downloadCSV(`delivery-${new Date().toISOString().slice(0,10)}`, rows);
            }}><IconExport size={14}/> CSV</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <IconPlus size={14}/> Manual Order
            </button>
          </div>
        </div>
      </div>

      {/* Platform stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {PLATFORMS.filter((p) => p.code !== "all").map((p) => {
          const s = summaryMap[p.code] || { orders: 0, gross: 0, payout: 0 };
          return (
            <div
              key={p.code}
              onClick={() => setPlatform(p.code === platform ? "all" : p.code)}
              className="card"
              style={{
                padding: 16, cursor: "pointer",
                border: "1.5px solid " + (platform === p.code ? p.color : "var(--border-default)"),
                transition: "all 200ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: p.bg, color: p.color,
                  display: "grid", placeItems: "center", fontWeight: 700,
                }}>{p.label[0]}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600 }} className="tabular">
                {s.orders.toLocaleString()}
              </div>
              <div className="muted" style={{ fontSize: 11 }}>orders / 30d</div>
              <div className="tabular" style={{ fontSize: 12, marginTop: 4, color: p.color, fontWeight: 500 }}>
                ฿{Math.round(s.payout).toLocaleString()} <span className="muted" style={{ fontWeight: 400 }}>payout</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform filter tabs */}
      <div style={{ marginBottom: 12 }}>
        <Tabs items={PLATFORMS.map((p) => ({ value: p.code, label: p.label }))} value={platform} onChange={setPlatform}/>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="muted" style={{ padding: 40, textAlign: "center" }}>Loading orders…</div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<IconTruck size={48}/>}
          title={`No ${platform === "all" ? "" : PLATFORMS.find((p) => p.code === platform)?.label + " "}delivery orders`}
          desc="Orders from 3rd-party platforms will appear here automatically when their webhooks are configured. You can also add manual orders."
          action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><IconPlus size={16}/> Add Manual Order</button>}
        />
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg-muted)" }}>
                {["Order", "Platform", "Customer", "Status", "Total", "Payout", "Created", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 500, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const p = PLATFORMS.find((x) => x.code === o.deliveryPlatform) || PLATFORMS[0];
                return (
                  <tr
                    key={o.id}
                    onClick={() => setOpenOrderId(o.id)}
                    style={{ borderTop: "1px solid var(--border-default)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-muted)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div className="mono" style={{ fontWeight: 500 }}>{o.orderNumber}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{o.externalOrderId}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: p.bg, color: p.color, padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{p.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13 }}>{o.customerName || "—"}</div>
                      {o.customerPhone && <div className="muted" style={{ fontSize: 11 }}>{o.customerPhone}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={"pill " + (o.status === "completed" ? "pill-matcha" : o.status === "cancelled" ? "pill-warning" : "pill-gold")} style={{ fontSize: 11 }}>
                        <span className="dot"/> {o.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }} className="tabular">฿{Number(o.totalAmount ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", color: "var(--matcha-700)", fontWeight: 500 }} className="tabular">฿{Number(o.platformPayout ?? 0).toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 12 }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <IconChevRight size={14} style={{ color: "var(--text-tertiary)" }}/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ManualDeliveryDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        branchId={branchId}
        onCreated={() => { setCreateOpen(false); refetch(); }}
      />
      <DeliveryOrderDetail
        orderId={openOrderId}
        onClose={() => setOpenOrderId(null)}
      />
    </div>
  );
};

// ─── Manual order entry ────────────────────────────────────────────────────
const ManualDeliveryDrawer = ({ open, onClose, branchId, onCreated }) => {
  const { data: menu = [] } = trpc.menu.list.useQuery({}, { staleTime: 5000, refetchOnWindowFocus: true, enabled: open });
  const create = trpc.delivery.createManual.useMutation({
    onSuccess: () => onCreated(),
    onError: (e) => alert(e.message || "Create failed"),
  });
  const [platform, setPlatform] = useState("grab");
  const [externalId, setExternalId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [fee, setFee] = useState("0");
  const [items, setItems] = useState([{ menuItemId: "", quantity: 1, unitPrice: "" }]);

  const reset = () => {
    setExternalId(""); setCustomerName(""); setAddress(""); setFee("0");
    setItems([{ menuItemId: "", quantity: 1, unitPrice: "" }]);
  };

  return (
    <Drawer
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="Add Manual Delivery Order"
      subtitle="Use this when a delivery platform doesn't push to webhook automatically"
      width={520}
      footer={<>
        <button className="btn btn-ghost" onClick={() => { onClose(); reset(); }}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={create.isPending || items.filter((i) => i.menuItemId && i.unitPrice).length === 0}
          onClick={() => create.mutate({
            branchId,
            platform,
            externalOrderId: externalId || undefined,
            customerName: customerName || undefined,
            deliveryAddress: address || undefined,
            items: items.filter((i) => i.menuItemId && i.unitPrice).map((i) => ({
              menuItemId: Number(i.menuItemId),
              quantity: Number(i.quantity),
              unitPrice: String(i.unitPrice),
            })),
            deliveryFee: String(fee),
          })}
        >{create.isPending ? "Creating…" : "Create Order"}</button>
      </>}
    >
      <Field label="Platform" required>
        <Select value={platform} onChange={setPlatform} options={["grab", "lineman", "shopeefood", "foodpanda", "robinhood", "other"]}/>
      </Field>
      <Field label="External order ID" hint="Optional — auto-generated if blank">
        <input className="input" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="GRAB-12345"/>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Customer name">
          <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)}/>
        </Field>
        <Field label="Delivery fee (฿)">
          <input className="input" type="number" value={fee} onChange={(e) => setFee(e.target.value)}/>
        </Field>
      </div>
      <Field label="Delivery address">
        <textarea className="input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)}/>
      </Field>

      <div className="t-caption" style={{ marginBottom: 8, marginTop: 16 }}>Items</div>
      <div className="card" style={{ padding: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 70px 100px 28px", gap: 8, padding: "6px 0", borderTop: i === 0 ? "none" : "1px solid var(--border-default)", alignItems: "center" }}>
            <select className="input" value={it.menuItemId} onChange={(e) => {
              const m = menu.find((x) => x.id === Number(e.target.value));
              const next = items.slice();
              next[i] = { ...it, menuItemId: e.target.value, unitPrice: m?.basePrice ?? it.unitPrice };
              setItems(next);
            }}>
              <option value="">— Pick item —</option>
              {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input className="input" type="number" min={1} value={it.quantity} onChange={(e) => {
              const next = items.slice(); next[i] = { ...it, quantity: e.target.value }; setItems(next);
            }}/>
            <input className="input" type="number" step="0.01" value={it.unitPrice} onChange={(e) => {
              const next = items.slice(); next[i] = { ...it, unitPrice: e.target.value }; setItems(next);
            }} placeholder="Unit ฿"/>
            <button className="btn btn-ghost btn-icon" style={{ width: 24, height: 24 }} onClick={() => setItems(items.filter((_, idx) => idx !== i))}>×</button>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setItems([...items, { menuItemId: "", quantity: 1, unitPrice: "" }])}>+ Add item</button>
      </div>
    </Drawer>
  );
};

const DeliveryOrderDetail = ({ orderId, onClose }) => {
  const { data: order } = trpc.orders.getById.useQuery(
    { id: orderId ?? 0 },
    { enabled: !!orderId }
  );
  if (!orderId) return null;
  const p = PLATFORMS.find((x) => x.code === order?.deliveryPlatform) || PLATFORMS[0];

  return (
    <Drawer
      open={!!orderId}
      onClose={onClose}
      title={order?.orderNumber || "Loading…"}
      subtitle={`${p.label} · ${order?.externalOrderId || ""}`}
      width={480}
    >
      {!order ? (
        <div className="muted" style={{ padding: 20 }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Field label="Status"><span className="pill pill-gold">{order.status}</span></Field>
            <Field label="Total"><div style={{ fontSize: 18, fontWeight: 600 }}>฿{Number(order.totalAmount).toLocaleString()}</div></Field>
            <Field label="Delivery fee"><div>฿{Number(order.deliveryFee ?? 0).toLocaleString()}</div></Field>
            <Field label="Platform payout"><div style={{ color: "var(--matcha-700)", fontWeight: 500 }}>฿{Number(order.platformPayout ?? 0).toLocaleString()}</div></Field>
          </div>

          {order.customerName && (
            <Field label="Customer">
              <div>{order.customerName}</div>
              {order.customerPhone && <div className="muted" style={{ fontSize: 12 }}>📞 {order.customerPhone}</div>}
            </Field>
          )}
          {order.deliveryAddress && (
            <Field label="Delivery address">
              <div style={{ padding: 10, background: "var(--bg-muted)", borderRadius: 6, fontSize: 13 }}>{order.deliveryAddress}</div>
            </Field>
          )}
          {order.riderName && (
            <Field label="Rider">
              <div>{order.riderName} {order.riderPhone && `· ${order.riderPhone}`}</div>
            </Field>
          )}

          <div className="t-caption" style={{ marginBottom: 8, marginTop: 16 }}>Items</div>
          <div className="card" style={{ padding: 0 }}>
            {(order.items ?? []).map((it, i) => (
              <div key={it.id ?? i} style={{
                display: "flex", justifyContent: "space-between", gap: 12,
                padding: "10px 14px", borderTop: i === 0 ? "none" : "1px solid var(--border-default)",
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{it.quantity}× {it.menuItemName}</div>
                  {it.notes && <div className="muted" style={{ fontSize: 11 }}>{it.notes}</div>}
                </div>
                <div className="tabular">฿{Number(it.totalPrice ?? 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </Drawer>
  );
};
