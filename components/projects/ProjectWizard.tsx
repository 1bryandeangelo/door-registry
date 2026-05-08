"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, Door, ParsedDoorStub, DoorFormData, QcStatus } from "@/lib/types";
import { EMPTY_DOOR_FORM, DOOR_FUNCTIONS, SWING_OPTIONS, QC_OPTIONS } from "@/lib/types";
import { IS, BS, BP, BSm, LS } from "@/components/ui";

const DIV_STY: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, textTransform: "uppercase",
  letterSpacing: "0.06em", color: "var(--hint)",
  gridColumn: "1/-1", marginTop: 8, paddingBottom: 5,
  borderBottom: "1px solid var(--border)",
};

interface Props {
  companyId: string;
  userId: string;
  onClose: () => void;
  onSaved: (projectId: string) => void;
}

type Step = 1 | 2 | 3 | 4;

const DEFAULT_FIELDS = [
  { key: "manufacturer",      label: "Manufacturer" },
  { key: "model",             label: "Model / Series" },
  { key: "thermal",           label: "Thermal", type: "select", opts: ["Thermal", "Non-Thermal"] },
  { key: "glass_tag",         label: "Glass Tag" },
  { key: "glass_makeup",      label: "Glass Makeup" },
  { key: "glass_size",        label: "Glass Size" },
  { key: "work_order_prefix", label: "Work Order Prefix" },
] as const;

type DefKey = typeof DEFAULT_FIELDS[number]["key"];

