import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { TopActionBar, EmptyState, useHashRoute } from "@/components";
import { IconBook, IconChevDown } from "@/icons";

export const PageCustomerApp = () => {
  const [route, setRoute] = useHashRoute();
  const branchId = 1; // HARDCODED for now, should come from URL or branch selection
  const { data, isLoading } = trpc.customerOrders.getBranchMenu.useQuery({ branchId });

  const categories = data?.categories || [];
  const items = data?.items || [];

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground animate-pulse">
        กำลังโหลดเมนู...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-serif text-primary">Hibi Matcha</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            สาขา Hibi House <IconChevDown className="w-3 h-3" />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 bg-secondary text-secondary-foreground rounded-full" onClick={() => setRoute('/customer/profile')}>
            <IconBook className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="overflow-x-auto whitespace-nowrap p-4 border-b flex gap-2 sticky top-[73px] bg-background z-10">
        <button className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          All
        </button>
        {categories.map(c => (
          <button key={c.id} className="px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
            {c.nameThai || c.name}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <main className="flex-1 p-4">
        {items.length === 0 ? (
          <EmptyState icon={IconBook} title="ไม่มีเมนู" description="สาขานี้ยังไม่มีเมนูเปิดขาย" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-card rounded-2xl overflow-hidden border shadow-sm flex flex-col cursor-pointer active:scale-95 transition-transform">
                <div className="aspect-square bg-muted relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{item.nameThai || item.name}</h3>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-medium text-primary">฿{Number(item.basePrice)}</span>
                    <button className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg leading-none">
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Nav / Cart preview */}
      <div className="sticky bottom-0 bg-card border-t p-4 pb-8 flex items-center justify-between">
         <div>
            <p className="text-sm text-muted-foreground">0 รายการ</p>
            <p className="font-bold text-lg">฿0.00</p>
         </div>
         <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold shadow-md">
           ดูตะกร้า
         </button>
      </div>
    </div>
  );
};

export const PageCustomerProfile = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto">
      <header className="p-4 border-b">
         <h1 className="text-xl font-bold">โปรไฟล์ของฉัน</h1>
      </header>
      <main className="p-4 space-y-6">
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-lg">
           <p className="opacity-80 text-sm">คะแนนสะสม Hibi Point</p>
           <h2 className="text-4xl font-bold mt-1">0 <span className="text-lg font-normal">pts</span></h2>
        </div>
        
        <div className="bg-card border rounded-xl p-4">
           <h3 className="font-semibold mb-2">ข้อมูลสมาชิก</h3>
           <p className="text-sm text-muted-foreground mb-4">ยังไม่ได้เข้าสู่ระบบ</p>
           <button className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium">เข้าสู่ระบบ / สมัครสมาชิก</button>
        </div>
      </main>
    </div>
  )
}
