import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Avatar, SectionHeader, useApp } from "@/components";

export const PageFranchiseWizard = () => {
  const { t } = useApp();
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
      alert(t('Franchise branch created successfully!', 'สร้างสาขาแฟรนไชส์สำเร็จ!'));
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <TopActionBar title={t('Franchise Onboarding Wizard', 'ตัวช่วยสร้างสาขาแฟรนไชส์')} />
      <div className="p-6 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
        
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
           {[1, 2, 3, 4].map(s => (
             <div key={s} className="flex flex-col items-center flex-1 relative">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                   {s}
                 </div>
                 {s < 4 && <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 ${step > s ? 'bg-primary' : 'bg-muted'}`}></div>}
                 <span className="text-xs mt-2 font-medium">
                   {s === 1 ? t('Owner', 'เจ้าของ') : s === 2 ? t('Branch', 'สาขา') : s === 3 ? t('Contract', 'สัญญา') : t('Confirm', 'ยืนยัน')}
                 </span>
             </div>
           ))}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[400px] flex flex-col">
          
          {step === 1 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title={t('Franchise Owner Info', 'ข้อมูลเจ้าของแฟรนไชส์')} />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('First Name', 'ชื่อ')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerFirstName} onChange={e => setFormData({...formData, ownerFirstName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Last Name', 'นามสกุล')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerLastName} onChange={e => setFormData({...formData, ownerLastName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Phone', 'เบอร์โทรศัพท์')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Email', 'อีเมล')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.ownerEmail} onChange={e => setFormData({...formData, ownerEmail: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title={t('Branch Info', 'ข้อมูลสาขา')} />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Branch Name', 'ชื่อสาขา')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Branch Code', 'รหัสสาขา')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                   <label className="text-sm font-medium mb-1 block">{t('Province', 'จังหวัด')}</label>
                   <input className="w-full border rounded px-3 py-2" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title={t('Contract & Royalty Conditions', 'เงื่อนไขสัญญา')} />
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Start Date', 'วันเริ่มสัญญา')}</label>
                   <input type="date" className="w-full border rounded px-3 py-2" value={formData.contractStartDate} onChange={e => setFormData({...formData, contractStartDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('End Date', 'วันสิ้นสุดสัญญา')}</label>
                   <input type="date" className="w-full border rounded px-3 py-2" value={formData.contractEndDate} onChange={e => setFormData({...formData, contractEndDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Royalty Type', 'ประเภท Royalty')}</label>
                    <select className="w-full border rounded px-3 py-2" value={formData.royaltyType} onChange={e => setFormData({...formData, royaltyType: e.target.value})}>
                       <option value="percentage">Percentage (%)</option>
                       <option value="fixed">Fixed (THB)</option>
                       <option value="hybrid">Hybrid (% + Fixed)</option>
                       <option value="none">None</option>
                    </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Value', 'มูลค่า')}</label>
                   <input type="number" className="w-full border rounded px-3 py-2" value={formData.royaltyValue} onChange={e => setFormData({...formData, royaltyValue: e.target.value})} />
                 </div>
               </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 flex-1">
               <SectionHeader title={t('Confirm Information', 'ยืนยันข้อมูล')} />
               <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                 <p><strong>{t('Owner:', 'เจ้าของ:')}</strong> {formData.ownerFirstName} {formData.ownerLastName} ({formData.ownerPhone})</p>
                 <p><strong>{t('Branch:', 'สาขา:')}</strong> {formData.branchName} ({formData.branchCode}) - {formData.province}</p>
                 <p><strong>{t('Contract:', 'สัญญา:')}</strong> {formData.contractStartDate} {t('to', 'ถึง')} {formData.contractEndDate}</p>
                 <p><strong>Royalty:</strong> {formData.royaltyValue} {formData.royaltyType === 'percentage' ? '%' : formData.royaltyType === 'hybrid' ? '% + Fixed' : t('THB', 'บาท')}</p>
               </div>
               <p className="text-sm text-muted-foreground">
                 {t('The system will automatically create a branch and user credentials for the franchise owner.', 'ระบบจะทำการสร้างสาขาและบัญชีผู้ใช้งานสำหรับเจ้าของแฟรนไชส์โดยอัตโนมัติ')}
               </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex justify-between border-t pt-4">
             <button disabled={step === 1} onClick={handlePrev} className="px-6 py-2 rounded-lg border hover:bg-muted disabled:opacity-50 font-medium">
               {t('Back', 'ย้อนกลับ')}
             </button>
             {step < 4 ? (
               <button onClick={handleNext} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
                 {t('Next', 'ถัดไป')}
               </button>
             ) : (
               <button onClick={handleSubmit} disabled={onboard.isPending} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
                 {onboard.isPending ? t('Creating...', 'กำลังสร้าง...') : t('Confirm & Create Franchise', 'ยืนยันและสร้างแฟรนไชส์')}
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
