import { useState, useRef } from "react";

/**
 * PrintPreview — renders thermal-receipt-style HTML in an iframe
 * and triggers browser print (window.print on iframe).
 * 
 * Props:
 *  - html: string (the HTML document to print)
 *  - title: string (document title shown in header)
 *  - onClose: () => void
 *  - autoPrint: boolean (auto-trigger print on mount)
 */
export default function PrintPreview({ html, title = "Print Preview", onClose, autoPrint = false }) {
  const iframeRef = useRef(null);
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setPrinting(true);
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      // Fallback: open in new window
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
    setPrinting(false);
  };

  const handleIframeLoad = () => {
    if (autoPrint) {
      setTimeout(handlePrint, 300);
    }
  };

  return (
    <div className="print-preview-overlay">
      <div className="print-preview-container">
        {/* Header */}
        <div className="print-preview-header">
          <h3>{title}</h3>
          <div className="print-preview-actions">
            <button onClick={handlePrint} disabled={printing} className="btn-print">
              🖨️ พิมพ์
            </button>
            <button onClick={onClose} className="btn-close-preview">
              ✕
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="print-preview-body">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            onLoad={handleIframeLoad}
            title={title}
            className="print-iframe"
          />
        </div>
      </div>

      <style>{`
        .print-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .print-preview-container {
          background: var(--color-surface, #1a1a2e);
          border-radius: 12px;
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .print-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .print-preview-header h3 {
          margin: 0;
          font-size: 0.9rem;
          color: var(--color-text, #fff);
        }
        .print-preview-actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-print {
          background: var(--color-primary, #4ade80);
          color: #000;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .btn-print:active { transform: scale(0.95); }
        .btn-print:disabled { opacity: 0.5; }
        .btn-close-preview {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-close-preview:hover { background: rgba(255,255,255,0.2); }
        .print-preview-body {
          flex: 1;
          overflow: auto;
          padding: 1rem;
          display: flex;
          justify-content: center;
          background: #f5f5f5;
        }
        .print-iframe {
          width: 80mm;
          min-height: 400px;
          height: auto;
          border: none;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        @media (max-width: 480px) {
          .print-preview-container {
            max-width: 100%;
            max-height: 100vh;
            border-radius: 0;
          }
          .print-preview-body { padding: 0.5rem; }
          .print-iframe { width: 100%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Utility: Open print in a new window (for Sunmi WebView or standalone print)
 */
export function printHtmlInNewWindow(html, title = "Print") {
  const win = window.open("", "_blank", "width=380,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  // Auto-print after a short delay
  setTimeout(() => {
    win.print();
    // Close window after printing (optional)
    // win.close();
  }, 500);
}

/**
 * Utility: Try Sunmi inner printer via Android JS bridge
 * Falls back to browser print if bridge not available
 */
export function printViaSunmi(html) {
  // Check if Sunmi JS bridge is available (Android WebView)
  if (window.PrinterService) {
    try {
      window.PrinterService.printHtml(html);
      return true;
    } catch (e) {
      console.warn("Sunmi PrinterService failed:", e);
    }
  }
  // Fallback to browser print
  printHtmlInNewWindow(html, "Print");
  return false;
}
