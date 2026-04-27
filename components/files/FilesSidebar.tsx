"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Door, DoorFile } from "@/lib/types";
import { BSm, BDng } from "@/components/ui";

interface ViewingFile { name: string; storagePath: string; mimeType: string | null; }
interface Props { door: Door; files: DoorFile[]; companyId: string; onFilesChange: (files: DoorFile[]) => void; onViewFile: (f: ViewingFile | null) => void; viewingFile: ViewingFile | null; }

export default function FilesSidebar({ door, files, companyId, onFilesChange, onViewFile, viewingFile }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (fileList: FileList) => {
    setUploading(true);
    const newFiles: DoorFile[] = [];
    for (const file of Array.from(fileList)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/${door.project_id}/${door.uid}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from("door-files").upload(path, file);
      if (error) continue;
      const { data: row } = await supabase.from("door_files").insert({ door_uid: door.uid, company_id: companyId, name: file.name, mime_type: file.type, storage_path: path }).select().single();
      if (row) newFiles.push(row as DoorFile);
    }
    onFilesChange([...files, ...newFiles]);
    setUploading(false);
  };

  const removeFile = async (f: DoorFile) => {
    await supabase.storage.from("door-files").remove([f.storage_path]);
    await supabase.from("door_files").delete().eq("id", f.id);
    onFilesChange(files.filter((x) => x.id !== f.id));
    if (viewingFile?.storagePath === f.storage_path) onViewFile(null);
  };

  const commitRename = async (f: DoorFile) => {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    await supabase.from("door_files").update({ name: renameVal.trim() }).eq("id", f.id);
    onFilesChange(files.map((x) => (x.id === f.id ? { ...x, name: renameVal.trim() } : x)));
    setRenamingId(null);
  };

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", maxHeight: 280, display: "flex", flexDirection: "column" }} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }} onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${drag ? "var(--accent)" : "rgba(0,0,0,0.07)"}`, background: drag ? "var(--accent-light)" : "transparent", transition: "all 0.15s" }}>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: drag ? "var(--accent)" : "var(--muted)" }}>{drag ? "Drop files here" : "Files"}</span>
        <button style={{ ...BSm, fontSize: 10, padding: "2px 7px" }} onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "…" : "+ Add"}</button>
        <input ref={fileRef} type="file" accept=".pdf,image/*,.dwg,.dxf,.xlsx,.csv" multiple style={{ display: "none" }} onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {files.length === 0 && <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--hint)" }}>No files attached. Click + Add or drag & drop files here.</div>}
        {files.map((f) => {
          const isViewing = viewingFile?.storagePath === f.storage_path;
          return (
            <div key={f.id} style={{ padding: "6px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)", background: isViewing ? "#fff8ee" : "transparent" }}>
              {renamingId === f.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input style={{ fontSize: 11, padding: "3px 6px", flex: 1, border: "1px solid var(--border-med)", borderRadius: 4, outline: "none" }} value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(f); if (e.key === "Escape") setRenamingId(null); }} autoFocus />
                  <button style={{ ...BSm, fontSize: 10, padding: "2px 6px" }} onClick={() => commitRename(f)}>OK</button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", color: isViewing ? "var(--accent)" : "var(--text)" }} onClick={() => onViewFile({ name: f.name, storagePath: f.storage_path, mimeType: f.mime_type })} title={f.name}>{f.name}</span>
                  <button style={{ ...BSm, fontSize: 9, padding: "1px 5px", flexShrink: 0 }} onClick={() => { setRenamingId(f.id); setRenameVal(f.name); }}>✎</button>
                  <button style={{ ...BDng, fontSize: 9, padding: "1px 5px", flexShrink: 0 }} onClick={() => removeFile(f)}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