export default function ProjectWizard({ companyId, userId, onClose, onSaved }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [proj, setProj] = useState({ jobNumber: "", name: "", address: "", scheduleApproved: false });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const [parseError, setParseError] = useState("");
  const [parseAttempts, setParseAttempts] = useState(0);
  const [parsedDoors, setParsedDoors] = useState<ParsedDoorStub[]>([]);

  const PARSE_SUGGESTIONS = [
    "Try submitting again — it sometimes works on a second attempt.",
    "Try uploading a tight crop of just the door schedule table, cutting out any surrounding content.",
    "Make sure the image is sharp and level — low resolution or rotated scans are difficult to parse.",
    "If the schedule spans multiple pages, try uploading one page at a time.",
    "If nothing is working, use \"Skip — add manually\" below to enter the doors by hand.",
  ];

  const [defaults, setDefaults] = useState<Record<DefKey, string>>({
    manufacturer: "", model: "", thermal: "Thermal",
    glass_tag: "", glass_makeup: "", glass_size: "", work_order_prefix: "",
  });
  const [useDefault, setUseDefault] = useState<Record<DefKey, boolean>>({
    manufacturer: false, model: false, thermal: false,
    glass_tag: false, glass_makeup: false, glass_size: false, work_order_prefix: false,
  });

  const [wizStep, setWizStep] = useState(0);
  const [completedDoors, setCompletedDoors] = useState<DoorFormData[]>([]);
  const [curDoor, setCurDoor] = useState<DoorFormData>({ ...EMPTY_DOOR_FORM });

  const [saving, setSaving] = useState(false);

  const setP = (k: keyof typeof proj, v: string | boolean) => setProj((p) => ({ ...p, [k]: v }));

  const applyDefaults = (door: DoorFormData): DoorFormData => {
    const out = { ...door };
    for (const f of DEFAULT_FIELDS) {
      if (!useDefault[f.key] || !defaults[f.key]) continue;
      if (f.key === "work_order_prefix") {
        out.work_order = defaults[f.key] + door.door_id;
      } else {
        (out as Record<string, unknown>)[f.key] = defaults[f.key];
      }
    }
    return out;
  };

  const stubToForm = (stub: ParsedDoorStub): DoorFormData => ({
    ...EMPTY_DOOR_FORM,
    door_id: stub.door_id,
    hw_set: stub.hw_set,
    door_function: stub.door_function,
    swing: stub.swing,
    transom: stub.transom,
    sidelite: stub.sidelite,
    fire_rated: stub.fire_rated,
    location: stub.location,
    elevation: stub.elevation,
    hw_schedule: stub.hw_schedule,
    work_order: stub.work_order,
    qc_sheet: stub.qc_sheet,
    qc_status: stub.qc_status,
    qc_date: stub.qc_date,
  });

  const parseSchedule = async () => {
    if (!pdfFile) return;
    setParsing(true);
    setParseError("");
    setParseMsg("Parsing door schedule…");

    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const res = await fetch("/api/parse-project", { method: "POST", body: formData });
      if (!res.ok || !res.body) throw new Error("Server error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "progress") setParseMsg(evt.message);
          else if (evt.type === "done") {
            setParsedDoors(evt.doors as ParsedDoorStub[]);
            setStep(3);
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        }
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Parse failed.");
      setParseAttempts((n) => n + 1);
    }
    setParsing(false);
  };

  const saveToDB = async (doors: DoorFormData[]) => {
    setSaving(true);

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        company_id: companyId,
        job_number: proj.jobNumber || null,
        name: proj.name,
        address: proj.address || null,
        schedule_approved: proj.scheduleApproved,
        created_by: userId,
      })
      .select()
      .single();

    if (projErr || !project) { setSaving(false); return; }

    if (doors.length > 0) {
      await supabase.from("doors").insert(
        doors.map((d) => ({
          door_id: d.door_id,
          project_id: project.id,
          company_id: companyId,
          location: d.location || null,
          manufacturer: d.manufacturer || null,
          model: d.model || null,
          thermal: d.thermal || null,
          elevation: d.elevation || null,
          glass_tag: d.glass_tag || null,
          glass_makeup: d.glass_makeup || null,
          glass_size: d.glass_size || null,
          has_midrail: d.has_midrail,
          glass_size_midrail: d.glass_size_midrail || null,
          finish: d.finish || null,
          hw_set: d.hw_set || null,
          hw_schedule: d.hw_schedule || null,
          door_function: d.door_function || null,
          swing: d.swing || null,
          transom: d.transom,
          sidelite: d.sidelite,
          fire_rated: d.fire_rated,
          work_order: d.work_order || null,
          qc_sheet: d.qc_sheet || null,
          qc_status: d.qc_status,
          qc_date: d.qc_date || null,
          created_by: userId,
        }))
      );
    }

    setSaving(false);
    onSaved(project.id);
  };

  const finishNow = () => saveToDB(parsedDoors.map(stubToForm).map(applyDefaults));

  const startWizard = () => {
    setWizStep(0);
    setCurDoor(applyDefaults(stubToForm(parsedDoors[0])));
    setStep(4);
  };

  const nextWizDoor = () => {
    const all = [...completedDoors, curDoor];
    if (wizStep + 1 < parsedDoors.length) {
      setCompletedDoors(all);
      setWizStep(wizStep + 1);
      setCurDoor(applyDefaults(stubToForm(parsedDoors[wizStep + 1])));
    } else {
      saveToDB(all);
    }
  };

  const STEPS = ["Project Info", "Upload Schedule", "Review Doors", "Per-Door Details"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "22px 24px", width: 620, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>

        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: step > i + 1 ? "var(--success)" : step === i + 1 ? "var(--accent)" : "var(--border)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 11, color: step === i + 1 ? "var(--text)" : "var(--muted)" }}>{s}</span>
              {i < STEPS.length - 1 && <span style={{ color: "var(--border)", fontSize: 14 }}>›</span>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>New Project</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={LS}>Job Number</label>
                <input style={IS} value={proj.jobNumber} onChange={(e) => setP("jobNumber", e.target.value)} placeholder="e.g. 2024-047" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={LS}>Project Name *</label>
                <input style={IS} value={proj.name} onChange={(e) => setP("name", e.target.value)} placeholder="e.g. Riverside Medical Center" autoFocus />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1/-1" }}>
                <label style={LS}>Address (optional)</label>
                <input style={IS} value={proj.address} onChange={(e) => setP("address", e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1/-1" }}>
                <input type="checkbox" id="sa" checked={proj.scheduleApproved} onChange={(e) => setP("scheduleApproved", e.target.checked)} />
                <label htmlFor="sa" style={{ fontSize: 13 }}>Hardware schedule is architect-approved</label>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Project Defaults (optional)</div>
              <p style={{ fontSize: 12, color: "var(--hint)", marginBottom: 12 }}>Values that apply to most doors — auto-fill the wizard but can be overridden per door.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {DEFAULT_FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <label style={LS}>{f.label}</label>
                    {"opts" in f ? (
                      <select style={IS} value={defaults[f.key]} onChange={(e) => setDefaults((d) => ({ ...d, [f.key]: e.target.value }))}>
                        {f.opts.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input style={IS} value={defaults[f.key]} onChange={(e) => setDefaults((d) => ({ ...d, [f.key]: e.target.value }))} placeholder={f.key === "work_order_prefix" ? "e.g. WO-2025-" : ""} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button style={BS} onClick={onClose}>Cancel</button>
              <button style={BP} onClick={() => proj.name.trim() && setStep(2)} disabled={!proj.name.trim()}>Next</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 6px" }}>Upload the door schedule.</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>AI reads the schedule and creates all doors with swing directions. Skip to add doors manually.</p>
            <div
              style={{ border: `1px dashed ${dragOver ? "var(--accent)" : "var(--border-med)"}`, background: dragOver ? "var(--accent-light)" : "transparent", borderRadius: 8, padding: 28, textAlign: "center", cursor: "pointer", marginBottom: 14, transition: "all 0.15s" }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setPdfFile(f); }}
            >
              {pdfFile
                ? <><div style={{ fontSize: 14, fontWeight: 500 }}>{pdfFile.name}</div><div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Click or drop to change</div></>
                : <><div style={{ fontSize: 13, color: "var(--muted)" }}>Click or drag &amp; drop page containing door schedule here</div><div style={{ fontSize: 12, color: "var(--hint)", marginTop: 3 }}>PDF · JPG · PNG</div></>
              }
              <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) { setPdfFile(e.target.files[0]); setParseError(""); setParseAttempts(0); } }} />
            </div>
            {parseError && (
              <div style={{ fontSize: 12, marginBottom: 12, padding: "10px 12px", background: "var(--danger-bg)", borderRadius: 5, border: "1px solid var(--danger)" }}>
                <div style={{ color: "var(--danger)", fontWeight: 500, marginBottom: 4 }}>{parseError}</div>
                <div style={{ color: "var(--text)", marginTop: 4 }}>
                  💡 {PARSE_SUGGESTIONS[Math.min(parseAttempts - 1, PARSE_SUGGESTIONS.length - 1)]}
                </div>
              </div>
            )}
            {parseMsg && parsing && <div style={{ fontSize: 12, color: "var(--info)", marginBottom: 12, padding: "8px 12px", background: "var(--info-bg)", borderRadius: 5 }}>⏳ {parseMsg}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button style={BS} onClick={() => setStep(1)}>Back</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={BS} onClick={() => { setParsedDoors([]); setStep(3); }}>Skip — add manually</button>
                <button style={BP} onClick={parseSchedule} disabled={!pdfFile || parsing}>{parsing ? "Parsing…" : "Parse Schedule"}</button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 6px" }}>
              {parsedDoors.length > 0 ? `${parsedDoors.length} doors found` : "Ready to continue"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
              {parsedDoors.length > 0
                ? "Remove any doors you don't own, then walk through the rest to confirm details."
                : "No doors extracted. Add them manually after creating the project."}
            </p>
            {parsedDoors.length > 0 && (
              <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6, marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", padding: "5px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  {["Door", "Set", "Material"].map((h) => <span key={h} style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>{h}</span>)}
                  <span />
                </div>
                {parsedDoors.map((d, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", padding: "6px 12px", borderBottom: "1px solid rgba(0,0,0,0.07)", fontSize: 12, alignItems: "center" }}>
                    <span style={{ fontWeight: 500 }}>{d.door_id}</span>
                    <span style={{ color: "var(--muted)" }}>{d.hw_set}</span>
                    <span style={{ color: d.door_material ? "var(--text)" : "var(--hint)" }}>{d.door_material || "—"}</span>
                    <button
                      onClick={() => setParsedDoors((prev) => prev.filter((_, idx) => idx !== i))}
                      title="Remove this door"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hint)", fontSize: 14, padding: 0, lineHeight: 1, textAlign: "center" }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <button style={BS} onClick={() => setStep(2)}>Back</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={BS} onClick={finishNow} disabled={saving}>{saving ? "Saving…" : "Save & finish later"}</button>
                {parsedDoors.length > 0
                  ? <button style={BP} onClick={startWizard}>Walk through doors →</button>
                  : <button style={BP} onClick={finishNow} disabled={saving}>{saving ? "Saving…" : "Create Project"}</button>
                }
              </div>
            </div>
          </>
        )}

        {step === 4 && (
          <PerDoorStep
            curDoor={curDoor}
            setCurDoor={setCurDoor}
            wizStep={wizStep}
            totalDoors={parsedDoors.length}
            defaults={defaults}
            setDefaults={setDefaults}
            useDefault={useDefault}
            setUseDefault={setUseDefault}
            saving={saving}
            onFinishNow={finishNow}
            onNext={nextWizDoor}
          />
        )}
      </div>
    </div>
  );
}

interface PerDoorStepProps {
  curDoor: DoorFormData;
  setCurDoor: React.Dispatch<React.SetStateAction<DoorFormData>>;
  wizStep: number;
  totalDoors: number;
  defaults: Record<DefKey, string>;
  setDefaults: React.Dispatch<React.SetStateAction<Record<DefKey, string>>>;
  useDefault: Record<DefKey, boolean>;
  setUseDefault: React.Dispatch<React.SetStateAction<Record<DefKey, boolean>>>;
  saving: boolean;
  onFinishNow: () => void;
  onNext: () => void;
}

function PerDoorStep({ curDoor, setCurDoor, wizStep, totalDoors, defaults, setDefaults, useDefault, setUseDefault, saving, onFinishNow, onNext }: PerDoorStepProps) {
  const set = (k: keyof DoorFormData, v: unknown) => setCurDoor((d) => ({ ...d, [k]: v }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Door {wizStep + 1} of {totalDoors}</h3>
        <span style={{ fontSize: 24, fontWeight: 500, color: "var(--accent)" }}>{curDoor.door_id}</span>
      </div>
      <div style={{ background: "var(--surface)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
        <b style={{ color: "var(--text)", fontWeight: 500 }}>{curDoor.hw_set}</b>
        {curDoor.door_function ? ` · ${curDoor.door_function}` : ""}
        {curDoor.swing && <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 6px", background: "var(--info-bg)", color: "var(--info)", borderRadius: 4, fontWeight: 500 }}>{curDoor.swing}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={DIV_STY}>Identification &amp; Location</div>
        <WizField label="Location / Grid Ref" value={curDoor.location} onChange={(v) => set("location", v)} />
        <WizField label="Elevation Ref" value={curDoor.elevation} onChange={(v) => set("elevation", v)} />

        <div style={DIV_STY}>Door Specs</div>
        <WizDefaultField label="Manufacturer" fieldKey="manufacturer" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} />
        <WizDefaultField label="Model / Series" fieldKey="model" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} />
        <WizDefaultSelectField label="Thermal" fieldKey="thermal" opts={["Thermal", "Non-Thermal"]} curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} />
        <WizField label="Finish" value={curDoor.finish} onChange={(v) => set("finish", v)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={LS}>Door Swing {curDoor.swing ? <span style={{ color: "var(--success)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(from schedule)</span> : null}</label>
          <select style={IS} value={curDoor.swing} onChange={(e) => set("swing", e.target.value)}>
            <option value="">— select —</option>
            {SWING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={LS}>Door Function</label>
          <select style={IS} value={curDoor.door_function} onChange={(e) => set("door_function", e.target.value)}>
            <option value="">— select —</option>
            {DOOR_FUNCTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1", display: "flex", gap: 16, flexWrap: "wrap" }}>
          {(["transom", "sidelite", "fire_rated"] as const).map((k) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={!!curDoor[k]} onChange={(e) => set(k, e.target.checked)} />
              {k === "fire_rated" ? "Fire Rated" : k.charAt(0).toUpperCase() + k.slice(1)}
            </label>
          ))}
        </div>

        <div style={DIV_STY}>Glass</div>
        <WizDefaultField label="Glass Tag" fieldKey="glass_tag" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} />
        <WizDefaultField label="Glass Makeup" fieldKey="glass_makeup" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} full />
        <WizDefaultField label="Glass Size" fieldKey="glass_size" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} />
        <div style={{ display: "flex", alignItems: "center", gap: 7, alignSelf: "flex-end", paddingBottom: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={curDoor.has_midrail} onChange={(e) => set("has_midrail", e.target.checked)} />
            Has Mid Rail?
          </label>
        </div>
        {curDoor.has_midrail && <WizField label="Glass Size (Mid Rail)" value={curDoor.glass_size_midrail} onChange={(v) => set("glass_size_midrail", v)} />}

        <div style={DIV_STY}>Fabrication &amp; QC</div>
        <WizDefaultField label="Work Order #" fieldKey="work_order_prefix" curDoor={curDoor} setCurDoor={setCurDoor} defaults={defaults} setDefaults={setDefaults} useDefault={useDefault} setUseDefault={setUseDefault} woMode />
        <WizField label="QC Sheet Ref" value={curDoor.qc_sheet} onChange={(v) => set("qc_sheet", v)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={LS}>QC Status</label>
          <select style={IS} value={curDoor.qc_status} onChange={(e) => set("qc_status", e.target.value as QcStatus)}>
            {QC_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <WizField label="QC Date" value={curDoor.qc_date} onChange={(v) => set("qc_date", v)} type="date" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 18 }}>
        <button style={BS} onClick={onFinishNow} disabled={saving}>{saving ? "Saving…" : "Save & finish later"}</button>
        <button style={BP} onClick={onNext} disabled={saving}>
          {wizStep + 1 < totalDoors ? "Next Door →" : (saving ? "Saving…" : "Finish & Save")}
        </button>
      </div>
    </>
  );
}

function WizField({ label, value, onChange, type, full }: { label: React.ReactNode; value: string; onChange: (v: string) => void; type?: string; full?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1/-1" : "auto" }}>
      <label style={LS}>{label}</label>
      <input style={IS} type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

interface WizDefaultProps {
  label: string;
  fieldKey: DefKey;
  curDoor: DoorFormData;
  setCurDoor: React.Dispatch<React.SetStateAction<DoorFormData>>;
  defaults: Record<DefKey, string>;
  setDefaults: React.Dispatch<React.SetStateAction<Record<DefKey, string>>>;
  useDefault: Record<DefKey, boolean>;
  setUseDefault: React.Dispatch<React.SetStateAction<Record<DefKey, boolean>>>;
  full?: boolean;
  woMode?: boolean;
}

function WizDefaultField({ label, fieldKey, curDoor, setCurDoor, defaults, setDefaults, useDefault, setUseDefault, full, woMode }: WizDefaultProps) {
  const isDefault = useDefault[fieldKey];
  const displayVal = woMode ? (curDoor.work_order ?? "") : ((curDoor as unknown as Record<string, string>)[fieldKey] ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: full ? "1/-1" : "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={LS}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: isDefault ? "var(--accent)" : "var(--hint)" }}>
          <input type="checkbox" checked={isDefault} style={{ width: 11, height: 11 }}
            onChange={(e) => {
              if (e.target.checked && !defaults[fieldKey]) {
                setDefaults((d) => ({ ...d, [fieldKey]: displayVal }));
              }
              setUseDefault((u) => ({ ...u, [fieldKey]: e.target.checked }));
              if (e.target.checked) setCurDoor((d) => woMode ? { ...d, work_order: defaults[fieldKey] + d.door_id } : { ...d, [fieldKey]: defaults[fieldKey] });
            }}
          />
          default for all
        </label>
      </div>
      <input
        style={{ ...IS, background: isDefault ? "var(--accent-light)" : IS.background, borderColor: isDefault ? "var(--accent)" : undefined }}
        value={displayVal}
        onChange={(e) => {
          const v = e.target.value;
          if (woMode) setCurDoor((d) => ({ ...d, work_order: v }));
          else setCurDoor((d) => ({ ...d, [fieldKey]: v }));
          if (isDefault) setDefaults((d) => ({ ...d, [fieldKey]: v }));
        }}
      />
    </div>
  );
}

function WizDefaultSelectField({ label, fieldKey, opts, curDoor, setCurDoor, defaults, setDefaults, useDefault, setUseDefault }: WizDefaultProps & { opts: string[] }) {
  const isDefault = useDefault[fieldKey];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={LS}>{label}</label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: isDefault ? "var(--accent)" : "var(--hint)" }}>
          <input type="checkbox" checked={isDefault} style={{ width: 11, height: 11 }}
            onChange={(e) => setUseDefault((u) => ({ ...u, [fieldKey]: e.target.checked }))}
          />
          default for all
        </label>
      </div>
      <select
        style={{ ...IS, background: isDefault ? "var(--accent-light)" : IS.background, borderColor: isDefault ? "var(--accent)" : undefined }}
        value={(curDoor as unknown as Record<string, string>)[fieldKey] ?? ""}
        onChange={(e) => {
          setCurDoor((d) => ({ ...d, [fieldKey]: e.target.value }));
          if (isDefault) setDefaults((d) => ({ ...d, [fieldKey]: e.target.value }));
        }}
      >
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
