# Receipt Format Notes (from real Sunmi receipt photo)

## Header
- Title: "ใบเสร็จ" (centered, bold)
- Logo: Hibi Matcha Café illustration (cup with matcha)
- Store name: "Hibi Matcha Café" (centered)
- Branch: "Hibi Matcha Cafe สาขาลาดพร้าว71" (centered, bold, large)

## Meta Section (after dashed line)
- หมายเลขการรับอาหาร: 002
- หมายเลขคำสั่งซื้อ: 0002
- วันและเวลา: 28/05/2026 13:53:16
- SN:D402P5C9J0888
- เลขที่ใบเสร็จ:2026000000000143

## Items Section
- Header: "สินค้า" | "ราคา" | "จำนวน" | "รวม"
- Format: SKU-MenuName (e.g. HBM01M18L-Matcha Latte (Milk Whisk))
- Unit price: 79.00
- Quantity: 1
- Total: 99.00 (includes options)
- Options listed below with "- " prefix:
  - Standard (พร้อมดื่ม)
  - Oat Milk นมโอ๊ต  +20.00
  - (ไซรับ 0g) ไม่หวานเลย

## Totals Section
- รวม (items count + total): 2 | 188.00
- (dashed line)
- ยอดรวมส่วนลด: (blank)
- ปัดเศษ: (blank)
- ยอดรวม: 0.00
- ภาษีมูลค่าเพิ่ม (7%): 0.00
- ยอดรวมทั้งหมด: 188.00
- (dashed line)
- (two more lines): 12.30 and 188.00

## Payment Section
- ประเภทการชำระเงิน
- เงินโอน
- ยอดชำระ | เงินโอน
- 188.00
- **188.00** (bold)

## Footer
- สาขาลาดพร้าว71 (centered)

## Key Observations
1. Receipt number format: YYYY + 12 zeros + running number (2026000000000143)
2. SN = device serial number (Sunmi terminal)
3. SKU format: HBM01M18L (HBM = Hibi Matcha, 01 = item#, M18L = size/variant)
4. Options show price adjustment inline (e.g. +20.00)
5. "หมายเลขการรับอาหาร" = pickup number (short, e.g. 002)
6. "หมายเลขคำสั่งซื้อ" = order number (e.g. 0002)
7. Table layout for items: 4 columns
8. VAT shown separately but currently 0.00 (VAT inclusive pricing)
