/**
 * Network Printer Service
 * Sends raw data (ESC/POS or HTML) to thermal printers via TCP socket
 * Supports Epson TM-T82III-iL and compatible network printers on port 9100
 */
import * as net from "net";

export interface PrinterConnection {
  ipAddress: string;
  port: number;
}

export interface PrintResult {
  success: boolean;
  message: string;
  duration?: number;
}

/**
 * Send raw buffer data to a network printer via TCP socket
 */
export async function printToNetworkPrinter(
  connection: PrinterConnection,
  data: Buffer | string,
  timeoutMs = 5000
): Promise<PrintResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const finish = (result: PrintResult) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.on("timeout", () => {
      finish({ success: false, message: "Connection timed out" });
    });

    socket.on("error", (err) => {
      finish({ success: false, message: `Connection error: ${err.message}` });
    });

    socket.connect(connection.port, connection.ipAddress, () => {
      const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
      socket.write(buffer, () => {
        // Give printer time to acknowledge
        setTimeout(() => {
          finish({
            success: true,
            message: "Print job sent successfully",
            duration: Date.now() - start,
          });
        }, 200);
      });
    });
  });
}

/**
 * Check if a network printer is reachable
 */
export async function checkPrinterStatus(
  connection: PrinterConnection,
  timeoutMs = 3000
): Promise<{ online: boolean; latency?: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const finish = (online: boolean) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve({ online, latency: online ? Date.now() - start : undefined });
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => finish(false));
    socket.on("error", () => finish(false));
    socket.connect(connection.port, connection.ipAddress, () => finish(true));
  });
}

/**
 * Send ESC/POS command to open cash drawer
 * Standard pulse command: ESC p 0 25 250
 */
export function generateCashDrawerCommand(): Buffer {
  return Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

/**
 * Generate ESC/POS cut command (full cut)
 */
export function generateCutCommand(): Buffer {
  return Buffer.from([0x1d, 0x56, 0x00]); // GS V 0 (full cut)
}

/**
 * Generate ESC/POS partial cut command
 */
export function generatePartialCutCommand(): Buffer {
  return Buffer.from([0x1d, 0x56, 0x01]); // GS V 1 (partial cut)
}

/**
 * Generate ESC/POS initialize command
 */
export function generateInitCommand(): Buffer {
  return Buffer.from([0x1b, 0x40]); // ESC @
}

/**
 * Generate a test print payload (ESC/POS)
 */
export function generateTestPrintPayload(printerName: string): Buffer {
  const init = generateInitCommand();
  const centerAlign = Buffer.from([0x1b, 0x61, 0x01]); // ESC a 1 (center)
  const boldOn = Buffer.from([0x1b, 0x45, 0x01]); // ESC E 1
  const boldOff = Buffer.from([0x1b, 0x45, 0x00]); // ESC E 0
  const leftAlign = Buffer.from([0x1b, 0x61, 0x00]); // ESC a 0
  const lineFeed = Buffer.from("\n");
  const doubleFeed = Buffer.from("\n\n");
  const cut = generatePartialCutCommand();

  const title = Buffer.from("=== TEST PRINT ===\n");
  const name = Buffer.from(`Printer: ${printerName}\n`);
  const time = Buffer.from(`Time: ${new Date().toLocaleString("th-TH")}\n`);
  const separator = Buffer.from("--------------------------------\n");
  const thaiTest = Buffer.from("ทดสอบภาษาไทย: สำเร็จ\n");
  const status = Buffer.from("Status: CONNECTED OK\n");
  const footer = Buffer.from("=== Hibi Matcha POS ===\n");

  return Buffer.concat([
    init,
    centerAlign,
    boldOn, title, boldOff,
    leftAlign,
    separator,
    name,
    time,
    thaiTest,
    status,
    separator,
    centerAlign,
    footer,
    doubleFeed,
    cut,
  ]);
}
