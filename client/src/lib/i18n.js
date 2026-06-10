// ============================================
// i18n: Lightweight translation system for Hibi Matcha POS
// Usage: const { t } = useApp();  t('key') or t('english', 'thai') for inline
// ============================================

const translations = {
  // ---- Common / Shared ----
  'search': { en: 'Search', th: 'ค้นหา' },
  'save': { en: 'Save', th: 'บันทึก' },
  'cancel': { en: 'Cancel', th: 'ยกเลิก' },
  'delete': { en: 'Delete', th: 'ลบ' },
  'edit': { en: 'Edit', th: 'แก้ไข' },
  'add': { en: 'Add', th: 'เพิ่ม' },
  'close': { en: 'Close', th: 'ปิด' },
  'confirm': { en: 'Confirm', th: 'ยืนยัน' },
  'back': { en: 'Back', th: 'กลับ' },
  'next': { en: 'Next', th: 'ถัดไป' },
  'loading': { en: 'Loading...', th: 'กำลังโหลด...' },
  'noData': { en: 'No data', th: 'ไม่มีข้อมูล' },
  'actions': { en: 'Actions', th: 'การดำเนินการ' },
  'status': { en: 'Status', th: 'สถานะ' },
  'active': { en: 'Active', th: 'ใช้งาน' },
  'inactive': { en: 'Inactive', th: 'ไม่ใช้งาน' },
  'all': { en: 'All', th: 'ทั้งหมด' },
  'name': { en: 'Name', th: 'ชื่อ' },
  'price': { en: 'Price', th: 'ราคา' },
  'quantity': { en: 'Quantity', th: 'จำนวน' },
  'total': { en: 'Total', th: 'รวม' },
  'date': { en: 'Date', th: 'วันที่' },
  'time': { en: 'Time', th: 'เวลา' },
  'type': { en: 'Type', th: 'ประเภท' },
  'note': { en: 'Note', th: 'หมายเหตุ' },
  'description': { en: 'Description', th: 'รายละเอียด' },
  'settings': { en: 'Settings', th: 'ตั้งค่า' },
  'export': { en: 'Export', th: 'ส่งออก' },
  'import': { en: 'Import', th: 'นำเข้า' },
  'filter': { en: 'Filter', th: 'กรอง' },
  'reset': { en: 'Reset', th: 'รีเซ็ต' },
  'yes': { en: 'Yes', th: 'ใช่' },
  'no': { en: 'No', th: 'ไม่' },
  'success': { en: 'Success', th: 'สำเร็จ' },
  'error': { en: 'Error', th: 'ข้อผิดพลาด' },
  'warning': { en: 'Warning', th: 'คำเตือน' },
  'today': { en: 'Today', th: 'วันนี้' },
  'yesterday': { en: 'Yesterday', th: 'เมื่อวาน' },
  'thisWeek': { en: 'This week', th: 'สัปดาห์นี้' },
  'thisMonth': { en: 'This month', th: 'เดือนนี้' },

  // ---- Navigation ----
  'nav.dashboard': { en: 'Dashboard', th: 'แดชบอร์ด' },
  'nav.pos': { en: 'POS', th: 'POS' },
  'nav.menu': { en: 'Menu', th: 'เมนู' },
  'nav.inventory': { en: 'Inventory', th: 'คลังวัตถุดิบ' },
  'nav.orders': { en: 'Orders', th: 'ออเดอร์' },
  'nav.kitchen': { en: 'Kitchen', th: 'ครัว' },
  'nav.staff': { en: 'Staff', th: 'พนักงาน' },
  'nav.reports': { en: 'Reports', th: 'รายงาน' },
  'nav.sop': { en: 'SOPs', th: 'SOP' },
  'nav.settings': { en: 'Settings', th: 'ตั้งค่า' },
  'nav.categories': { en: 'Categories', th: 'หมวดหมู่' },
  'nav.options': { en: 'Options', th: 'ตัวเลือก' },
  'nav.discounts': { en: 'Discounts', th: 'ส่วนลด' },
  'nav.payments': { en: 'Payments', th: 'ช่องทางชำระ' },
  'nav.suppliers': { en: 'Suppliers', th: 'ซัพพลายเออร์' },
  'nav.branches': { en: 'Branches', th: 'สาขา' },
  'nav.delivery': { en: 'Delivery', th: 'เดลิเวอรี่' },
  'nav.expenses': { en: 'Expenses', th: 'ค่าใช้จ่าย' },
  'nav.requisitions': { en: 'Requisitions', th: 'ใบเบิก' },
  'nav.distribute': { en: 'Distribute', th: 'กระจายสินค้า' },
  'nav.inventoryLots': { en: 'Expiry Lots', th: 'LOT / วันหมดอายุ' },

  // ---- POS Terminal ----
  'pos.terminal': { en: 'Terminal', th: 'เทอร์มินัล' },
  'pos.searchMenu': { en: 'Search menu…', th: 'ค้นหาเมนู…' },
  'pos.scan': { en: 'Scan', th: 'สแกน' },
  'pos.kitchen': { en: 'Kitchen', th: 'ครัว' },
  'pos.orders': { en: 'Orders', th: 'ออเดอร์' },
  'pos.delivery': { en: 'Delivery', th: 'เดลิเวอรี่' },
  'pos.sop': { en: 'SOP', th: 'SOP' },
  'pos.exitPOS': { en: 'Exit POS', th: 'ออกจาก POS' },
  'pos.cart': { en: 'Cart', th: 'ตะกร้า' },
  'pos.emptyCart': { en: 'Cart is empty', th: 'ตะกร้าว่าง' },
  'pos.addItems': { en: 'Add items from the menu', th: 'เพิ่มรายการจากเมนู' },
  'pos.subtotal': { en: 'Subtotal', th: 'ยอดรวม' },
  'pos.vat': { en: 'VAT 7%', th: 'VAT 7%' },
  'pos.grandTotal': { en: 'Grand Total', th: 'ยอดสุทธิ' },
  'pos.placeOrder': { en: 'Place Order', th: 'สั่งออเดอร์' },
  'pos.holdOrder': { en: 'Hold', th: 'พักออเดอร์' },
  'pos.clearCart': { en: 'Clear', th: 'ล้าง' },
  'pos.dineIn': { en: 'Dine-in', th: 'ทานที่ร้าน' },
  'pos.takeaway': { en: 'Takeaway', th: 'สั่งกลับบ้าน' },
  'pos.grab': { en: 'Grab', th: 'Grab' },
  'pos.lineman': { en: 'LINE MAN', th: 'LINE MAN' },
  'pos.shopee': { en: 'Shopee Food', th: 'Shopee Food' },
  'pos.robinhood': { en: 'Robinhood', th: 'Robinhood' },
  'pos.foodpanda': { en: 'FoodPanda', th: 'FoodPanda' },
  'pos.online': { en: 'Online · Synced', th: 'ออนไลน์ · ซิงค์แล้ว' },
  'pos.held': { en: 'held', th: 'พัก' },
  'pos.noItems': { en: 'No menu items available', th: 'ไม่มีเมนูให้เลือก' },
  'pos.addInBackoffice': { en: 'Add items in Backoffice → Menu', th: 'เพิ่มเมนูที่หลังบ้าน → เมนู' },
  'pos.outOfStock': { en: 'Out of stock', th: 'หมด' },

  // ---- Payment ----
  'payment.title': { en: 'Payment', th: 'ชำระเงิน' },
  'payment.selectMethod': { en: 'Select payment method', th: 'เลือกช่องทางชำระ' },
  'payment.cash': { en: 'Cash', th: 'เงินสด' },
  'payment.transfer': { en: 'Transfer', th: 'โอน' },
  'payment.qr': { en: 'QR Code', th: 'QR Code' },
  'payment.card': { en: 'Card', th: 'บัตร' },
  'payment.pay': { en: 'Confirm Payment', th: 'ยืนยันชำระ' },
  'payment.change': { en: 'Change', th: 'เงินทอน' },
  'payment.received': { en: 'Received', th: 'รับมา' },
  'payment.amountDue': { en: 'Amount Due', th: 'ยอดที่ต้องชำระ' },
  'payment.backToOrder': { en: 'Back to order', th: 'กลับไปออเดอร์' },

  // ---- Receipt ----
  'receipt.title': { en: 'Receipt', th: 'ใบเสร็จ' },
  'receipt.orderComplete': { en: 'Order Complete!', th: 'ออเดอร์เสร็จสิ้น!' },
  'receipt.print': { en: 'Print Receipt', th: 'พิมพ์ใบเสร็จ' },
  'receipt.newOrder': { en: 'New Order', th: 'ออเดอร์ใหม่' },
  'receipt.thankYou': { en: 'Thank you!', th: 'ขอบคุณค่ะ!' },

  // ---- Kitchen ----
  'kitchen.title': { en: 'Kitchen Display', th: 'หน้าจอครัว' },
  'kitchen.preparing': { en: 'Preparing', th: 'กำลังทำ' },
  'kitchen.ready': { en: 'Ready', th: 'พร้อมเสิร์ฟ' },
  'kitchen.served': { en: 'Served', th: 'เสิร์ฟแล้ว' },
  'kitchen.markPreparing': { en: 'Start', th: 'เริ่มทำ' },
  'kitchen.markReady': { en: 'Ready', th: 'เสร็จ' },
  'kitchen.markServed': { en: 'Served', th: 'เสิร์ฟแล้ว' },
  'kitchen.noTickets': { en: 'No active tickets', th: 'ไม่มีรายการรอ' },

  // ---- Orders ----
  'orders.title': { en: 'Order History', th: 'ประวัติออเดอร์' },
  'orders.pending': { en: 'Pending', th: 'รอชำระ' },
  'orders.completed': { en: 'Completed', th: 'เสร็จสิ้น' },
  'orders.cancelled': { en: 'Cancelled', th: 'ยกเลิก' },
  'orders.paid': { en: 'Paid', th: 'ชำระแล้ว' },
  'orders.markPaid': { en: 'Mark Paid', th: 'บันทึกชำระ' },
  'orders.viewDetail': { en: 'View', th: 'ดู' },
  'orders.syncToSheet': { en: 'Sync to Sheet', th: 'ซิงค์ไป Sheet' },
  'orders.orderNo': { en: 'Order #', th: 'ออเดอร์ #' },
  'orders.items': { en: 'items', th: 'รายการ' },

  // ---- Low Stock Alert ----
  'stock.lowAlert': { en: 'Low stock alert', th: 'วัตถุดิบใกล้หมด' },
  'stock.remaining': { en: 'remaining', th: 'เหลือ' },
  'stock.others': { en: 'others', th: 'อื่นๆ' },

  // ---- Inventory ----
  'inventory.title': { en: 'Inventory', th: 'คลังวัตถุดิบ' },
  'inventory.allStock': { en: 'All stock', th: 'สต็อกทั้งหมด' },
  'inventory.atBranch': { en: 'at this branch', th: 'ที่สาขานี้' },
  'inventory.addItem': { en: 'Add Item', th: 'เพิ่มวัตถุดิบ' },
  'inventory.adjustStock': { en: 'Adjust Stock', th: 'ปรับสต็อก' },
  'inventory.stockIn': { en: 'Stock In', th: 'รับเข้า' },
  'inventory.stockOut': { en: 'Stock Out', th: 'เบิกออก' },
  'inventory.transfer': { en: 'Transfer', th: 'โอนย้าย' },
  'inventory.movements': { en: 'Movements', th: 'ประวัติเคลื่อนไหว' },
  'inventory.currentStock': { en: 'Current Stock', th: 'สต็อกปัจจุบัน' },
  'inventory.minStock': { en: 'Min Stock', th: 'สต็อกขั้นต่ำ' },
  'inventory.unit': { en: 'Unit', th: 'หน่วย' },
  'inventory.category': { en: 'Category', th: 'หมวดหมู่' },
  'inventory.noBranch': { en: 'No branch selected', th: 'ยังไม่ได้เลือกสาขา' },
  'inventory.costPerUnit': { en: 'Cost/Unit', th: 'ต้นทุน/หน่วย' },

  // ---- Menu Management ----
  'menu.title': { en: 'Menu Management', th: 'จัดการเมนู' },
  'menu.addItem': { en: 'Add Menu Item', th: 'เพิ่มเมนู' },
  'menu.editItem': { en: 'Edit Menu Item', th: 'แก้ไขเมนู' },
  'menu.itemName': { en: 'Item Name', th: 'ชื่อเมนู' },
  'menu.nameThai': { en: 'Thai Name', th: 'ชื่อภาษาไทย' },
  'menu.basePrice': { en: 'Base Price', th: 'ราคาพื้นฐาน' },
  'menu.costPrice': { en: 'Cost Price', th: 'ราคาต้นทุน' },
  'menu.category': { en: 'Category', th: 'หมวดหมู่' },
  'menu.options': { en: 'Options', th: 'ตัวเลือก' },
  'menu.recipe': { en: 'Recipe', th: 'สูตร' },
  'menu.archive': { en: 'Archive', th: 'เก็บ' },
  'menu.featured': { en: 'Featured', th: 'แนะนำ' },
  'menu.sku': { en: 'SKU', th: 'SKU' },

  // ---- Categories ----
  'categories.title': { en: 'Categories', th: 'หมวดหมู่' },
  'categories.addNew': { en: 'Add Category', th: 'เพิ่มหมวดหมู่' },
  'categories.noItems': { en: 'No categories yet', th: 'ยังไม่มีหมวดหมู่' },

  // ---- Staff ----
  'staff.title': { en: 'Staff Management', th: 'จัดการพนักงาน' },
  'staff.addNew': { en: 'Add Staff', th: 'เพิ่มพนักงาน' },
  'staff.firstName': { en: 'First Name', th: 'ชื่อ' },
  'staff.lastName': { en: 'Last Name', th: 'นามสกุล' },
  'staff.role': { en: 'Role', th: 'ตำแหน่ง' },
  'staff.pin': { en: 'PIN', th: 'PIN' },
  'staff.branches': { en: 'Branches', th: 'สาขา' },

  // ---- Discounts ----
  'discounts.title': { en: 'Discounts', th: 'ส่วนลด' },
  'discounts.addNew': { en: 'Add Discount', th: 'เพิ่มส่วนลด' },
  'discounts.code': { en: 'Code', th: 'โค้ด' },
  'discounts.percentage': { en: 'Percentage', th: 'เปอร์เซ็นต์' },
  'discounts.fixedAmount': { en: 'Fixed Amount', th: 'จำนวนเงิน' },

  // ---- Dashboard ----
  'dashboard.title': { en: 'Dashboard', th: 'แดชบอร์ด' },
  'dashboard.todaySales': { en: "Today's Sales", th: 'ยอดขายวันนี้' },
  'dashboard.totalOrders': { en: 'Total Orders', th: 'ออเดอร์ทั้งหมด' },
  'dashboard.avgOrder': { en: 'Avg Order', th: 'ค่าเฉลี่ย/ออเดอร์' },
  'dashboard.topItems': { en: 'Top Items', th: 'เมนูขายดี' },
  'dashboard.recentOrders': { en: 'Recent Orders', th: 'ออเดอร์ล่าสุด' },
  'dashboard.revenue': { en: 'Revenue', th: 'รายได้' },
  'dashboard.profit': { en: 'Profit', th: 'กำไร' },

  // ---- SOP ----
  'sop.title': { en: 'Standard Operating Procedures', th: 'ขั้นตอนปฏิบัติงาน' },
  'sop.myTasks': { en: 'My Tasks', th: 'งานของฉัน' },
  'sop.library': { en: 'SOP Library', th: 'คลัง SOP' },
  'sop.create': { en: 'Create SOP', th: 'สร้าง SOP' },
  'sop.steps': { en: 'Steps', th: 'ขั้นตอน' },
  'sop.published': { en: 'Published', th: 'เผยแพร่แล้ว' },
  'sop.draft': { en: 'Draft', th: 'แบบร่าง' },

  // ---- Branches ----
  'branch.title': { en: 'Branches', th: 'สาขา' },
  'branch.switchBranch': { en: 'Switch Branch', th: 'เปลี่ยนสาขา' },
  'branch.currentBranch': { en: 'Current Branch', th: 'สาขาปัจจุบัน' },
  'branch.hq': { en: 'HQ', th: 'สำนักงานใหญ่' },
  'branch.franchise': { en: 'Franchise', th: 'แฟรนไชส์' },

  // ---- Reports ----
  'reports.title': { en: 'Reports', th: 'รายงาน' },
  'reports.salesReport': { en: 'Sales Report', th: 'รายงานยอดขาย' },
  'reports.inventoryReport': { en: 'Inventory Report', th: 'รายงานคลัง' },
  'reports.staffReport': { en: 'Staff Report', th: 'รายงานพนักงาน' },
  'reports.exportPDF': { en: 'Export PDF', th: 'ส่งออก PDF' },
  'reports.exportExcel': { en: 'Export Excel', th: 'ส่งออก Excel' },

  // ---- Auth ----
  'auth.login': { en: 'Sign In', th: 'เข้าสู่ระบบ' },
  'auth.logout': { en: 'Sign Out', th: 'ออกจากระบบ' },
  'auth.pin': { en: 'Enter PIN', th: 'กรอก PIN' },
  'auth.welcome': { en: 'Welcome', th: 'ยินดีต้อนรับ' },
  'auth.selectBranch': { en: 'Select Branch', th: 'เลือกสาขา' },

  // ---- Landing ----
  'landing.welcomeBack': { en: 'Welcome back', th: 'ยินดีต้อนรับ' },
  'landing.chooseDestination': { en: 'Choose where you\'re going today.', th: 'เลือกที่ที่จะไปวันนี้' },
  'landing.openPOS': { en: 'Open POS', th: 'เปิด POS' },
  'landing.posDesc': { en: 'Take orders, kitchen, sales', th: 'รับออเดอร์ · ครัว · ขาย' },
  'landing.quickPIN': { en: 'Quick PIN', th: 'PIN เร็ว' },
  'landing.forStaff': { en: 'For staff', th: 'สำหรับพนักงาน' },
  'landing.backoffice': { en: 'Backoffice', th: 'หลังบ้าน' },
  'landing.backofficeDesc': { en: 'Menu, inventory, staff, SOPs', th: 'เมนู · คลัง · พนักงาน · SOP' },
  'landing.signIn': { en: 'Sign in', th: 'เข้าสู่ระบบ' },
  'landing.forManagement': { en: 'For management', th: 'สำหรับผู้บริหาร' },
  'landing.lastVisited': { en: 'Last visited', th: 'เข้าล่าสุด' },
  'landing.branch': { en: 'Branch:', th: 'สาขา:' },

  // ---- Delivery ----
  'delivery.title': { en: 'Delivery Orders', th: 'ออเดอร์เดลิเวอรี่' },
  'delivery.platform': { en: 'Platform', th: 'แพลตฟอร์ม' },
  'delivery.accept': { en: 'Accept', th: 'รับออเดอร์' },
  'delivery.reject': { en: 'Reject', th: 'ปฏิเสธ' },
  'delivery.preparing': { en: 'Preparing', th: 'กำลังเตรียม' },
  'delivery.readyForPickup': { en: 'Ready for pickup', th: 'พร้อมส่ง' },

  // ---- Expenses ----
  'expenses.title': { en: 'Expense Receipts', th: 'ใบเสร็จค่าใช้จ่าย' },
  'expenses.addReceipt': { en: 'Add Receipt', th: 'เพิ่มใบเสร็จ' },
  'expenses.amount': { en: 'Amount', th: 'จำนวนเงิน' },
  'expenses.vendor': { en: 'Vendor', th: 'ร้านค้า' },

  // ---- Requisitions ----
  'requisitions.title': { en: 'Requisitions', th: 'ใบเบิก' },
  'requisitions.create': { en: 'Create Requisition', th: 'สร้างใบเบิก' },
  'requisitions.pending': { en: 'Pending Approval', th: 'รออนุมัติ' },
  'requisitions.approved': { en: 'Approved', th: 'อนุมัติแล้ว' },
  'requisitions.rejected': { en: 'Rejected', th: 'ไม่อนุมัติ' },

  // ---- Distribute ----
  'distribute.title': { en: 'Distribute', th: 'กระจายสินค้า' },
  'distribute.fromBranch': { en: 'From Branch', th: 'จากสาขา' },
  'distribute.toBranch': { en: 'To Branch', th: 'ไปสาขา' },

  // ---- Suppliers ----
  'suppliers.title': { en: 'Suppliers & Franchise', th: 'ซัพพลายเออร์และแฟรนไชส์' },
  'suppliers.addNew': { en: 'Add Supplier', th: 'เพิ่มซัพพลายเออร์' },

  // ---- Settings ----
  'settings.title': { en: 'Settings', th: 'ตั้งค่า' },
  'settings.general': { en: 'General', th: 'ทั่วไป' },
  'settings.printing': { en: 'Printing', th: 'เครื่องพิมพ์' },
  'settings.automation': { en: 'Automation', th: 'ระบบอัตโนมัติ' },
  'settings.language': { en: 'Language', th: 'ภาษา' },
  'settings.theme': { en: 'Theme', th: 'ธีม' },
  'settings.dark': { en: 'Dark', th: 'มืด' },
  'settings.light': { en: 'Light', th: 'สว่าง' },

  // ---- Settings page tabs ----
  'settings.title': { en: 'Settings', th: 'ตั้งค่า' },
  'settings.desc': { en: 'Manage your account, preferences, and integrations', th: 'จัดการบัญชี การตั้งค่า และการเชื่อมต่อ' },
  'settings.profile': { en: 'Profile', th: 'โปรไฟล์' },
  'settings.automation': { en: 'Automation', th: 'ระบบอัตโนมัติ' },
  'settings.appearance': { en: 'Appearance', th: 'ธีมและหน้าตา' },
  'settings.notifications': { en: 'Notifications', th: 'การแจ้งเตือน' },
  'settings.security': { en: 'Security', th: 'ความปลอดภัย' },
  'settings.branches': { en: 'Branches', th: 'สาขา' },
  'settings.langRegion': { en: 'Language & Region', th: 'ภาษาและภูมิภาค' },
  'settings.billing': { en: 'Billing', th: 'การเงิน' },
  'settings.integrations': { en: 'Integrations', th: 'การเชื่อมต่อ' },
  'settings.payment': { en: 'Payment & QR', th: 'การชำระเงินและ QR' },
  'settings.receipt': { en: 'Receipt & Print', th: 'ใบเสร็จและการพิมพ์' },
  'settings.hardware': { en: 'Hardware', th: 'อุปกรณ์' },
  'settings.data': { en: 'Data & Privacy', th: 'ข้อมูลและความเป็นส่วนตัว' },
  'settings.about': { en: 'About', th: 'เกี่ยวกับ' },
  'settings.resetDefaults': { en: 'Reset to defaults', th: 'รีเซ็ตเป็นค่าเริ่มต้น' },
  'settings.profileUpdated': { en: 'Profile updated.', th: 'อัปเดตโปรไฟล์แล้ว' },
  'settings.firstName': { en: 'First Name', th: 'ชื่อ' },
  'settings.lastName': { en: 'Last Name', th: 'นามสกุล' },
  'settings.firstNameThai': { en: 'First Name (Thai)', th: 'ชื่อ (ไทย)' },
  'settings.lastNameThai': { en: 'Last Name (Thai)', th: 'นามสกุล (ไทย)' },
  'settings.email': { en: 'Email', th: 'อีเมล' },
  'settings.phone': { en: 'Phone', th: 'เบอร์โทร' },
  'settings.saveChanges': { en: 'Save Changes', th: 'บันทึกการเปลี่ยนแปลง' },
  'settings.saving': { en: 'Saving…', th: 'กำลังบันทึก…' },
  'settings.connected': { en: 'Connected', th: 'เชื่อมต่อแล้ว' },
  'settings.connect': { en: 'Connect', th: 'เชื่อมต่อ' },
  'settings.configure': { en: 'Configure', th: 'ตั้งค่า' },
  'settings.comingSoon': { en: 'Coming up', th: 'เร็วๆ นี้' },

  // ---- Inventory page ----
  'inv.title': { en: 'Inventory', th: 'คลังวัตถุดิบ' },
  'inv.overview': { en: 'Overview', th: 'ภาพรวม' },
  'inv.items': { en: 'Items', th: 'รายการ' },
  'inv.stock': { en: 'Stock', th: 'สต็อก' },
  'inv.movements': { en: 'Movements', th: 'ประวัติเคลื่อนไหว' },
  'inv.transfers': { en: 'Transfers', th: 'โอนย้าย' },
  'inv.receiving': { en: 'Receiving', th: 'รับเข้า' },
  'inv.addItem': { en: 'Add Item', th: 'เพิ่มรายการ' },
  'inv.editItem': { en: 'Edit Item', th: 'แก้ไขรายการ' },
  'inv.deleteItem': { en: 'Delete Item', th: 'ลบรายการ' },
  'inv.lowStock': { en: 'Low Stock', th: 'สต็อกต่ำ' },
  'inv.totalValue': { en: 'Total Value', th: 'มูลค่ารวม' },
  'inv.totalItems': { en: 'Total Items', th: 'จำนวนรายการ' },
  'inv.recentMovements': { en: 'Recent Movements', th: 'เคลื่อนไหวล่าสุด' },
  'inv.received': { en: 'Received', th: 'รับเข้า' },
  'inv.used': { en: 'Used', th: 'ใช้ไป' },
  'inv.adjusted': { en: 'Adjusted', th: 'ปรับปรุง' },
  'inv.transferred': { en: 'Transferred', th: 'โอนย้าย' },
  'inv.unit': { en: 'Unit', th: 'หน่วย' },
  'inv.costPerUnit': { en: 'Cost/Unit', th: 'ต้นทุน/หน่วย' },
  'inv.minStock': { en: 'Min Stock', th: 'สต็อกขั้นต่ำ' },
  'inv.currentStock': { en: 'Current Stock', th: 'สต็อกปัจจุบัน' },
  'inv.distribute': { en: 'Distribute to branches', th: 'กระจายไปสาขา' },
  'inv.export': { en: 'Export', th: 'ส่งออก' },
  'inv.noItems': { en: 'No items yet', th: 'ยังไม่มีรายการ' },

  // ---- Admin page ----
  'admin.title': { en: 'Admin', th: 'ผู้ดูแล' },
  'admin.dashboard': { en: 'Dashboard', th: 'แดชบอร์ด' },
  'admin.menu': { en: 'Menu Management', th: 'จัดการเมนู' },
  'admin.categories': { en: 'Categories', th: 'หมวดหมู่' },
  'admin.options': { en: 'Options', th: 'ตัวเลือก' },
  'admin.discounts': { en: 'Discounts', th: 'ส่วนลด' },
  'admin.staff': { en: 'Staff', th: 'พนักงาน' },
  'admin.reports': { en: 'Reports', th: 'รายงาน' },
  'admin.addMenu': { en: 'Add Menu Item', th: 'เพิ่มเมนู' },
  'admin.editMenu': { en: 'Edit Menu Item', th: 'แก้ไขเมนู' },
  'admin.archive': { en: 'Archive', th: 'เก็บถาวร' },
  'admin.restore': { en: 'Restore', th: 'กู้คืน' },
  'admin.menuName': { en: 'Menu Name', th: 'ชื่อเมนู' },
  'admin.menuNameThai': { en: 'Menu Name (Thai)', th: 'ชื่อเมนู (ไทย)' },
  'admin.basePrice': { en: 'Base Price', th: 'ราคาพื้นฐาน' },
  'admin.costPrice': { en: 'Cost Price', th: 'ราคาต้นทุน' },
  'admin.memberPrice': { en: 'Member Price', th: 'ราคาสมาชิก' },
  'admin.description': { en: 'Description', th: 'คำอธิบาย' },
  'admin.sku': { en: 'SKU', th: 'รหัสสินค้า' },
  'admin.todaySales': { en: "Today's Sales", th: 'ยอดขายวันนี้' },
  'admin.todayOrders': { en: "Today's Orders", th: 'ออเดอร์วันนี้' },
  'admin.avgOrderValue': { en: 'Avg Order Value', th: 'มูลค่าเฉลี่ย/ออเดอร์' },
  'admin.topSelling': { en: 'Top Selling', th: 'ขายดี' },
  'admin.revenueChart': { en: 'Revenue', th: 'รายได้' },
  'admin.noMenuItems': { en: 'No menu items yet', th: 'ยังไม่มีเมนู' },
  'admin.createFirst': { en: 'Create your first menu item', th: 'สร้างเมนูแรกของคุณ' },
  'admin.linkedMenus': { en: 'Linked Menus', th: 'เมนูที่ผูกไว้' },
  'admin.editLinkedMenus': { en: 'Edit Linked Menus', th: 'แก้ไขเมนูที่ผูกไว้' },
  'admin.selectAll': { en: 'Select All', th: 'เลือกทั้งหมด' },
  'admin.deselectAll': { en: 'Deselect All', th: 'ยกเลิกทั้งหมด' },
};

