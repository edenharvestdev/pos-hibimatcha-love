import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, Avatar, SectionHeader, useApp } from "@/components";

export const PageFranchiseWizard = () => {
  const { t, navigate } = useApp();
  const [step, setStep] = useState(1);
  const [successData, setSuccessData] = useState(null);
  const [formData, setFormData] = useState({
    ownerFirstName: "",
    ownerLastName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerPassword: "",
    ownerConfirmPassword: "",
    ownerPin: "",
    branchName: "",
    branchCode: "",
    province: "",
    contractStartDate: "",
    contractEndDate: "",
    royaltyType: "percentage",
    royaltyValue: "5",
  });

  const onboard = trpc.franchise.openNewBranch.useMutation();

  const handleNext = () => {
    if (step === 1 && formData.ownerFirstName && formData.ownerPhone) {
      if (!formData.ownerPassword || formData.ownerPassword.length < 6) {
        alert(t('Password must be at least 6 characters!', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!'));
        return;
      }
      if (formData.ownerPassword !== formData.ownerConfirmPassword) {
        alert(t('Passwords do not match!', 'รหัสผ่านไม่ตรงกัน!'));
        return;
      }
      if (formData.ownerPin && (formData.ownerPin.length !== 4 || !/^\d{4}$/.test(formData.ownerPin))) {
        alert(t('POS PIN must be exactly 4 digits!', 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก!'));
        return;
      }
    }
    setStep(s => Math.min(s + 1, 4));
  };
  
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (formData.ownerFirstName && formData.ownerPhone) {
      if (!formData.ownerPassword || formData.ownerPassword.length < 6) {
        alert(t('Password must be at least 6 characters!', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!'));
        return;
      }
      if (formData.ownerPassword !== formData.ownerConfirmPassword) {
        alert(t('Passwords do not match!', 'รหัสผ่านไม่ตรงกัน!'));
        return;
      }
      if (formData.ownerPin && (formData.ownerPin.length !== 4 || !/^\d{4}$/.test(formData.ownerPin))) {
        alert(t('POS PIN must be exactly 4 digits!', 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก!'));
        return;
      }
    }
    try {
      const res = await onboard.mutateAsync({
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
        ownerFirstName: formData.ownerFirstName || undefined,
        ownerLastName: formData.ownerLastName || undefined,
        ownerPassword: formData.ownerPassword || undefined,
        ownerPin: formData.ownerPin || undefined,
      });
      setSuccessData(res);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  if (successData) {
    return (
      <div className="flex flex-col h-full bg-muted/20">
        <TopActionBar title={t('Onboarding Success', 'สร้างสาขาสำเร็จแล้ว')} />
        <div className="p-6 flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
          <div className="bg-card border rounded-xl p-8 shadow-sm flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t('Franchise Created!', 'สร้างสาขาแฟรนไชส์สำเร็จ!')}</h2>
              <p className="text-muted-foreground mt-2">{t('Please keep the login credentials below safe.', 'กรุณาจดจำรหัสผ่านและข้อมูลการเข้าใช้งานด้านล่างนี้')}</p>
            </div>
            
            <div className="w-full bg-muted p-6 rounded-lg text-left space-y-3 font-medium text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Branch Name', 'ชื่อสาขา')}</span>
                <span>{successData.name || formData.branchName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Branch Code', 'รหัสสาขา')}</span>
                <span className="mono">{successData.branchCode || formData.branchCode}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Owner Name', 'ชื่อเจ้าของ')}</span>
                <span>{formData.ownerFirstName} {formData.ownerLastName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Owner Employee Code', 'รหัสพนักงานเจ้าของ')}</span>
                <span className="mono text-primary font-bold text-base">{successData.ownerEmployeeCode}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('Owner Password', 'รหัสผ่าน')}</span>
                <span className="mono font-bold">{formData.ownerPassword}</span>
              </div>
              {formData.ownerPin && (
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">{t('POS Quick PIN', 'PIN เข้าระบบ POS')}</span>
                  <span className="mono font-bold">{formData.ownerPin}</span>
                </div>
              )}
            </div>

            <div className="w-full pt-4 flex gap-4">
              <button onClick={() => navigate(`/backoffice/franchise/${successData.id}`)} className="btn btn-primary flex-1 py-3 text-sm font-semibold">
                {t('Go to Branch Detail', 'ไปยังรายละเอียดสาขา')}
              </button>
              <button onClick={() => { setSuccessData(null); setStep(1); setFormData({ ownerFirstName: "", ownerLastName: "", ownerEmail: "", ownerPhone: "", ownerPassword: "", ownerConfirmPassword: "", ownerPin: "", branchName: "", branchCode: "", province: "", contractStartDate: "", contractEndDate: "", royaltyType: "percentage", royaltyValue: "5" }); }} className="btn btn-secondary flex-1 py-3 text-sm font-semibold">
                {t('Onboard Another Branch', 'สร้างสาขาอื่นต่อ')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                   <label className="text-sm font-medium mb-1 block">{t('First Name', 'ชื่อ')} *</label>
                   <input className="input" value={formData.ownerFirstName} onChange={e => setFormData({...formData, ownerFirstName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Last Name', 'นามสกุล')} *</label>
                   <input className="input" value={formData.ownerLastName} onChange={e => setFormData({...formData, ownerLastName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Phone', 'เบอร์โทรศัพท์')} *</label>
                   <input className="input" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Email', 'อีเมล')}</label>
                   <input className="input" value={formData.ownerEmail} onChange={e => setFormData({...formData, ownerEmail: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Password', 'รหัสผ่าน')} *</label>
                   <input type="password" placeholder="At least 6 characters" className="input" value={formData.ownerPassword} onChange={e => setFormData({...formData, ownerPassword: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Confirm Password', 'ยืนยันรหัสผ่าน')} *</label>
                   <input type="password" className="input" value={formData.ownerConfirmPassword} onChange={e => setFormData({...formData, ownerConfirmPassword: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                   <label className="text-sm font-medium mb-1 block">{t('POS Quick PIN', 'รหัส PIN ด่วนเข้า POS')}</label>
                   <input type="text" maxLength={4} placeholder="4 digits (optional)" className="input" value={formData.ownerPin} onChange={e => setFormData({...formData, ownerPin: e.target.value.replace(/\D/g, '')})} />
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
                   <input className="input" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Branch Code', 'รหัสสาขา')}</label>
                   <input className="input" value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} />
                 </div>
                 <div className="col-span-2">
                   <label className="text-sm font-medium mb-1 block">{t('Province', 'จังหวัด')}</label>
                   <input className="input" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
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
                   <input type="date" className="input" value={formData.contractStartDate} onChange={e => setFormData({...formData, contractStartDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('End Date', 'วันสิ้นสุดสัญญา')}</label>
                   <input type="date" className="input" value={formData.contractEndDate} onChange={e => setFormData({...formData, contractEndDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Royalty Type', 'ประเภท Royalty')}</label>
                    <select className="input" value={formData.royaltyType} onChange={e => setFormData({...formData, royaltyType: e.target.value})}>
                       <option value="percentage">Percentage (%)</option>
                       <option value="fixed">Fixed (THB)</option>
                       <option value="hybrid">Hybrid (% + Fixed)</option>
                       <option value="none">None</option>
                    </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium mb-1 block">{t('Value', 'มูลค่า')}</label>
                   <input type="number" className="input" value={formData.royaltyValue} onChange={e => setFormData({...formData, royaltyValue: e.target.value})} />
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
                 {formData.ownerPin && <p><strong>POS PIN:</strong> {formData.ownerPin}</p>}
               </div>
               <p className="text-sm text-muted-foreground">
                 {t('The system will automatically create a branch and user credentials for the franchise owner.', 'ระบบจะทำการสร้างสาขาและบัญชีผู้ใช้งานสำหรับเจ้าของแฟรนไชส์โดยอัตโนมัติ')}
               </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex justify-between border-t pt-4">
             <button disabled={step === 1} onClick={handlePrev} className="btn btn-secondary px-6">
               {t('Back', 'ย้อนกลับ')}
             </button>
             {step < 4 ? (
               <button onClick={handleNext} className="btn btn-primary px-6">
                 {t('Next', 'ถัดไป')}
               </button>
             ) : (
               <button onClick={handleSubmit} disabled={onboard.isPending} className="btn btn-primary px-6">
                 {onboard.isPending ? t('Creating...', 'กำลังสร้าง...') : t('Confirm & Create Franchise', 'ยืนยันและสร้างแฟรนไชส์')}
               </button>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};
