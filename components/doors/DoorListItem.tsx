"use client";

import type { Door } from "@/lib/types";
import { qcStyle, tag } from "@/components/ui";

export default function DoorListItem({ door, active, onClick }: { door: Door; active: boolean; onClick: () => void }) {
  const qc = qcStyle(door.qc_status);
  const summary = [door.door_function, door.swing].filter(Boolean).join(" · ");
  return (
    <div onClick={onClick} style={{ padding: "10px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", cursor: "pointer", background: active ? "#fff8ee" : "transparent", borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent", transition: "background 0.1s" }} onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface)"; }} onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{door.door_id}</span>
        <span style={tag(qc.bg, qc.color, { fontSize: 10 })}>{door.qc_status}</span>
      </div>
      {summary && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</div>}
      <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
        {door.swing && <span style={tag("var(--info-bg)", "var(--info)", { fontSize: 10 })}>{door.swing}</span>}
        {door.hw_set && <span style={tag("#f5f4f0", "var(--muted)", { fontSize: 10 })}>{door.hw_set}</span>}
        {door.transom && <span style={tag("var(--accent-light)", "var(--accent)", { fontSize: 10 })}>Transom</span>}
        {door.sidelite && <span style={tag("var(--accent-light)", "var(--accent)", { fontSize: 10 })}>Sidelite</span>}
        {door.fire_rated && <span style={tag("var(--danger-bg)", "var(--danger)", { fontSize: 10 })}>Fire Rated</span>}
      </div>
    </div>
  );
}