/**
 * Create a translation function for the given language
 * Supports both key-based lookup and inline (en, th) fallback
 * @param {string} lang - 'en' or 'th'
 * @returns {function} t(keyOrEn, th?)
 */
export function createT(lang) {
  return function t(keyOrEn, th) {
    // If second argument provided, use inline mode (backward compatible)
    if (th !== undefined) {
      return lang === 'th' ? (th || keyOrEn) : keyOrEn;
    }
    // Key-based lookup
    const entry = translations[keyOrEn];
    if (entry) {
      return entry[lang] || entry.en || keyOrEn;
    }
    // Fallback: return the key itself
    return keyOrEn;
  };
}

/**
 * Get display name for a DB item based on current language.
 * Items have: name (English), nameThai (Thai), nameJapanese (optional)
 * Fallback: if selected language name is empty, fall back to Thai then English.
 * @param {object} item - DB item with name, nameThai, nameJapanese fields
 * @param {string} lang - 'en' or 'th' or 'ja'
 * @returns {string}
 */
export function displayName(item, lang) {
  if (!item) return '';
  if (lang === 'th') return item.nameThai || item.name || '';
  if (lang === 'ja') return item.nameJapanese || item.nameThai || item.name || '';
  // English or default
  return item.name || item.nameThai || '';
}

export { translations };
export default translations;
