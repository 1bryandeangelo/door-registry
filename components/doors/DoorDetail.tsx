"use client";

import { useState } from "react";
import type { Door, Project, Profile } from "@/lib/types";
import { qcStyle, tag, BS, BDng, Card, Row } from "@/components/ui";
import DoorModal from "./DoorModal";
import ImageSlot from "@/components/files/ImageSlot";
import NotesTimeline from "@/components/timeline/NotesTimeline";
import HardwareCutsheets from "./HardwareCutsheets";
import { createClient } from "@/lib/supabase/client";

interface Props {
  door: Door;
  project: Project;
  profile: Profile;
  onSaved: (door: Door) => void;
  onDelete: () => void;
}

export default function DoorDetail({ door, project, profile, onSaved, onDelete }: Props) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const qc = qcStyle(door.qc_status);

  const handleImageUpload = async (field: "elevation_image_path" | "floorplan_image_path", file: File | null) => {
    if (!file) {
      if (door[field]) {
        await supabase.storage.from("door-images").remove([door[field]!]);
      }
      await supabase.from("doors").update({ [field]: null }).eq("uid", door.uid);
      onSaved({ ...door, [field]: null });
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${profile.company_id}/${door.project_id}/${door.uid}/${field}.${ext}`;
    await supabase.storage.from("door-images").upload(path, file, { upsert: true });
    await supabase.from("doors").update({ [field]: path }).eq("uid", door.uid);
    onSaved({ ...door, [field]: path });
  };

  if (editing) {
    return (
      <DoorModal
        projectId={door.project_id}
        companyId={profile.company_id!}
        userId={profile.id}
        existingDoorIds={[]}
        initial={door}
        editing
        onClose={() => setEditing(false)}
        onSaved={(d) => { onSaved(d); setEditing(false); }}
      />
    );
  }

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>
            <span style={{ color: "var(--accent)" }}>#</span>{door.door_id}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{door.location}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            <span style={tag(qc.bg, qc.color)}>{door.qc_status}</span>
            {door.thermal && (
              <span style={tag(door.thermal === "Thermal" ? "var(--success-bg)" : "var(--info-bg)", door.thermal === "Thermal" ? "var(--success)" : "var(--info)")}>
                {door.thermal}
              </span>
            )}
            {door.swing && <span style={tag("var(--info-bg)", "var(--info)")}>{door.swing}</span>}
            {door.fire_rated && <span style={tag("var(--danger-bg)", "var(--danger)")}>Fire Rated</span>}
            {door.transom && <span style={tag("var(--accent-light)", "var(--accent)")}>Transom</span>}
            {door.sidelite && <span style={tag("var(--accent-light)", "var(--accent)")}>Sidelite</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={BS} onClick={() => setEditing(true)}>Edit</button>
          <button style={BDng} onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card title="Door Specification">
          <Row label="Manufacturer" value={door.manufacturer} accent />
          <Row label="Model / Series" value={door.model} />
          <Row label="Thermal" value={door.thermal} color={door.thermal === "Thermal" ? "var(--success)" : "var(--info)"} />
          <Row label="Finish" value={door.finish} />
          <Row label="Elevation Ref" value={door.elevation} mono />
        </Card>

        <Card title="Glass">
          <Row label="Glass Tag" value={door.glass_tag} accent />
          <Row label="Glass Makeup" value={door.glass_makeup} />
          <Row label="Glass Size" value={door.glass_size} mono />
          {door.has_midrail && <Row label="Glass Size (Mid Rail)" value={door.glass_size_midrail} mono />}
          <Row label="Mid Rail" value={door.has_midrail ? "Yes" : "No"} color={door.has_midrail ? "var(--accent)" : "var(--muted)"} />
        </Card>

        <Card title="Hardware">
          <Row label="Hardware Set" value={door.hw_set} accent />
          <Row label="Function" value={door.door_function} />
          <Row label="Schedule Ref" value={door.hw_schedule} mono />
        </Card>

        <Card title="Fabrication & QC">
          <Row label="Work Order" value={door.work_order} accent mono />
          <Row label="QC Sheet" value={door.qc_sheet} mono />
          <Row label="QC Status" value={door.qc_status} color={qc.color} />
          <Row label="QC Date" value={door.qc_date ?? undefined} mono />
        </Card>

        {door.hw_items && door.hw_items.length > 0 && (
          <Card title={`Hardware Set Items — ${door.hw_set}`} full>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Qty", "Description", "Part Number", "Finish", "Item", "Mfr", "Cutsheets"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "5px 8px", fontSize: 10, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {door.hw_items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "transparent" : "var(--surface)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 500, color: "var(--accent)" }}>{item.qty}</td>
                      <td style={{ padding: "6px 8px" }}>{item.description}</td>
                      <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11 }}>{item.partNumber}</td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{item.finish}</td>
                      <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11 }}>{item.itemCode}</td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{item.mfr}</td>
                      <td style={{ padding: "6px 8px" }}>
                        {item.cutsheetPages && item.cutsheetPages.length > 0
                          ? <span style={tag("var(--info-bg)", "var(--info)", { fontSize: 10 })}>pp. {item.cutsheetPages.join(", ")}</span>
                          : <span style={{ color: "var(--hint)", fontSize: 11 }}>—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {project.hw_cutsheet_path && door.hw_items?.some((i) => i.cutsheetPages?.length > 0) && (
          <Card title="Hardware Cutsheets" full>
            <HardwareCutsheets door={door} project={project} />
          </Card>
        )}

        <Card title="Door Elevation">
          <ImageSlot
            label="Elevation from Work Order"
            storagePath={door.elevation_image_path}
            bucket="door-images"
            onUpload={(f) => handleImageUpload("elevation_image_path", f)}
          />
        </Card>

        <Card title="Floor Plan Location">
          <ImageSlot
            label="Floor Plan Snippet"
            storagePath={door.floorplan_image_path}
            bucket="door-images"
            onUpload={(f) => handleImageUpload("floorplan_image_path", f)}
          />
        </Card>

        <Card title="Notes & Timeline" full>
          <NotesTimeline doorUid={door.uid} companyId={profile.company_id!} userId={profile.id} />
        </Card>
      </div>
    </div>
  );
}
