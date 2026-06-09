import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Avatar, SectionHeader } from "@/components";

export const PageFranchiseWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ownerFirstName: "",
    ownerLastName: "",
    ownerEmail: "",
    ownerPhone: "",
    branchName: "",
    branchCode: "",
    province: "",
    contractStartDate: "",
    contractEndDate: "",
    royaltyType: "percentage",
    royaltyValue: "5",
  });

  const onboard = trpc.franchise.openNewBranch.useMutation();

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    try {
      await onboard.mutateAsync({
        name: formData.branchName,
        branchCode: formData.branchCode,
        branchType: "franchise",
        province: formData.province,
        phone: formData.ownerPhone,
        email: formData.ownerEmail,
        contractStartDate: formData.contractStartDate,
        contractEndDate: formData.contractEndDate,
        royaltyType: formData.royaltyType,
        royaltyValue: formData.royaltyValue,
      });
      alert("สร้างสาขาแฟรนไชส์สำเร็จ!");
      // window.location.href = '#/backoffice/franchise';
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <TopActionBar title="Franchise Onboarding Wizard" />
      <div className="p-6 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
        
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
           {[1, 2, 3, 4].map(s => (
             <div key={s} className="flex flex-col items-center flex-1 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {s}
                </div>
                {s < 4 && <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 ${step > s ? 'bg-primary' : 'bg-muted'}`}></div>}
                <span className="text-xs mt-2 font-medium">{s === 1 ? 'Owner' : s === 2 ? 'Branch' : s === 3 ? 'Contract' : 'Confirm'}</span>
             </div>
           ))}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          
          {step === 1 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title="ข้อมูลเจ้าของแฟรนไชส์ (Owner Info)" />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">ชื่อ (First Name)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerFirstName} onChange={e => setFormData({...formData, ownerFirstName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">นามสกุล (Last Name)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerLastName} onChange={e => setFormData({...formData, ownerLastName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">เบอร์โทรศัพท์ (Phone)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">อีเมล (Email)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerEmail} onChange={e => setFormData({...formData, ownerEmail: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title="ข้อมูลสาขา (Branch Info)" />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">ชื่อสาขา (Branch Name)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">รหัสสาขา (Branch Code)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                   <label className="text-sm font-medium mb-1 block">จังหวัด (Province)</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title="เงื่อนไขสัญญา (Contract & Royalty)" />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">วันเริ่มสัญญา (Start Date)</label>
                   <input type="date" className="w-full border rounded px-3 py-2" value={formData.contractStartDate} onChange={e => setFormData({...formData, contractStartDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">วันสิ้นสุดสัญญา (End Date)</label>
                   <input type="date" className="w-full border rounded px-3 py-2" value={formData.contractEndDate} onChange={e => setFormData({...formData, contractEndDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">ประเภท Royalty</label>
                   <select className="w-full border rounded px-3 py-2" value={formData.royaltyType} onChange={e => setFormData({...formData, royaltyType: e.target.value})}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed (THB)</option>
                      <option value="none">None</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">มูลค่า (Value)</label>
                   <input type="number" className="w-full border rounded px-3 py-2" value={formData.royaltyValue} onChange={e => setFormData({...formData, royaltyValue: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title="ยืนยันข้อมูล (Confirmation)" />
               <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                 <p><strong>เจ้าของ:</strong> {formData.ownerFirstName} {formData.ownerLastName} ({formData.ownerPhone})</p>
                 <p><strong>สาขา:</strong> {formData.branchName} ({formData.branchCode}) - {formData.province}</p>
                 <p><strong>สัญญา:</strong> {formData.contractStartDate} ถึง {formData.contractEndDate}</p>
                 <p><strong>Royalty:</strong> {formData.royaltyValue} {formData.royaltyType === 'percentage' ? '%' : 'บาท'}</p>
               </div>
               <p className="text-sm text-muted-foreground">ระบบจะทำการสร้างสาขาและผู้ใช้งานสำหรับเจ้าของแฟรนไชส์โดยอัตโนมัติ</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex justify-between border-t pt-4">
             <button disabled={step === 1} onClick={handlePrev} className="px-6 py-2 rounded-lg border hover:bg-muted disabled:opacity-50 font-medium">ย้อนกลับ</button>
             {step < 4 ? (
               <button onClick={handleNext} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium">ถัดไป</button>
             ) : (
               <button onClick={handleSubmit} disabled={onboard.isPending} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
                 {onboard.isPending ? 'กำลังสร้าง...' : 'ยืนยันและสร้างแฟรนไชส์'}
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
