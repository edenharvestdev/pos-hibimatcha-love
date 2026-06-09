// Touch-optimized numeric keypad
// Use for cash entry, table number, quantity, PIN, etc.
// Larger keys than the OS soft keyboard, no keyboard pop-up on tablet.

import React, { useEffect } from "react";

export const Numpad = ({
  value = "",
  onChange,
  decimal = true,
  maxLength = 12,
  quickValues = null,         // optional array of preset values
  onQuickPick = null,
  onClear = null,
  onSubmit = null,
  submitLabel = "OK",
  showQuickRow = true,
  style = {},
}) => {
  const append = (ch) => {
    if (String(value).length >= maxLength) return;
    if (ch === "." && String(value).includes(".")) return;
    const next = (value === "0" && ch !== ".") ? ch : `${value}${ch}`;
    onChange?.(next);
  };
  const back = () => onChange?.(String(value).slice(0, -1));
  const clear = () => { onChange?.(""); onClear?.(); };

  // Physical keyboard pass-through for hybrid devices
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) append(e.key);
      else if (e.key === "." && decimal) append(".");
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape") clear();
      else if (e.key === "Enter") onSubmit?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [value, decimal]);

  const Key = ({ label, onClick, className = "", style: kStyle = {} }) => (
    <button
      type="button"
      className={"numpad-btn " + className}
      onClick={onClick}
      style={kStyle}
    >{label}</button>
  );

  return (
    <div style={style}>
      {showQuickRow && quickValues && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {quickValues.map((v) => (
            <button
              key={v}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onQuickPick?.(v)}
              style={{ minWidth: 70, flex: 1 }}
            >฿{Number(v).toLocaleString()}</button>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <Key key={n} label={n} onClick={() => append(String(n))}/>
        ))}
        <Key label={decimal ? "." : ""} onClick={() => decimal && append(".")} style={{ opacity: decimal ? 1 : 0.4 }}/>
        <Key label="0" onClick={() => append("0")}/>
        <Key
          label="⌫"
          onClick={back}
          style={{ background: "var(--bg-muted)", fontSize: 20 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={clear}
          style={{ minHeight: 52 }}
        >Clear</button>
        {onSubmit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSubmit}
            style={{ minHeight: 52 }}
          >{submitLabel}</button>
        )}
      </div>
    </div>
  );
};

export default Numpad;
