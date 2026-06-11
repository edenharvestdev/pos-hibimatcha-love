import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Field, Modal, useToast, useApp } from "@/components";
import { IconPlus, IconExport, IconImport, IconX, IconEdit, IconTrash } from "@/icons";

export const PagePageMasterData = () => {
  const { t, lang } = useApp();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [selectedDropdownId, setSelectedDropdownId] = useState(null);
  
  // Modals state
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [editingOption, setEditingOption] = useState(null);

  // Form states
  const [newDropdown, setNewDropdown] = useState({ name: "", nameThai: "", code: "" });
  const [newOption, setNewOption] = useState({ value: "", labelEn: "", labelTh: "" });
  const [csvText, setCsvText] = useState("");

  // Queries
  const { data: dropdowns = [], isLoading: loadingDropdowns } = trpc.enterprise.listDropdowns.useQuery();
  const { data: options = [], isLoading: loadingOptions } = trpc.enterprise.listDropdownOptions.useQuery(
    { dropdownId: selectedDropdownId ?? 0 },
    { enabled: !!selectedDropdownId }
  );

  // Mutations
  const createDropdownMut = trpc.enterprise.createDropdown.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdowns.invalidate();
      toast.push({ type: "success", msg: t("Dropdown list created successfully", "สร้างรายการตัวเลือกสำเร็จแล้ว") });
      setShowAddDropdown(false);
      setNewDropdown({ name: "", nameThai: "", code: "" });
    }
  });

  const createOptionMut = trpc.enterprise.createDropdownOption.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdownOptions.invalidate({ dropdownId: selectedDropdownId });
      toast.push({ type: "success", msg: t("Dropdown option added successfully", "เพิ่มค่าตัวเลือกสำเร็จแล้ว") });
      setShowAddOption(false);
      setNewOption({ value: "", labelEn: "", labelTh: "" });
    }
  });

  const updateOptionMut = trpc.enterprise.updateDropdownOption.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdownOptions.invalidate({ dropdownId: selectedDropdownId });
      toast.push({ type: "success", msg: t("Dropdown option updated successfully", "อัปเดตค่าตัวเลือกสำเร็จแล้ว") });
      setEditingOption(null);
    }
  });

  const archiveOptionMut = trpc.enterprise.archiveDropdownOption.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdownOptions.invalidate({ dropdownId: selectedDropdownId });
      toast.push({ type: "success", msg: t("Dropdown option archived successfully", "เก็บถาวรค่าตัวเลือกสำเร็จแล้ว") });
    }
  });

  const archiveDropdownMut = trpc.enterprise.archiveDropdown.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdowns.invalidate();
      setSelectedDropdownId(null);
      toast.push({ type: "success", msg: t("Dropdown list archived successfully", "เก็บถาวรรายการตัวเลือกสำเร็จแล้ว") });
    }
  });

  const importCsvMut = trpc.enterprise.importDropdownOptionsCsv.useMutation({
    onSuccess: () => {
      utils.enterprise.listDropdownOptions.invalidate({ dropdownId: selectedDropdownId });
      toast.push({ type: "success", msg: t("CSV options imported successfully", "นำเข้าข้อมูลจาก CSV สำเร็จแล้ว") });
      setShowImportCsv(false);
      setCsvText("");
    }
  });

  // Selected dropdown data helper
  const activeDropdown = dropdowns.find(d => d.id === selectedDropdownId);

  // Handle CSV Import Submit
  const handleImportCsvSubmit = () => {
    if (!selectedDropdownId) return;
    const lines = csvText.split("\n");
    const parsedOptions = [];
    
    // Simple CSV parser
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const parts = line.split(",").map(p => p.trim());
      if (parts.length > 0) {
        parsedOptions.push({
          value: parts[0],
          labelEn: parts[1] || parts[0],
          labelTh: parts[2] || parts[1] || parts[0]
        });
      }
    }

    if (parsedOptions.length === 0) {
      toast.push({ type: "error", msg: t("No valid rows found in CSV text", "ไม่พบแถวข้อมูลที่ถูกต้องใน CSV") });
      return;
    }

    importCsvMut.mutate({
      dropdownId: selectedDropdownId,
      options: parsedOptions
    });
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (!activeDropdown || options.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    options.forEach(opt => {
      const row = `${opt.value},${opt.labelEn || ""},${opt.labelTh || ""}`;
      csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeDropdown.code}_options.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.push({ type: "success", msg: t("CSV exported successfully", "ส่งออก CSV สำเร็จแล้ว") });
  };

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <TopActionBar 
        title={t("Master Data Engine", "ระบบจัดการข้อมูลหลัก")} 
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddDropdown(true)}>
            <IconPlus size={16} /> {t("New Dropdown", "สร้างรายการตัวเลือกใหม่")}
          </button>
        }
      />

      <div className="p-6 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Left Panel: List of Dropdowns */}
          <div className="md:col-span-1 bg-card rounded-xl border p-4 space-y-2 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">{t("Dropdown Lists", "รายการตัวเลือก (Dropdown)")}</h3>
            {loadingDropdowns ? (
              <div className="text-center py-6 text-sm text-muted-foreground">{t("Loading...", "กำลังโหลด...")}</div>
            ) : dropdowns.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">{t("No dropdown lists created.", "ยังไม่มีรายการตัวเลือก")}</div>
            ) : (
              <div className="space-y-1">
                {dropdowns.map((d) => (
                  <div 
                    key={d.id}
                    onClick={() => setSelectedDropdownId(d.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm cursor-pointer transition-all duration-150 ${
                      selectedDropdownId === d.id 
                        ? "bg-primary/10 text-primary font-medium border border-primary/20" 
                        : "hover:bg-muted/50 border border-transparent"
                    }`}
                  >
                    <span>{d.nameThai || d.name} <span className="block text-xs text-muted-foreground font-mono">{d.code}</span></span>
                    {selectedDropdownId === d.id && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(t("Are you sure you want to archive this dropdown?", "คุณแน่ใจหรือไม่ที่จะเก็บถาวรรายการตัวเลือกนี้?"))) {
                            archiveDropdownMut.mutate({ id: d.id });
                          }
                        }}
                        className="text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                        title={t("Archive Dropdown", "เก็บถาวรรายการ")}
                      >
                        <IconTrash size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Options inside the selected dropdown */}
          <div className="md:col-span-3 bg-card rounded-xl border p-6 shadow-sm min-h-[400px] flex flex-col">
            {selectedDropdownId ? (
              <>
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-primary">{activeDropdown?.nameThai || activeDropdown?.name}</h2>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">Code: {activeDropdown?.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCsv} disabled={options.length === 0}>
                      <IconExport size={14} /> {t("Export CSV", "ส่งออก CSV")}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowImportCsv(true)}>
                      <IconImport size={14} /> {t("Import CSV", "นำเข้า CSV")}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddOption(true)}>
                      <IconPlus size={14} /> {t("Add Option", "เพิ่มค่าตัวเลือก")}
                    </button>
                  </div>
                </div>

                {loadingOptions ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">{t("Loading options...", "กำลังโหลดค่าตัวเลือก...")}</div>
                ) : options.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex-1 flex flex-col justify-center items-center">
                    <p className="text-base font-medium">{t("No options defined", "ยังไม่ได้กำหนดค่าตัวเลือก")}</p>
                    <p className="text-sm mt-1">{t("Add your first dropdown value manually or import a CSV file.", "เพิ่มค่าตัวเลือกแรกของคุณด้วยตนเอง หรือนำเข้าจากไฟล์ CSV")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-3 font-semibold text-muted-foreground">{t("Value (DB Code)", "ค่าที่เก็บ (รหัสในฐานข้อมูล)")}</th>
                          <th className="p-3 font-semibold text-muted-foreground">{t("English Label", "ป้ายชื่อภาษาอังกฤษ")}</th>
                          <th className="p-3 font-semibold text-muted-foreground">{t("Thai Label", "ป้ายชื่อภาษาไทย")}</th>
                          <th className="p-3 font-semibold text-muted-foreground text-right">{t("Actions", "การดำเนินการ")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {options.map((opt) => (
                          <tr key={opt.id} className="hover:bg-muted/15">
                            <td className="p-3 font-mono">{opt.value}</td>
                            <td className="p-3">{opt.labelEn || "—"}</td>
                            <td className="p-3">{opt.labelTh || "—"}</td>
                            <td className="p-3 text-right space-x-2">
                              <button 
                                onClick={() => setEditingOption(opt)} 
                                className="text-primary hover:bg-primary/10 p-1.5 rounded transition-colors"
                              >
                                <IconEdit size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm(t("Are you sure you want to delete this option?", "คุณแน่ใจหรือไม่ที่จะลบค่าตัวเลือกนี้?"))) {
                                    archiveOptionMut.mutate({ id: opt.id });
                                  }
                                }} 
                                className="text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                              >
                                <IconTrash size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-12 text-muted-foreground">
                <p className="text-lg font-bold">{t("Select a Dropdown", "กรุณาเลือกรายการ")}</p>
                <p className="text-sm mt-2 max-w-md">
                  {t("Choose a dropdown list from the left panel to manage its options, import new records, or export metadata.", "เลือกรายการตัวเลือกจากแผงควบคุมด้านซ้ายเพื่อจัดการค่าตัวเลือก นำเข้าข้อมูลใหม่ หรือส่งออกรายละเอียด")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add Dropdown */}
      <Modal open={showAddDropdown} onClose={() => setShowAddDropdown(false)} title={t("New Dropdown List", "สร้างรายการตัวเลือกใหม่")}>
        <div className="space-y-4 pt-2">
          <Field label={t("System Code (Unique Identifier)", "รหัสในระบบ (ห้ามซ้ำ)")} required hint="e.g. order_source, expense_category">
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. order_source" 
              value={newDropdown.code}
              onChange={e => setNewDropdown(prev => ({...prev, code: e.target.value}))}
            />
          </Field>
          <Field label={t("Dropdown Name (English)", "ชื่อรายการ (อังกฤษ)")} required>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Order Source" 
              value={newDropdown.name}
              onChange={e => setNewDropdown(prev => ({...prev, name: e.target.value}))}
            />
          </Field>
          <Field label={t("Dropdown Name (Thai)", "ชื่อรายการ (ไทย)")}>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. ช่องทางการสั่งซื้อ" 
              value={newDropdown.nameThai}
              onChange={e => setNewDropdown(prev => ({...prev, nameThai: e.target.value}))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setShowAddDropdown(false)}>{t("Cancel", "ยกเลิก")}</button>
            <button 
              className="btn btn-primary" 
              disabled={!newDropdown.code || !newDropdown.name}
              onClick={() => createDropdownMut.mutate(newDropdown)}
            >
              {t("Create List", "สร้างรายการ")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Option */}
      <Modal open={showAddOption} onClose={() => setShowAddOption(false)} title={t("Add Dropdown Option", "เพิ่มค่าตัวเลือก")}>
        <div className="space-y-4 pt-2">
          <Field label={t("Database Value (Key)", "ค่าที่บันทึก (คีย์)")} required hint={t("The value stored in database", "ค่าที่เก็บจริงในฐานข้อมูล")}>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. line_man" 
              value={newOption.value}
              onChange={e => setNewOption(prev => ({...prev, value: e.target.value}))}
            />
          </Field>
          <Field label={t("English Label", "ชื่อแสดง (อังกฤษ)")} required>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. LINE MAN" 
              value={newOption.labelEn}
              onChange={e => setNewOption(prev => ({...prev, labelEn: e.target.value}))}
            />
          </Field>
          <Field label={t("Thai Label", "ชื่อแสดง (ไทย)")}>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. ไลน์แมน" 
              value={newOption.labelTh}
              onChange={e => setNewOption(prev => ({...prev, labelTh: e.target.value}))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setShowAddOption(false)}>{t("Cancel", "ยกเลิก")}</button>
            <button 
              className="btn btn-primary" 
              disabled={!newOption.value || !newOption.labelEn}
              onClick={() => createOptionMut.mutate({ dropdownId: selectedDropdownId, ...newOption })}
            >
              {t("Add Option", "เพิ่มค่าตัวเลือก")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Option */}
      <Modal open={!!editingOption} onClose={() => setEditingOption(null)} title={t("Edit Dropdown Option", "แก้ไขค่าตัวเลือก")}>
        <div className="space-y-4 pt-2">
          <Field label={t("Database Value (Key)", "ค่าที่บันทึก (คีย์)")} required hint={t("Value stored in DB cannot be changed", "ค่าที่เก็บในระบบไม่สามารถแก้ไขได้")}>
            <input 
              type="text" 
              className="input bg-muted" 
              disabled
              value={editingOption?.value || ""}
            />
          </Field>
          <Field label={t("English Label", "ชื่อแสดง (อังกฤษ)")} required>
            <input 
              type="text" 
              className="input" 
              value={editingOption?.labelEn || ""}
              onChange={e => setEditingOption(prev => ({...prev, labelEn: e.target.value}))}
            />
          </Field>
          <Field label={t("Thai Label", "ชื่อแสดง (ไทย)")}>
            <input 
              type="text" 
              className="input" 
              value={editingOption?.labelTh || ""}
              onChange={e => setEditingOption(prev => ({...prev, labelTh: e.target.value}))}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setEditingOption(null)}>{t("Cancel", "ยกเลิก")}</button>
            <button 
              className="btn btn-primary" 
              disabled={!editingOption?.labelEn}
              onClick={() => updateOptionMut.mutate({ id: editingOption.id, labelEn: editingOption.labelEn, labelTh: editingOption.labelTh })}
            >
              {t("Save Changes", "บันทึกการเปลี่ยนแปลง")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Import CSV */}
      <Modal open={showImportCsv} onClose={() => setShowImportCsv(false)} title={t("Import Dropdown Options via CSV", "นำเข้าค่าตัวเลือกผ่าน CSV")}>
        <div className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            {t("Paste CSV formatted text below. Format: value,labelEnglish,labelThai per line.", "วางข้อความในรูปแบบ CSV ด้านล่าง โดยกำหนดเป็น: value,labelEnglish,labelThai หนึ่งแถวต่อหนึ่งรายการ")}
            <br />
            <strong>{t("Warning:", "คำเตือน:")}</strong> {t("Warning: Importing will archive all current options in this list.", "คำเตือน: การนำเข้าใหม่จะทำการเก็บถาวรตัวเลือกทั้งหมดที่มีอยู่เดิมในรายการนี้")}
          </p>
          <Field label={t("CSV Data Content", "เนื้อหาข้อมูล CSV")} required>
            <textarea 
              rows={8}
              className="input font-mono text-xs w-full" 
              placeholder="e.g.&#13;grab_pay,GrabPay,แกร็บเพย์&#13;true_money,TrueMoney,ทรูมันนี่"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => setShowImportCsv(false)}>{t("Cancel", "ยกเลิก")}</button>
            <button 
              className="btn btn-primary" 
              disabled={!csvText.trim()}
              onClick={handleImportCsvSubmit}
            >
              {t("Import Options", "นำเข้าตัวเลือก")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const PageMasterData = PagePageMasterData;
export default PageMasterData;
