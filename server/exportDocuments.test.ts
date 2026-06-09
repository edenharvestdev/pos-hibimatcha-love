import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock staff context for staffAdminProcedure
function createStaffAdminContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {
        authorization: "Bearer mock-token",
      },
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: 1,
      currentBranchId: 1,
      employeeCode: "EMP001",
    },
  };
}

describe("exportDocuments router", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    ctx = createStaffAdminContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("getNextNumber", () => {
    it("returns a padded number string for receipt_tax_invoice", async () => {
      const result = await caller.exportDocuments.getNextNumber({ docType: "receipt_tax_invoice" });
      expect(result).toMatch(/^\d{8}$/);
      expect(result.length).toBe(8);
    });

    it("returns a padded number string for shipping_note", async () => {
      const result = await caller.exportDocuments.getNextNumber({ docType: "shipping_note" });
      expect(result).toMatch(/^\d{8}$/);
    });
  });

  describe("list", () => {
    it("returns an array (possibly empty)", async () => {
      const result = await caller.exportDocuments.list({ docType: "receipt_tax_invoice", limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });

    it("filters by docType", async () => {
      const result = await caller.exportDocuments.list({ docType: "shipping_note", limit: 5 });
      expect(Array.isArray(result)).toBe(true);
      // All returned items should be shipping_note type
      for (const doc of result) {
        expect(doc.docType).toBe("shipping_note");
      }
    });
  });

  describe("create and CRUD flow", () => {
    const sampleInvoice = {
      docType: "receipt_tax_invoice" as const,
      companyName: "บริษัท อากาเป้ เอสเซนส์ กรุ๊ป จำกัด",
      companyAddress: "55/60 ซอยนวมินทร์111",
      companyTaxId: "0105568070121",
      companyBranch: "สำนักงานใหญ่",
      customerName: "ร้านกาแฟ ABC",
      customerAddress: "123 ถนนสุขุมวิท",
      customerTaxId: "1234567890123",
      documentNumber: "INV-TEST-001",
      documentDate: "2026-05-29",
      items: [
        { no: 1, productCode: "MC001", description: "Matcha Latte", quantity: 10, unit: "แก้ว", unitPrice: 65, totalPrice: 650 },
        { no: 2, productCode: "MC002", description: "Matcha Frappe", quantity: 5, unit: "แก้ว", unitPrice: 75, totalPrice: 375 },
      ],
      subtotal: 1025,
      discount: 0,
      totalBeforeVat: 957.94,
      vatRate: 7,
      vatAmount: 67.06,
      grandTotal: 1025,
      amountInWords: "หนึ่งพันยี่สิบห้าบาทถ้วน",
    };

    it("creates a document and returns id + documentNumber", async () => {
      const result = await caller.exportDocuments.create(sampleInvoice);
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("documentNumber", "INV-TEST-001");
      expect(typeof result.id).toBe("number");
    });

    it("retrieves a created document by id", async () => {
      const created = await caller.exportDocuments.create({
        ...sampleInvoice,
        documentNumber: "INV-TEST-002",
      });

      const doc = await caller.exportDocuments.getById({ id: created.id });
      expect(doc).not.toBeNull();
      expect(doc!.documentNumber).toBe("INV-TEST-002");
      expect(doc!.docType).toBe("receipt_tax_invoice");
      expect(doc!.customerName).toBe("ร้านกาแฟ ABC");
    });

    it("updates a document", async () => {
      const created = await caller.exportDocuments.create({
        ...sampleInvoice,
        documentNumber: "INV-TEST-003",
      });

      const updateResult = await caller.exportDocuments.update({
        id: created.id,
        data: {
          ...sampleInvoice,
          documentNumber: "INV-TEST-003",
          customerName: "ร้านกาแฟ XYZ",
          grandTotal: 2000,
        },
      });
      expect(updateResult.success).toBe(true);

      const updated = await caller.exportDocuments.getById({ id: created.id });
      expect(updated!.customerName).toBe("ร้านกาแฟ XYZ");
    });

    it("deletes a document", async () => {
      const created = await caller.exportDocuments.create({
        ...sampleInvoice,
        documentNumber: "INV-TEST-DEL",
      });

      const deleteResult = await caller.exportDocuments.delete({ id: created.id });
      expect(deleteResult.success).toBe(true);

      const deleted = await caller.exportDocuments.getById({ id: created.id });
      expect(deleted).toBeNull();
    });
  });

  describe("pos_receipt", () => {
    it("getNextNumber returns YYYY + 12-digit format for pos_receipt", async () => {
      const result = await caller.exportDocuments.getNextNumber({ docType: "pos_receipt" });
      expect(result).toMatch(/^\d{16}$/); // YYYY + 12 digits = 16 chars
      expect(result.startsWith(String(new Date().getFullYear()))).toBe(true);
    });

    it("creates a pos_receipt document with POS-specific fields", async () => {
      const samplePosReceipt = {
        docType: "pos_receipt" as const,
        companyName: "Hibi Matcha Caf\u00e9",
        companyAddress: "55/60 \u0e0b\u0e2d\u0e22\u0e19\u0e27\u0e21\u0e34\u0e19\u0e17\u0e23\u0e4c111",
        companyTaxId: "0105568070121",
        customerName: "",
        customerAddress: "",
        documentNumber: "2026000000000001",
        documentDate: "2026-05-29",
        items: [
          { no: 1, productCode: "HBM01M18L", description: "Matcha Latte (Milk Whisk)", quantity: 1, unit: "\u0e41\u0e01\u0e49\u0e27", unitPrice: 79, totalPrice: 99, options: [{ name: "Oat Milk \u0e19\u0e21\u0e42\u0e2d\u0e4a\u0e15", priceAdjustment: 20 }] },
        ],
        subtotal: 99,
        vatRate: 7,
        vatAmount: 6.93,
        grandTotal: 99,
        branchName: "\u0e2a\u0e32\u0e02\u0e32\u0e25\u0e32\u0e14\u0e1e\u0e23\u0e49\u0e32\u0e2771",
        pickupNumber: "002",
        orderNumber: "0002",
        deviceSN: "D402P5C9J0888",
        receiptNumber: "2026000000000143",
        paymentMethod: "\u0e40\u0e07\u0e34\u0e19\u0e42\u0e2d\u0e19",
        paidAmount: 99,
        roundingAmount: 0,
      };

      const result = await caller.exportDocuments.create(samplePosReceipt);
      expect(result).toHaveProperty("id");
      expect(result.documentNumber).toBe("2026000000000001");

      // Verify it can be retrieved
      const doc = await caller.exportDocuments.getById({ id: result.id });
      expect(doc).not.toBeNull();
      expect(doc!.docType).toBe("pos_receipt");
    });

    it("lists pos_receipt documents", async () => {
      const result = await caller.exportDocuments.list({ docType: "pos_receipt", limit: 10 });
      expect(Array.isArray(result)).toBe(true);
      for (const doc of result) {
        expect(doc.docType).toBe("pos_receipt");
      }
    });
  });

  describe("shipping_note create", () => {
    const sampleShipping = {
      docType: "shipping_note" as const,
      companyName: "บริษัท อากาเป้ เอสเซนส์ กรุ๊ป จำกัด",
      companyAddress: "55/60 ซอยนวมินทร์111",
      companyTaxId: "0105568070121",
      customerName: "ร้าน Hibi สาขา 2",
      customerAddress: "456 ถนนลาดพร้าว",
      documentNumber: "SHP-TEST-001",
      documentDate: "2026-05-29",
      items: [
        { no: 1, description: "ผงมัทฉะ Premium", quantity: 500, unit: "กรัม", unitPrice: 2.5, totalPrice: 1250 },
      ],
      subtotal: 1250,
      vatRate: 7,
      vatAmount: 87.5,
      grandTotal: 1337.5,
      note: "สินค้าตามเอกสารนี้เป็นสมบัติของผู้ขาย",
    };

    it("creates a shipping note successfully", async () => {
      const result = await caller.exportDocuments.create(sampleShipping);
      expect(result).toHaveProperty("id");
      expect(result.documentNumber).toBe("SHP-TEST-001");
    });
  });
});
