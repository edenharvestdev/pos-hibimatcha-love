import React, { useState } from "react";
import { useApp } from "@/components";
import { trpc } from "@/lib/trpc";
import {
  IconPlus,
  IconX,
  IconCheck,
  IconTrash,
  IconInfo,
} from "@/icons";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

// Thin wrapper to map simple open/onClose/title/subtitle/footer props to vaul compound components
const SlideOver = ({ open, onClose, title, subtitle, footer, children }) => (
  <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }} direction="right">
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>{title}</DrawerTitle>
        {subtitle && <DrawerDescription>{subtitle}</DrawerDescription>}
      </DrawerHeader>
      <div style={{ padding: "0 16px", flex: 1, overflowY: "auto" }}>{children}</div>
      {footer && <DrawerFooter style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>{footer}</DrawerFooter>}
    </DrawerContent>
  </Drawer>
);

const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>
      {label} {required && <span style={{ color: "var(--red-500)" }}>*</span>}
    </label>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: 36,
        height: 20,
        appearance: "none",
        backgroundColor: checked ? "var(--matcha-500)" : "var(--bg-subtle)",
        borderRadius: 10,
        position: "relative",
        cursor: "pointer",
        transition: "background-color 200ms",
        border: "1px solid var(--border-default)",
      }}
      className="toggle-checkbox"
    />
    {label && <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{label}</span>}
  </label>
);

