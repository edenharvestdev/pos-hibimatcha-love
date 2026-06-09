// ============================================
// OCR / Image scan utilities
// ============================================
// Two-tier approach:
//   1. Lightweight client-side OCR via Tesseract.js (lazy-loaded from CDN)
//      → Works offline, no API key, slower (~3-5s per image)
//   2. Server-relay to Google Cloud Vision / AWS Textract (faster, accurate)
//      → Requires backend endpoint /api/ocr/scan with credentials
//
// Use cases:
//   - Scan PO invoice → extract line items + prices for receiving
//   - Scan receipt → log expense / petty cash
//   - Scan business card → new supplier
//   - Scan barcode (uses BarcodeDetector if available)
//   - Scan QR code (PromptPay, voucher, payment slip)

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

declare global {
  interface Window {
    Tesseract?: any;
    BarcodeDetector?: any;
  }
}

// ============================================================
// Camera capture
// ============================================================
export async function captureImageFromCamera(): Promise<Blob | null> {
  // Use file input with capture="environment" — works on iOS, Android, desktop
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    (input as any).capture = "environment";
    input.onchange = () => {
      const f = input.files?.[0];
      resolve(f ?? null);
    };
    input.click();
  });
}

// Higher-quality capture using getUserMedia + canvas snapshot
export async function captureImageFromStream(): Promise<Blob | null> {
  if (!navigator.mediaDevices?.getUserMedia) return captureImageFromCamera();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();

    // Wait one frame so dimensions are available
    await new Promise((r) => requestAnimationFrame(r));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
  } catch (err) {
    console.warn("Camera stream failed, falling back to file picker:", err);
    return captureImageFromCamera();
  }
}

// ============================================================
// Tesseract.js lazy loader
// ============================================================
let tesseractLoading: Promise<void> | null = null;

function ensureTesseract(): Promise<void> {
  if (window.Tesseract) return Promise.resolve();
  if (tesseractLoading) return tesseractLoading;
  tesseractLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Tesseract.js from CDN"));
    document.head.appendChild(script);
  });
  return tesseractLoading;
}

// ============================================================
// Run OCR on an image blob
// ============================================================
export async function runOCR(
  image: Blob,
  options?: { lang?: string; onProgress?: (pct: number) => void }
): Promise<{ text: string; lines: string[]; confidence: number }> {
  await ensureTesseract();
  const T = window.Tesseract;
  if (!T) throw new Error("Tesseract not loaded");

  // tha+eng for Thai + English mixed text (Thai invoices commonly have both)
  const lang = options?.lang ?? "tha+eng";
  const result = await T.recognize(image, lang, {
    logger: (m: any) => {
      if (m.status === "recognizing text" && options?.onProgress) {
        options.onProgress(Math.round(m.progress * 100));
      }
    },
  });
  const text: string = result.data?.text ?? "";
  return {
    text,
    lines: text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    confidence: result.data?.confidence ?? 0,
  };
}

// ============================================================
// Parse invoice text into rough line items
// Heuristic: each line with a number that looks like a price → item line
// ============================================================
export type ParsedInvoice = {
  items: Array<{ description: string; quantity?: number; unitPrice?: number; total?: number }>;
  total?: number;
  vendor?: string;
  date?: string;
};

export function parseInvoiceText(text: string): ParsedInvoice {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ParsedInvoice["items"] = [];
  let total: number | undefined;
  let date: string | undefined;
  let vendor: string | undefined;

  // Date — match common formats
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) date = dateMatch[0];

  // Vendor — first non-empty line is usually the vendor name
  vendor = lines[0]?.length < 80 ? lines[0] : undefined;

  // Items — lines with a description and a trailing number
  const priceRe = /([0-9,]+\.?\d{0,2})\s*$/;
  const qtyRe = /^(\d+)\s*[xX]\s+(.+)/;

  for (const line of lines) {
    const priceMatch = line.match(priceRe);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(/,/g, ""));
    if (isNaN(price) || price === 0) continue;

    const rest = line.slice(0, line.length - priceMatch[1].length).trim();
    if (!rest) continue;

    // Look for total marker
    if (/total|รวม|sum|ยอดรวม/i.test(rest)) {
      if (price > (total ?? 0)) total = price;
      continue;
    }

    const qtyMatch = rest.match(qtyRe);
    if (qtyMatch) {
      items.push({
        quantity: parseInt(qtyMatch[1], 10),
        description: qtyMatch[2],
        total: price,
        unitPrice: price / parseInt(qtyMatch[1], 10),
      });
    } else {
      items.push({ description: rest, total: price });
    }
  }

  return { items, total, date, vendor };
}

// ============================================================
// Barcode / QR detection (uses native BarcodeDetector when available)
// ============================================================
export async function detectBarcodesInImage(image: Blob): Promise<string[]> {
  if (!window.BarcodeDetector) {
    // Fallback — could use jsqr or zxing-wasm from CDN. For now, return empty.
    console.warn("BarcodeDetector API not supported on this browser");
    return [];
  }
  try {
    const detector = new window.BarcodeDetector({
      formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "pdf417"],
    });
    const bitmap = await createImageBitmap(image);
    const codes = await detector.detect(bitmap);
    return codes.map((c: any) => c.rawValue as string);
  } catch (err) {
    console.warn("Barcode detection failed:", err);
    return [];
  }
}

// ============================================================
// Optional: server-relay OCR (for high accuracy / Thai government docs)
// ============================================================
export async function runServerOCR(image: Blob): Promise<{ text: string; provider: string }> {
  const fd = new FormData();
  fd.append("file", image, "scan.jpg");
  const res = await fetch("/api/ocr/scan", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Server OCR failed: " + res.status);
  return await res.json();
}
