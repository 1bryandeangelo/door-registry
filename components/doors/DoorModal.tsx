"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Door, DoorFormData, QcStatus } from "@/lib/types";
import { EMPTY_DOOR_FORM, DOOR_FUNCTIONS, SWING_OPTIONS, QC_OPTIONS } from "@/lib/types";
import { IS, BS, BP, LS, StableInput, StableSelect } from "@/components/ui";

const DIV_STY: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--hint)",
  gridColumn: "1/-1", marginTop: 8, paddingBottom: 5,
  borderBottom: "1px solid var(--border)",
};

interface Props {
  projectId: string;
  companyId: string;
  userId: string;
  existingDoorIds: string[];
  initial?: Door;
  editing?: boolean;
  onClose: () => void;
  onSaved: (door: Door) => void;
}

export default function DoorModal({ projectId, companyId, userId, existingDoorIds, initial, editing, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<DoorFormData>(() =>
    initial
      ? {
          door_id: initial.door_id,
          location: initial.location ?? "",
          manufacturer: initial.manufacturer ?? "",
          model: initial.model ?? "",
          thermal: initial.thermal ?? "Thermal",
          elevation: initial.elevation ?? "",
          glass_tag: initial.glass_tag ?? "",
          glass_makeup: initial.glass_makeup ?? "",
          glass_size: initial.glass_size ?? "",
          has_midrail: initial.has_midrail,
          glass_size_midrail: initial.glass_size_midrail ?? "",
          finish: initial.finish ?? "",
          hw_set: initial.hw_set ?? "",
          hw_schedule: initial.hw_schedule ?? "",
          door_function: initial.door_function ?? "",
          swing: initial.swing ?? "",
          transom: initial.transom,
          sidelite: initial.sidelite,
          fire_rated: initial.fire_rated,
          work_order: initial.work_order ?? "",
          qc_sheet: initial.qc_sheet ?? "",
          qc_status: initial.qc_status,
          qc_date: initial.qc_date ?? "",
        }
      : { ...EMPTY_DOOR_FORM }
  );

  const set = useCallback(<K extends keyof DoorFormData>(k: K, v: DoorFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v })), []);

  const save = async () => {
    if (!form.door_id.trim()) { setError("Door ID is required."); return; }
    if (!editing && existingDoorIds.includes(form.door_id.trim())) {
      setError(`Door "${form.door_id}" already exists in this project.`);
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      door_id: form.door_id.trim(),
      project_id: projectId,
      company_id: companyId,
      location: form.location || null,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      thermal: form.thermal || null,
      elevation: form.elevation || null,
      glass_tag: form.glass_tag || null,
      glass_makeup: form.glass_makeup || null,
      glass_size: form.glass_size || null,
      has_midrail: form.has_midrail,
      glass_size_midrail: form.glass_size_midrail || null,
      finish: form.finish || null,
      hw_set: form.hw_set || null,
      hw_schedule: form.hw_schedule || null,
      door_function: form.door_function || null,
      swing: form.swing || null,
      transom: form.transom,
      sidelite: form.sidelite,
      fire_rated: form.fire_rated,
      work_order: form.work_order || null,
      qc_sheet: form.qc_sheet || null,
      qc_status: form.qc_status,
      qc_date: form.qc_date || null,
      created_by: userId,
    };

    let result;
    if (editing && initial) {
      result = await supabase.from("doors").update(payload).eq("uid", initial.uid).select().single();
    } else {
      result = await supabase.from("doors").insert(payload).select().single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    onSaved(result.data as Door);
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 22px", width: 640, maxWidth: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 18 }}>
          {editing ? `Edit — ${form.door_id}` : "Add Door"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={DIV_STY}>Identification</div>
          <StableInput label="Door ID *" value={form.door_id} onChange={(v) => set("door_id", v)} />
          <StableInput label="Location" value={form.location} onChange={(v) => set("location", v)} />

          <div style={DIV_STY}>Door Specs</div>
          <StableInput label="Manufacturer" value={form.manufacturer} onChange={(v) => set("manufacturer", v)} />
          <StableInput label="Model / Series" value={form.model} onChange={(v) => set("model", v)} />
          <StableSelect label="Thermal" value={form.thermal} onChange={(v) => set("thermal", v)} opts={["Thermal", "Non-Thermal"]} />
          <StableInput label="Finish" value={form.finish} onChange={(v) => set("finish", v)} />
          <StableInput label="Elevation Ref" value={form.elevation} onChange={(v) => set("elevation", v)} />
          <StableSelect label="Door Swing" value={form.swing} onChange={(v) => set("swing", v)} opts={SWING_OPTIONS} />
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 20 }}>
            {(["transom", "sidelite", "fire_rated"] as const).map((k) => (
              <label key={k} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} />
                {k === "fire_rated" ? "Fire Rated" : k.charAt(0).toUpperCase() + k.slice(1)}
              </label>
            ))}
          </div>

          <div style={DIV_STY}>Glass</div>
          <StableInput label="Glass Tag" value={form.glass_tag} onChange={(v) => set("glass_tag", v)} />
          <StableInput label="Glass Makeup" value={form.glass_makeup} onChange={(v) => set("glass_makeup", v)} full />
          <StableInput label="Glass Size" value={form.glass_size} onChange={(v) => set("glass_size", v)} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-end", paddingBottom: 2 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={form.has_midrail} onChange={(e) => set("has_midrail", e.target.checked)} />
              Has Mid Rail?
            </label>
          </div>
          {form.has_midrail && <StableInput label="Glass Size (Mid Rail)" value={form.glass_size_midrail} onChange={(v) => set("glass_size_midrail", v)} />}

          <div style={DIV_STY}>Hardware</div>
          <StableInput label="Hardware Set" value={form.hw_set} onChange={(v) => set("hw_set", v)} />
          <StableSelect label="Door Function" value={form.door_function} onChange={(v) => set("door_function", v)} opts={DOOR_FUNCTIONS} />
          <StableInput label="Hardware Schedule Ref" value={form.hw_schedule} onChange={(v) => set("hw_schedule", v)} full />

          <div style={DIV_STY}>Fabrication & QC</div>
          <StableInput label="Work Order #" value={form.work_order} onChange={(v) => set("work_order", v)} />
          <StableInput label="QC Sheet Ref" value={form.qc_sheet} onChange={(v) => set("qc_sheet", v)} />
          <StableSelect label="QC Status" value={form.qc_status} onChange={(v) => set("qc_status", v as QcStatus)} opts={QC_OPTIONS} />
          <StableInput label="QC Date" value={form.qc_date} onChange={(v) => set("qc_date", v)} type="date" />

          <div style={{ gridColumn: "1/-1", fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>
            Notes and photos are managed via the timeline on the door detail page.
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 10 }}>{error}</p>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
          <button style={BS} onClick={onClose}>Cancel</button>
          <button style={BP} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Door"}</button>
        </div>
      </div>
    </div>
  );
}
