import { describe, it, expect, vi } from "vitest";
import {
  printToNetworkPrinter,
  checkPrinterStatus,
  generateCashDrawerCommand,
  generateTestPrintPayload,
  generateCutCommand,
  generateInitCommand,
} from "./lib/printer";

// Mock net module
vi.mock("net", () => {
  const mockSocket = {
    setTimeout: vi.fn(),
    on: vi.fn(),
    connect: vi.fn((port, ip, cb) => { cb(); }),
    write: vi.fn((data, cb) => { cb(); }),
    destroy: vi.fn(),
  };
  return { Socket: vi.fn(() => mockSocket), default: { Socket: vi.fn(() => mockSocket) } };
});

describe("Printer Service", () => {
  it("generateTestPrintPayload returns Buffer with printer name", () => {
    const buf = generateTestPrintPayload("Kitchen-01");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toContain("Kitchen-01");
    expect(buf.toString()).toContain("TEST PRINT");
  });

  it("generateCashDrawerCommand returns correct ESC/POS bytes", () => {
    const cmd = generateCashDrawerCommand();
    expect(cmd).toEqual(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
  });

  it("generateCutCommand returns GS V 0", () => {
    const cmd = generateCutCommand();
    expect(cmd).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
  });

  it("generateInitCommand returns ESC @", () => {
    const cmd = generateInitCommand();
    expect(cmd).toEqual(Buffer.from([0x1b, 0x40]));
  });

  it("printToNetworkPrinter resolves success with mocked socket", async () => {
    const result = await printToNetworkPrinter({ ipAddress: "192.168.1.100", port: 9100 }, "test data");
    expect(result.success).toBe(true);
    expect(result.message).toContain("success");
  });

  it("checkPrinterStatus resolves online with mocked socket", async () => {
    const result = await checkPrinterStatus({ ipAddress: "192.168.1.100", port: 9100 });
    expect(result.online).toBe(true);
    expect(result.latency).toBeDefined();
  });
});
