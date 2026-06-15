import React, { useState, useEffect } from "react";
import { IconPOS, IconInventory, IconReports, IconBuilding, IconLock } from "@/icons";

export const WelcomeLoading = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const duration = 2500; // 2.5 seconds loading time for a premium showcase feel

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      
      if (pct >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setFade(true);
          setTimeout(() => {
            onComplete();
          }, 500); // Wait for smooth fade-out transition
        }, 400);
      } else {
        setProgress(pct);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Leaf SVG definitions for 3D falling animation
  const leafPath1 = "M10 30 C 10 10, 30 10, 40 30 C 40 50, 20 50, 10 30 Z";
  const leafPath2 = "M5 20 C 15 5, 35 5, 40 20 C 35 35, 15 35, 5 20 Z";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "radial-gradient(circle at 50% 50%, #f9f9f5 0%, #f2f2e6 100%)",
      color: "#3f4e24",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
      opacity: fade ? 0 : 1,
      visibility: fade ? "hidden" : "visible",
      transition: "opacity 500ms cubic-bezier(0.4, 0, 0.2, 1), visibility 500ms ease",
      overflow: "hidden",
      perspective: 1000,
    }}>
      {/* Dynamic CSS Styles Injection */}
      <style>{`
        @keyframes float3D {
          0% { transform: rotateY(-6deg) rotateX(4deg) translateY(-8px); }
          50% { transform: rotateY(6deg) rotateX(-4deg) translateY(8px); }
          100% { transform: rotateY(-6deg) rotateX(4deg) translateY(-8px); }
        }
        @keyframes glowPulse {
          0% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.6; transform: scale(1.05); }
          100% { opacity: 0.3; transform: scale(0.95); }
        }
        @keyframes shimmer {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        @keyframes leafFall1 {
          0% { transform: translate3d(0, -10vh, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(0.7); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate3d(30px, 110vh, 100px) rotateX(360deg) rotateY(180deg) rotateZ(180deg) scale(0.9); opacity: 0; }
        }
        @keyframes leafFall2 {
          0% { transform: translate3d(0, -10vh, 0) rotateX(45deg) rotateY(0deg) rotateZ(45deg) scale(0.8); opacity: 0; }
          15% { opacity: 0.7; }
          85% { opacity: 0.7; }
          100% { transform: translate3d(-50px, 110vh, -50px) rotateX(180deg) rotateY(360deg) rotateZ(270deg) scale(0.6); opacity: 0; }
        }
        @keyframes leafFall3 {
          0% { transform: translate3d(0, -10vh, 0) rotateX(0deg) rotateY(90deg) rotateZ(-30deg) scale(0.5); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translate3d(80px, 110vh, 50px) rotateX(270deg) rotateY(270deg) rotateZ(120deg) scale(0.8); opacity: 0; }
        }
        @keyframes floatStatic {
          0% { transform: translateY(0px) rotate(15deg); }
          50% { transform: translateY(-10px) rotate(18deg); }
          100% { transform: translateY(0px) rotate(15deg); }
        }
        @keyframes pulseLeaf {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>

      {/* 3D Falling Tea Leaves Background */}
      {/* Left-most large leaf */}
      <div style={{ position: "absolute", left: "8%", top: 0, animation: "leafFall1 9s linear infinite", animationDelay: "0s", pointerEvents: "none" }}>
        <svg width="45" height="45" viewBox="0 0 50 50" fill="#6d8350"><path d={leafPath1} opacity="0.35" /><path d="M10 30 L40 30" stroke="#52633c" strokeWidth="0.8" opacity="0.4" /></svg>
      </div>
      {/* Mid-left drifting leaf */}
      <div style={{ position: "absolute", left: "25%", top: 0, animation: "leafFall2 11s linear infinite", animationDelay: "2s", pointerEvents: "none" }}>
        <svg width="35" height="35" viewBox="0 0 50 50" fill="#8ca26d"><path d={leafPath2} opacity="0.3" /></svg>
      </div>
      {/* Center falling leaf */}
      <div style={{ position: "absolute", left: "45%", top: 0, animation: "leafFall3 10s linear infinite", animationDelay: "1s", pointerEvents: "none" }}>
        <svg width="30" height="30" viewBox="0 0 50 50" fill="#5c7043"><path d={leafPath1} opacity="0.4" /></svg>
      </div>
      {/* Mid-right leaf */}
      <div style={{ position: "absolute", left: "68%", top: 0, animation: "leafFall1 13s linear infinite", animationDelay: "4s", pointerEvents: "none" }}>
        <svg width="38" height="38" viewBox="0 0 50 50" fill="#9db084"><path d={leafPath2} opacity="0.25" /></svg>
      </div>
      {/* Right-most leaf */}
      <div style={{ position: "absolute", right: "7%", top: 0, animation: "leafFall2 8s linear infinite", animationDelay: "0.5s", pointerEvents: "none" }}>
        <svg width="42" height="42" viewBox="0 0 50 50" fill="#6d8350"><path d={leafPath1} opacity="0.35" /><path d="M10 30 L40 30" stroke="#52633c" strokeWidth="0.8" opacity="0.4" /></svg>
      </div>

      {/* Decorative Corner Foliage (Fixed Ambient SVG) */}
      <div style={{ position: "absolute", top: -30, left: -30, width: 220, height: 220, opacity: 0.9, pointerEvents: "none", animation: "floatStatic 6s ease-in-out infinite" }}>
        <svg viewBox="0 0 100 100" fill="none" style={{ width: "100%", height: "100%" }}>
          <path d="M5,40 Q25,15 65,5 Q45,35 25,45 Z" fill="#b8c6a3" opacity="0.45" />
          <path d="M10,48 Q42,25 75,20 Q55,55 20,65 Z" fill="#9db084" opacity="0.55" />
          <path d="M0,20 Q35,0 80,0 Q60,35 25,35 Z" fill="#6d8350" opacity="0.35" />
          {/* Veins */}
          <path d="M5,40 L65,5 M30,22 L42,12" stroke="#52633c" strokeWidth="0.6" opacity="0.25" />
          <path d="M10,48 L75,20 M38,34 L50,22" stroke="#52633c" strokeWidth="0.6" opacity="0.25" />
        </svg>
      </div>

      <div style={{ position: "absolute", bottom: -30, right: -30, width: 240, height: 240, opacity: 0.9, pointerEvents: "none", transform: "scaleX(-1) scaleY(-1)", animation: "floatStatic 7s ease-in-out infinite" }}>
        <svg viewBox="0 0 100 100" fill="none" style={{ width: "100%", height: "100%" }}>
          <path d="M5,40 Q25,15 65,5 Q45,35 25,45 Z" fill="#b8c6a3" opacity="0.45" />
          <path d="M10,48 Q42,25 75,20 Q55,55 20,65 Z" fill="#9db084" opacity="0.55" />
          <path d="M0,20 Q35,0 80,0 Q60,35 25,35 Z" fill="#6d8350" opacity="0.35" />
        </svg>
      </div>

      {/* Aura Glow Behind Logo Card */}
      <div style={{
        position: "absolute",
        width: 320,
        height: 320,
        background: "radial-gradient(circle, rgba(140, 162, 109, 0.4) 0%, transparent 70%)",
        top: "30%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        zIndex: 1,
        animation: "glowPulse 4s ease-in-out infinite",
      }} />

      {/* Main Container - Framed as a Floating 3D Plate */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 640,
        width: "90%",
        textAlign: "center",
        zIndex: 2,
        transformStyle: "preserve-3d",
        animation: "float3D 5s ease-in-out infinite",
        background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 32,
        padding: "40px 32px 32px",
        boxShadow: "0 20px 50px rgba(90, 110, 60, 0.08), inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.02)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
      }}>
        
        {/* Logo Section */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          marginBottom: 24,
          transform: "translateZ(30px)", // Pop out logo in 3D
        }}>
          {/* Logo Brand SVG (Rabbit, Whisk, Bowl) */}
          <svg width="125" height="125" viewBox="0 0 24 24" fill="none" stroke="#56693a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 6px 12px rgba(90,110,60,0.18))" }}>
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
            <path d="M6 14.5c-.6.6-.8 1.8 0 2.4.6.6 1.8 0 2.4-.6-.6-.6-1.8-.6-2.4-1.8z" fill="#ffffff" stroke="none" />
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em", color: "#3f4e24", lineHeight: 0.9 }}>Hibios</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "0 4px" }}>
                  <div style={{ width: 10, height: 1.5, background: "#7e935d" }} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#5a6e3c", fontFamily: "serif" }}>日々</span>
                  <div style={{ width: 10, height: 1.5, background: "#7e935d" }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.36em", color: "#687e49", marginTop: 4, textTransform: "uppercase" }}>
              POS SYSTEM
            </div>
          </div>
        </div>

        {/* Subtitle Slogan */}
        <div style={{
          fontSize: 19,
          fontWeight: 600,
          color: "#5a6e3c",
          letterSpacing: "0.06em",
          marginBottom: 36,
          transform: "translateZ(20px)",
        }}>
          ระบบจัดการร้านค้า ครบวงจร
        </div>

        {/* Feature Icons Grid - Designed as Floating 3D Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          width: "100%",
          maxWidth: 560,
          marginBottom: 44,
          borderTop: "1px solid rgba(140, 162, 109, 0.15)",
          borderBottom: "1px solid rgba(140, 162, 109, 0.15)",
          padding: "28px 0",
          transform: "translateZ(15px)",
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
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  transition: "transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  cursor: "default",
                }}
                className="welcome-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateZ(10px) scale(1.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "rgba(109, 131, 80, 0.08)",
                  border: "1px solid rgba(109, 131, 80, 0.15)",
                  display: "grid",
                  placeItems: "center",
                  color: "#4f5f34",
                  boxShadow: "0 4px 12px rgba(90, 110, 60, 0.04)",
                  transition: "all 300ms ease",
                }}>
                  <IconComponent size={22} stroke={1.8} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#4f5f34", whiteSpace: "nowrap" }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar Container - Glowing Metallic Finish */}
        <div style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
          transform: "translateZ(25px)",
        }}>
          <div style={{
            flex: 1,
            height: 12,
            background: "rgba(109, 131, 80, 0.12)",
            border: "1px solid rgba(109, 131, 80, 0.1)",
            borderRadius: 99,
            overflow: "hidden",
            position: "relative",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress}%`,
              background: "linear-gradient(90deg, #5c7043 0%, #7e985e 50%, #5c7043 100%)",
              borderRadius: 99,
              transition: "width 80ms linear",
              boxShadow: "0 2px 6px rgba(90, 110, 60, 0.3)",
              overflow: "hidden"
            }}>
              {/* Shimmering glare light bar */}
              <div style={{
                position: "absolute",
                top: 0,
                width: "60px",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)",
                animation: "shimmer 1.5s infinite linear",
              }} />
            </div>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#3f4e24", minWidth: 38, textAlign: "right" }}>
            {progress}%
          </span>
        </div>

        {/* Loading Message */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14.5,
          fontWeight: 600,
          color: "#6d8350",
          transform: "translateZ(10px)",
          letterSpacing: "0.02em"
        }}>
          <span style={{ display: "inline-block", animation: "pulseLeaf 1.2s infinite ease-in-out" }}>🍃</span>
          กำลังเตรียมระบบให้พร้อมใช้งาน...
        </div>
      </div>
    </div>
  );
};