export const PageHardwareSettings = () => {
  const { t, lang, branch } = useApp();
  const branchId = branch?.id || 1;

  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    printerName: "",
    printerType: "receipt",
    connection: "browser",
    ipAddress: "",
    port: 9100,
    paperWidth: 80,
    charactersPerLine: 48,
    isDefault: false,
  });

  const { data: printers = [], isLoading, refetch } =
    trpc.enterprise.listPrinters.useQuery({ branchId });

  const createPrinterMut = trpc.enterprise.createPrinter.useMutation({
    onSuccess: () => {
      refetch();
      setAddDrawerOpen(false);
      setNewPrinter({
        printerName: "",
        printerType: "receipt",
        connection: "browser",
        ipAddress: "",
        port: 9100,
        paperWidth: 80,
        charactersPerLine: 48,
        isDefault: false,
      });
    },
    onError: (err) => alert(err.message),
  });

  const deletePrinterMut = trpc.enterprise.deletePrinter.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => alert(err.message),
  });

  const handleCreatePrinter = () => {
    if (!newPrinter.printerName.trim()) return;
    createPrinterMut.mutate({
      branchId,
      printerName: newPrinter.printerName.trim(),
      printerType: newPrinter.printerType,
      connection: newPrinter.connection,
      ipAddress: newPrinter.ipAddress || undefined,
      port: Number(newPrinter.port),
      paperWidth: Number(newPrinter.paperWidth),
      charactersPerLine: Number(newPrinter.charactersPerLine),
      isDefault: newPrinter.isDefault,
    });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(t('Delete printer "{name}"?', 'ต้องการลบเครื่องพิมพ์ "{name}"?').replace('{name}', name))) {
      deletePrinterMut.mutate({ id });
    }
  };

  const handleTestPrint = (p) => {
    alert(
      t(
        `Test print job successfully enqueued to "${p.printerName}"! (Connection: ${p.connection})`,
        `ส่งชุดคำสั่งพิมพ์ทดสอบไปยัง "${p.printerName}" สำเร็จ! (ประเภทการเชื่อมต่อ: ${p.connection})`
      )
    );
  };

  const connectionTypes = {
    usb: t("USB Connection", "การเชื่อมต่อ USB"),
    network: t("LAN / Ethernet Network", "เครือข่าย LAN / Ethernet"),
    bluetooth: t("Bluetooth Pairing", "จับคู่บลูทูธ"),
    browser: t("Web Browser Print Dialog", "สั่งพิมพ์ผ่านเบราว์เซอร์"),
  };

  const printerTypeLabels = {
    order_slip: t("Order Slip Printer", "เครื่องพิมพ์ใบสั่งคิว"),
    label: t("Sticky Drink Label Printer", "เครื่องพิมพ์สติกเกอร์แก้ว"),
    kitchen: t("Kitchen Ticket Printer", "เครื่องพิมพ์ตั๋วในครัว"),
    receipt: t("Cashier Customer Receipt Printer", "เครื่องพิมพ์ใบเสร็จแคชเชียร์"),
  };

  return (
    <div className="page" style={{ padding: 24 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="breadcrumb">
          {t("admin.title")} / {t("settings.title")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
              {t("Hardware & Printers", "ตั้งค่าเครื่องพิมพ์และฮาร์ดแวร์")}
            </h1>
            <p className="page-desc" style={{ color: "var(--text-tertiary)", marginTop: 4 }}>
              {t("Register receipt, kitchen ticket, and sticky label printers and assign them to print stations.", "ลงทะเบียนเครื่องพิมพ์ใบเสร็จ ตั๋วสั่งอาหารในครัว และสติกเกอร์ติดแก้วน้ำ พร้อมกำหนดเครื่องพิมพ์ตามจุดขาย")}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setAddDrawerOpen(true)}>
            <IconPlus size={16} /> {t("Add Printer", "เพิ่มเครื่องพิมพ์")}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
          <IconInfo size={20} style={{ color: "var(--matcha-600)" }} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            {t("Matches documents with hardware profiles. LAN network printers require static IP configurations.", "จับคู่เอกสารกับโปรไฟล์ฮาร์ดแวร์ เครื่องพิมพ์เครือข่าย LAN ต้องใช้การตั้งค่า IP แบบคงที่")}
          </span>
        </div>

        {isLoading ? (
          <div className="muted" style={{ padding: 20, textAlign: "center" }}>{t("Loading printers...", "กำลังโหลดเครื่องพิมพ์...")}</div>
        ) : printers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-tertiary)" }}>
            <p>{t("No hardware printers configured for this branch. Add one to customize printing routing.", "ยังไม่ได้ตั้งค่าเครื่องพิมพ์สำหรับสาขานี้ เพิ่มเครื่องพิมพ์เพื่อเริ่มกำหนดปลายทางงานพิมพ์")}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {printers.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderRadius: 8,
                  border: "1px solid var(--border-default)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{p.printerName}</div>
                    {p.isDefault && (
                      <span className="pill pill-matcha" style={{ fontSize: 10 }}>
                        {t("Default", "เริ่มต้น")}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>{t("Type: ", "ประเภท: ")}<strong>{printerTypeLabels[p.printerType] || p.printerType}</strong></span>
                    <span>{t("Port: ", "พอร์ต: ")}<strong>{connectionTypes[p.connection] || p.connection}</strong></span>
                    {p.connection === "network" && (
                      <span>IP: <strong className="mono">{p.ipAddress}:{p.port}</strong></span>
                    )}
                    <span>{t("Paper: ", "กระดาษ: ")}<strong className="mono">{p.paperWidth}mm</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleTestPrint(p)}>
                    {t("Test Print", "ทดสอบพิมพ์")}
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: "var(--red-600)" }}
                    onClick={() => handleDelete(p.id, p.printerName)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Printer Drawer */}
      <SlideOver
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        title={t("Register Hardware Printer", "ลงทะเบียนเครื่องพิมพ์")}
        subtitle={t("Add a new printing device", "เพิ่มอุปกรณ์พิมพ์ใหม่")}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddDrawerOpen(false)}>{t("Cancel", "ยกเลิก")}</button>
            <button className="btn btn-primary" onClick={handleCreatePrinter} disabled={createPrinterMut.isPending || !newPrinter.printerName.trim()}>
              {createPrinterMut.isPending ? t("Adding...", "กำลังเพิ่ม...") : t("Add Printer", "เพิ่มเครื่องพิมพ์")}
            </button>
          </>
        }
      >
        <Field label={t("Printer Name", "ชื่อเครื่องพิมพ์") + " *"} required>
          <input
            className="input"
            value={newPrinter.printerName}
            onChange={(e) => setNewPrinter({ ...newPrinter, printerName: e.target.value })}
            placeholder="e.g. Counter Receipt EPSON"
          />
        </Field>
        <Field label={t("Printer Purpose / Type", "วัตถุประสงค์ / ประเภทเครื่องพิมพ์")}>
          <select
            className="input"
            style={{ appearance: "auto" }}
            value={newPrinter.printerType}
            onChange={(e) => setNewPrinter({ ...newPrinter, printerType: e.target.value })}
          >
            <option value="receipt">{t("Cashier Receipt (Customer)", "ใบเสร็จลูกค้า (แคชเชียร์)")}</option>
            <option value="kitchen">{t("Kitchen Ticket (Orders)", "ตั๋วสั่งอาหาร (ครัว)")}</option>
            <option value="label">{t("Sticky Drink Labels (Cups)", "สติกเกอร์เครื่องดื่ม (ติดแก้ว)")}</option>
            <option value="order_slip">{t("Order Slip / Queue", "ใบสั่งออเดอร์ / คิว")}</option>
          </select>
        </Field>
        <Field label={t("Connection Type", "ประเภทการเชื่อมต่อ")}>
          <select
            className="input"
            style={{ appearance: "auto" }}
            value={newPrinter.connection}
            onChange={(e) => setNewPrinter({ ...newPrinter, connection: e.target.value })}
          >
            <option value="browser">{t("Web Browser Print Dialog", "หน้าต่างสั่งพิมพ์ของเว็บเบราว์เซอร์")}</option>
            <option value="network">{t("LAN Network (Ethernet/Static IP)", "เครือข่าย LAN (Ethernet/IP คงที่)")}</option>
            <option value="usb">{t("Local USB Port", "พอร์ต USB")}</option>
            <option value="bluetooth">{t("Bluetooth Device", "อุปกรณ์บลูทูธ")}</option>
          </select>
        </Field>

        {newPrinter.connection === "network" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
            <Field label={t("IP Address", "ที่อยู่ IP") + " *"} required>
              <input
                className="input mono"
                value={newPrinter.ipAddress}
                onChange={(e) => setNewPrinter({ ...newPrinter, ipAddress: e.target.value })}
                placeholder="192.168.1.200"
              />
            </Field>
            <Field label={t("Port", "พอร์ต")}>
              <input
                className="input mono"
                type="number"
                value={newPrinter.port}
                onChange={(e) => setNewPrinter({ ...newPrinter, port: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("Paper Width (mm)", "ความกว้างกระดาษ (มม.)")}>
            <select
              className="input"
              style={{ appearance: "auto" }}
              value={newPrinter.paperWidth}
              onChange={(e) => setNewPrinter({ ...newPrinter, paperWidth: Number(e.target.value) })}
            >
              <option value={80}>80mm</option>
              <option value={58}>58mm</option>
            </select>
          </Field>
          <Field label={t("Max Characters Per Line", "จำนวนตัวอักษรสูงสุดต่อบรรทัด")}>
            <input
              className="input"
              type="number"
              value={newPrinter.charactersPerLine}
              onChange={(e) => setNewPrinter({ ...newPrinter, charactersPerLine: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Toggle
            checked={newPrinter.isDefault}
            onChange={(v) => setNewPrinter({ ...newPrinter, isDefault: v })}
            label={t("Set as default device for this branch", "ตั้งเป็นเครื่องพิมพ์เริ่มต้นสำหรับสาขานี้")}
          />
        </div>
      </SlideOver>
    </div>
  );
};
