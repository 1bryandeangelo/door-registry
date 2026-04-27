"use client";

import React, { useRef, useEffect } from "react";
import type { QcStatus } from "@/lib/types";

export function qcStyle(s: QcStatus) {
  if (s === "Approved") return { bg: "var(--success-bg)", color: "var(--success)" };
  if (s === "Failed") return { bg: "var(--danger-bg)", color: "var(--danger)" };
  return { bg: "var(--warning-bg)", color: "var(--warning)" };
}

export function tag(bg: string, color: string, extra?: React.CSSProperties): React.CSSProperties {
  return { fontSize: 11, padding: "2px 7px", borderRadius: 5, background: bg, color, fontWeight: 500, whiteSpace: "nowrap" as const, ...extra };
}

export const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  "General":     { bg: "#f1f5f9", color: "#475569" },
  "Install":     { bg: "var(--success-bg)", color: "var(--success)" },
  "QC":          { bg: "var(--info-bg)",    color: "var(--info)" },
  "Field Issue": { bg: "var(--warning-bg)", color: "var(--warning)" },
  "Damage":      { bg: "var(--danger-bg)",  color: "var(--danger)" },
  "RFI":         { bg: "#f5f3ff",           color: "#6d28d9" },
  "Other":       { bg: "var(--surface)",    color: "var(--muted)" },
};

export const IS: React.CSSProperties = { width: "100%", fontSize: 13, padding: "7px 10px", border: "1px solid var(--border-med)", borderRadius: 6, background: "#ffffff", color: "var(--text)", outline: "none", boxSizing: "border-box" };
export const BS: React.CSSProperties = { fontSize: 13, fontWeight: 500, padding: "6px 14px", border: "1px solid var(--border-med)", borderRadius: 6, cursor: "pointer", background: "transparent", color: "var(--text)" };
export const BP: React.CSSProperties = { fontSize: 13, fontWeight: 500, padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer", background: "var(--accent)", color: "#fff" };
export const BSm: React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: "4px 9px", border: "1px solid var(--border-med)", borderRadius: 5, cursor: "pointer", background: "transparent", color: "var(--text)" };
export const BDng: React.CSSProperties = { fontSize: 11, fontWeight: 500, padding: "4px 9px", border: "1px solid #fca5a5", borderRadius: 5, cursor: "pointer", background: "transparent", color: "var(--danger)" };
export const CS: React.CSSProperties = { background: "#ffffff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px" };
export const LS: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };

export function Card({ title, children, full }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ ...CS, gridColumn: full ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>{title}</div>
      {children}
    </div>
  );
}

export function Row({ label, value, accent, mono, color }: { label: string; value?: string | null; accent?: boolean; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", gap: 10 }}>
      <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: mono ? 12 : 13, fontWeight: 500, textAlign: "right", color: color ?? (accent ? "var(--accent)" : "var(--text)"), fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word" }}>{value || "—"}</span>
    </div>
  );
}

export function StableInput({ label, value, onChange, type, full }: { label: string; value: string; onChange: (v: string) => void; type?: string; full?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current && document.activeElement !== ref.current) ref.current.value = value ?? ""; }, [value]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1/-1" : "auto" }}>
      <label style={LS}>{label}</label>
      <input ref={ref} style={IS} type={type ?? "text"} defaultValue={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function StableSelect({ label, value, onChange, opts, full }: { label: string; value: string; onChange: (v: string) => void; opts: string[]; full?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1/-1" : "auto" }}>
      <label style={LS}>{label}</label>
      <select style={IS} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <div style={{ width: size, height: size, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
}
