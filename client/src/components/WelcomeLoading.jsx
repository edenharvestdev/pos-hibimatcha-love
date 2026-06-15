import React, { useState, useEffect } from "react";
import { IconPOS, IconInventory, IconReports, IconBuilding, IconLock } from "@/icons";

export const WelcomeLoading = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 2200; // 2.2 seconds loading duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      
      if (pct >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setFade(true); // Trigger fade out transition
          setTimeout(() => {
            onComplete();
          }, 400); // Wait for transition animation to complete
        }, 300);
      } else {
        setProgress(pct);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#f5f5ee",
      color: "#3f4e24",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      opacity: fade ? 0 : 1,
      visibility: fade ? "hidden" : "visible",
      transition: "opacity 400ms ease-out, visibility 400ms ease-out",
      overflow: "hidden"
    }}>
      {/* Top Left Leaf SVG */}
      <svg style={{ position: "absolute", top: -20, left: -20, width: 200, height: 200, opacity: 0.85, transform: "rotate(15deg)" }} viewBox="0 0 100 100" fill="none">
        <path d="M10,40 Q30,20 60,10 Q50,40 30,50 Z" fill="#b8c6a3" opacity="0.5" />
        <path d="M10,40 Q40,35 70,30 Q50,60 20,70 Z" fill="#9db084" opacity="0.6" />
        <path d="M5,25 Q35,5 80,0 Q60,30 30,35 Z" fill="#6d8350" opacity="0.4" />
        {/* Veins */}
        <path d="M10,40 L60,10 M35,25 L45,15 M20,35 L28,29" stroke="#52633c" strokeWidth="0.5" opacity="0.3" />
        <path d="M10,40 L70,30 M40,35 L52,32 M25,37 L33,34" stroke="#52633c" strokeWidth="0.5" opacity="0.3" />
      </svg>

      {/* Bottom Right Leaf SVG */}
      <svg style={{ position: "absolute", bottom: -20, right: -20, width: 220, height: 220, opacity: 0.85, transform: "scaleX(-1) rotate(45deg)" }} viewBox="0 0 100 100" fill="none">
        <path d="M10,40 Q30,20 60,10 Q50,40 30,50 Z" fill="#b8c6a3" opacity="0.5" />
        <path d="M10,40 Q40,35 70,30 Q50,60 20,70 Z" fill="#9db084" opacity="0.6" />
        <path d="M5,25 Q35,5 80,0 Q60,30 30,35 Z" fill="#6d8350" opacity="0.4" />
      </svg>

      {/* Main Container */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 640, width: "90%", textAlign: "center", zIndex: 2 }}>
        
        {/* Logo Section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 28 }}>
          {/* Logo Brand SVG (Rabbit, Whisk, Bowl) */}
          <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#56693a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 4px 6px rgba(90,110,60,0.15))" }}>
            {/* Left Ear */}
            <path d="M6 10C5.2 6.5 6.2 3.5 7.2 5.2c.8 1.4.6 3.2.4 4.8" fill="#8ca26d" opacity="0.25" />
            <path d="M6 10C5.2 6.5 6.2 3.5 7.2 5.2c.8 1.4.6 3.2.4 4.8" />
            {/* Right Ear */}
            <path d="M8.2 10c.2-4 1.8-5.8 2.5-4 0 1.4-.7 3.2-1.4 4" fill="#8ca26d" opacity="0.25" />
            <path d="M8.2 10c.2-4 1.8-5.8 2.5-4 0 1.4-.7 3.2-1.4 4" />
            {/* Head/Body */}
            <path d="M8.2 10c-2.5 0-3.8 2.8-3.4 5.6.8 3.6 4.8 3.6 6 1.6.8-1.2.6-3-.4-4.4-.8-1-1.6-2.8-2.4-2.8" fill="#6a8249" opacity="0.3" />
            <path d="M8.2 10c-2.5 0-3.8 2.8-3.4 5.6.8 3.6 4.8 3.6 6 1.6.8-1.2.6-3-.4-4.4-.8-1-1.6-2.8-2.4-2.8z" />
            {/* Leaf inside body */}
            <path d="M6 14.5c-.6.6-.8 1.8 0 2.4.6.6 1.8 0 2.4-.6-.6-.6-1.8-.6-2.4-1.8z" fill="#f5f5ee" stroke="none" />
            {/* Smiling Eyes */}
            <path d="M5.8 12.6a.8.8 0 0 1 .6-.2" strokeWidth={1.8} />
            <path d="M7.8 12.6a.8.8 0 0 1 .6-.2" strokeWidth={1.8} />
            <circle cx="7.0" cy="13.8" r="0.6" fill="#56693a" stroke="none" />

            {/* Whisk */}
            <rect x="12.5" y="8" width="1.8" height="4.5" rx="0.4" fill="#8ca26d" opacity="0.25" />
            <rect x="12.5" y="8" width="1.8" height="4.5" rx="0.4" />
            <path d="M11.6 12.5h3.6" />
            <path d="M12.5 12.5c-1.2 2-1.2 4.4.4 6 .4.4.8.4 1.2 0 1.6-1.6 1.6-4 .4-6" fill="#8ca26d" opacity="0.25" />
            <path d="M12.5 12.5c-1.2 2-1.2 4.4.4 6M14.3 12.5c1.2 2 1.2 4.4-.4 6" />
            <path d="M13.4 12.5v5.5" />

            {/* Bowl */}
            <path d="M16.5 13.5c-.2 2 .4 3.6 1.2 4h2.4c.8-.4 1.4-2 1.2-4H16.5z" fill="#8ca26d" opacity="0.25" />
            <path d="M16.5 13.5c-.2 2 .4 3.6 1.2 4.4h2.4c.8-.8 1.4-2.4 1.2-4.4" />
            <path d="M17.7 17.9h2.4" />
            <path d="M16.7 15.1h5" strokeWidth={0.8} opacity={0.8} />
          </svg>

          {/* System Name & Slogan */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em", color: "#4f5f34" }}>Hibios</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 4px" }}>
                  <div style={{ width: 12, height: 1.5, background: "#7e935d" }} />
                  <span style={{ fontSize: 18, fontWeight: 500, color: "#687e49", fontFamily: "serif" }}>日々</span>
                  <div style={{ width: 12, height: 1.5, background: "#7e935d" }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.32em", color: "#687e49", marginTop: -2, textTransform: "uppercase" }}>
              POS SYSTEM
            </div>
          </div>
        </div>

        {/* Subtitle Slogan */}
        <div style={{ fontSize: 18, fontWeight: 500, color: "#687e49", letterSpacing: "0.04em", marginBottom: 44 }}>
          ระบบจัดการร้านค้า ครบวงจร
        </div>

        {/* Feature Icons Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          width: "100%",
          maxWidth: 540,
          marginBottom: 48,
          borderTop: "1px solid rgba(140, 162, 109, 0.15)",
          borderBottom: "1px solid rgba(140, 162, 109, 0.15)",
          padding: "24px 0",
        }}>
          {[
            { icon: IconPOS, label: "ขายง่าย" },
            { icon: IconInventory, label: "สต็อกแม่นยำ" },
            { icon: IconReports, label: "รายงานครบถ้วน" },
            { icon: IconBuilding, label: "จัดการหลายสาขา" },
            { icon: IconLock, label: "ปลอดภัย เชื่อถือได้" }
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(140, 162, 109, 0.1)",
                  display: "grid",
                  placeItems: "center",
                  color: "#5a6e3c"
                }}>
                  <IconComponent size={20} stroke={1.8} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5a6e3c", whiteSpace: "nowrap" }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar Container */}
        <div style={{ width: "100%", maxWidth: 460, display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            flex: 1,
            height: 8,
            background: "rgba(140, 162, 109, 0.15)",
            borderRadius: 99,
            overflow: "hidden",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: "#6d8350",
              borderRadius: 99,
              transition: "width 60ms linear"
            }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#5a6e3c", minWidth: 36, textAlign: "right" }}>
            {progress}%
          </span>
        </div>

        {/* Loading Message */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          fontWeight: 500,
          color: "#7f9364",
          animation: "pulse 1.5s infinite alternate"
        }}>
          กำลังเตรียมระบบให้พร้อมใช้งาน... 🍃
        </div>
      </div>
    </div>
  );
};
