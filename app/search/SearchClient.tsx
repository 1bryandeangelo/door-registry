"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Door } from "@/lib/types";
import { DOOR_FUNCTIONS } from "@/lib/types";
import { CS, IS, tag, qcStyle } from "@/components/ui";

interface Project { id: string; name: string; job_number: string | null; }
interface TimelineResult { id: string; door_uid: string; body: string | null; entry_ts: string; category: string; }
interface FileResult { id: string; door_uid: string; name: string; }
interface SearchResult { door: Door; project: Project | undefined; timelineMatches: TimelineResult[]; fileMatches: FileResult[]; }
interface Props { projects: Project[]; companyId: string; }

export default function SearchClient({ projects, companyId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [filterFn, setFilterFn] = useState("");
  const [filterThermal, setFilterThermal] = useState("");
  const [filterQc, setFilterQc] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true); setSearched(true);
    let doorQ = supabase.from("doors").select("*").eq("company_id", companyId);
    if (filterFn) doorQ = doorQ.eq("door_function", filterFn);
    if (filterThermal) doorQ = doorQ.eq("thermal", filterThermal);
    if (filterQc) doorQ = doorQ.eq("qc_status", filterQc);
    if (query.trim()) { const q = `%${query.trim()}%`; doorQ = doorQ.or(`door_id.ilike.${q},location.ilike.${q},manufacturer.ilike.${q},model.ilike.${q},hw_set.ilike.${q},glass_makeup.ilike.${q},work_order.ilike.${q},finish.ilike.${q}`); }
    const { data: doors } = await doorQ.order("door_id");
    if (!doors || doors.length === 0) { setResults([]); setLoading(false); return; }
    const doorUids = doors.map((d) => d.uid);
    let tlResults: TimelineResult[] = [];
    if (query.trim()) { const { data: tl } = await supabase.from("timeline_entries").select("id, door_uid, body, entry_ts, category").in("door_uid", doorUids).ilike("body", `%${query.trim()}%`); tlResults = (tl ?? []) as TimelineResult[]; }
    let fileResults: FileResult[] = [];
    if (query.trim()) { const { data: files } = await supabase.from("door_files").select("id, door_uid, name").in("door_uid", doorUids).ilike("name", `%${query.trim()}%`); fileResults = (files ?? []) as FileResult[]; }
    setResults(doors.map((door) => ({ door: door as Door, project: projects.find((p) => p.id === door.project_id), timelineMatches: tlResults.filter((t) => t.door_uid === door.uid), fileMatches: fileResults.filter((f) => f.door_uid === door.uid) })));
    setLoading(false);
  }, [query, filterFn, filterThermal, filterQc, companyId]);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Global Search</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={{ ...IS, maxWidth: 280 }} placeholder="Search doors, notes, files…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} autoFocus />
        <select style={{ ...IS, width: "auto" }} value={filterFn} onChange={(e) => setFilterFn(e.target.value)}><option value="">All Functions</option>{DOOR_FUNCTIONS.map((f) => <option key={f}>{f}</option>)}</select>
        <select style={{ ...IS, width: "auto" }} value={filterThermal} onChange={(e) => setFilterThermal(e.target.value)}><option value="">All Thermal</option><option>Thermal</option><option>Non-Thermal</option></select>
        <select style={{ ...IS, width: "auto" }} value={filterQc} onChange={(e) => setFilterQc(e.target.value)}><option value="">All QC</option><option>Approved</option><option>Pending</option><option>Failed</option></select>
        <button style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer", background: "var(--accent)", color: "#fff" }} onClick={runSearch} disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      </div>
      {searched && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{results.length} result{results.length !== 1 ? "s" : ""}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map(({ door, project, timelineMatches, fileMatches }) => {
          const qc = qcStyle(door.qc_status);
          return (
            <div key={door.uid} style={{ ...CS, cursor: "pointer" }} onClick={() => router.push(`/projects/${door.project_id}?door=${door.uid}`)}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{door.door_id}</span>
                    {project && <span style={{ fontSize: 11, color: "var(--muted)" }}>{project.job_number ? `#${project.job_number} — ` : ""}{project.name}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{[door.door_function, door.swing, door.manufacturer, door.model].filter(Boolean).join(" · ")}</div>
                  {timelineMatches.length > 0 && <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>{timelineMatches.slice(0, 2).map((t) => <div key={t.id} style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface)", padding: "3px 7px", borderRadius: 4 }}><span style={{ color: "var(--info)", fontWeight: 500, marginRight: 4 }}>{t.category}</span>{t.body?.slice(0, 120)}{(t.body?.length ?? 0) > 120 ? "…" : ""}</div>)}</div>}
                  {fileMatches.length > 0 && <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>{fileMatches.map((f) => <span key={f.id} style={{ fontSize: 10, padding: "1px 6px", background: "var(--surface)", borderRadius: 4, color: "var(--muted)" }}>📎 {f.name}</span>)}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{door.hw_set && <span style={tag("#f5f4f0", "var(--muted)")}>{door.hw_set}</span>}<span style={tag(qc.bg, qc.color)}>{door.qc_status}</span></div>
              </div>
            </div>
          );
        })}
        {searched && results.length === 0 && <div style={{ ...CS, color: "var(--muted)", textAlign: "center", padding: 32, fontSize: 13 }}>No doors match your search.</div>}
        {!searched && <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 32 }}>Enter a search query and press Search to find doors, notes, and files across all projects.</div>}
      </div>
    </div>
  );
}
