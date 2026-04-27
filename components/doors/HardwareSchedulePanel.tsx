"use client";

import { useState, useRef } from "react";
import type { Project } from "@/lib/types";
import { BP, BS } from "@/components/ui";

interface Props {
  project: Project;
  onParseDone: () => void;
}

type ParseStatus = "" | "parsing" | "done" | "error";

export default function HardwareSchedulePanel({ project, onParseDone }: Props) {
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [parseStatus, setParseStatus] = useState<ParseStatus>("");
  const [parseMsg, setParseMsg] = useState("");
  const schedRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const parseHardwareSchedule = async () => {
    if (!scheduleFile) return;

    setParseStatus("parsing");
    setParseMsg("Uploading and starting parse…");

    const formData = new FormData();
    formData.append("projectId", project.id);
    formData.append("file", scheduleFile);

    try {
      const res = await fetch("/api/parse-schedule", { method: "POST", body: formData });
      if (!res.ok || !res.body) throw new Error("Server error.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "progress") {
            setParseMsg(evt.message);
          } else if (evt.type === "done") {
            setParseStatus("done");
            setParseMsg(evt.message);
            onParseDone();
          } else if (evt.type === "error") {
            setParseStatus("error");
            setParseMsg(evt.message);
          }
        }
      }
    } catch (e) {
      setParseStatus("error");
      setParseMsg(e instanceof Error ? e.message : "Parse failed.");
    }
  };

  const msgBg = parseStatus === "error" ? "var(--danger-bg)" : parseStatus === "done" ? "var(--success-bg)" : "var(--info-bg)";
  const msgColor = parseStatus === "error" ? "var(--danger)" : parseStatus === "done" ? "var(--success)" : "var(--info)";

  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
        Hardware Schedule Parse
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14, lineHeight: 1.6 }}>
        Upload the full hardware schedule submittal PDF. The AI reads the door index and set pages, then matches each door to its hardware items and cutsheet pages.
      </p>

      <div
        style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setScheduleFile(f); }}
      >
        <div
          style={{ border: `1px dashed ${drag ? "var(--accent)" : "var(--border-med)"}`, background: drag ? "var(--accent-light)" : "var(--surface)", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: scheduleFile ? "var(--text)" : "var(--muted)", flex: 1, minWidth: 180 }}
          onClick={() => schedRef.current?.click()}
        >
          {scheduleFile ? scheduleFile.name : "Click or drag to upload hardware schedule PDF"}
        </div>
        <input ref={schedRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && setScheduleFile(e.target.files[0])} />
        <button
          style={BP}
          onClick={parseHardwareSchedule}
          disabled={parseStatus === "parsing" || !scheduleFile}
        >
          {parseStatus === "parsing" ? "Parsing…" : "Parse Schedule"}
        </button>
      </div>

      {!project.schedule_approved && (
        <div style={{ fontSize: 12, color: "var(--warning)", padding: "6px 10px", background: "var(--warning-bg)", borderRadius: 5, marginBottom: 8 }}>
          Schedule not marked approved — cutsheet matching will be skipped. Mark approved in the project header.
        </div>
      )}

      {parseMsg && (
        <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 5, background: msgBg, color: msgColor }}>
          {parseStatus === "parsing" && "⏳ "}{parseStatus === "done" && "✓ "}{parseMsg}
        </div>
      )}
    </div>
  );
}
