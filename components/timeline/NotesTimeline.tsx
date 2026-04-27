"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TimelineEntry, TimelinePhoto, NoteCategory } from "@/lib/types";
import { NOTE_CATEGORIES } from "@/lib/types";
import { BS, BP, BSm, BDng, IS, LS, CAT_COLORS, tag } from "@/components/ui";

interface Props {
  doorUid: string;
  companyId: string;
  userId: string;
}

export default function NotesTimeline({ doorUid, companyId, userId }: Props) {
  const supabase = createClient();
  const photoRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [cat, setCat] = useState<NoteCategory>("General");
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCat, setEditCat] = useState<NoteCategory>("General");
  const [editDate, setEditDate] = useState("");

  const [lightbox, setLightbox] = useState<string | null>(null);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("timeline_entries")
      .select("*, photos:timeline_photos(*)")
      .eq("door_uid", doorUid)
      .order("entry_ts", { ascending: false });
    setEntries((data as TimelineEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, [doorUid]);

  const photoUrl = async (path: string) => {
    const { data } = await supabase.storage.from("timeline-photos").createSignedUrl(path, 3600);
    return data?.signedUrl ?? "";
  };

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const paths = entries.flatMap((e) => (e.photos ?? []).map((p) => p.storage_path));
    const missing = paths.filter((p) => !photoUrls[p]);
    if (missing.length === 0) return;
    Promise.all(missing.map(async (p) => [p, await photoUrl(p)] as [string, string])).then((pairs) => {
      setPhotoUrls((prev) => { const next = { ...prev }; pairs.forEach(([p, u]) => (next[p] = u)); return next; });
    });
  }, [entries]);

  const addPhotoFiles = (files: FileList) => {
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPendingPhotos((prev) => [...prev, ...newFiles]);
    setPendingPreviews((prev) => [...prev, ...newPreviews]);
  };

  const addNote = async () => {
    if (!text.trim() && pendingPhotos.length === 0) return;
    setSaving(true);

    const { data: entry, error } = await supabase
      .from("timeline_entries")
      .insert({ door_uid: doorUid, company_id: companyId, category: cat, body: text.trim() || null, created_by: userId })
      .select()
      .single();

    if (error || !entry) { setSaving(false); return; }

    for (const file of pendingPhotos) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/${doorUid}/${entry.id}/${Date.now()}_${safeName}`;
      await supabase.storage.from("timeline-photos").upload(path, file);
      await supabase.from("timeline_photos").insert({ entry_id: entry.id, storage_path: path });
    }

    pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    setText("");
    setCat("General");
    setPendingPhotos([]);
    setPendingPreviews([]);
    setSaving(false);
    loadEntries();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("timeline_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const commitEdit = async (id: string) => {
    await supabase
      .from("timeline_entries")
      .update({ body: editText, category: editCat, entry_ts: new Date(editDate).toISOString() })
      .eq("id", id);
    setEditingId(null);
    loadEntries();
  };

  const fmtDate = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch { return ts; }
  };

  if (loading) return <div style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>Loading…</div>;

  return (
    <div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select style={{ ...IS, width: "auto", fontSize: 12 }} value={cat} onChange={(e) => setCat(e.target.value as NoteCategory)}>
            {NOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button style={{ ...BSm, fontSize: 11 }} onClick={() => photoRef.current?.click()}>
            + Photos{pendingPhotos.length > 0 ? ` (${pendingPhotos.length})` : ""}
          </button>
          <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => e.target.files && addPhotoFiles(e.target.files)} />
        </div>

        {pendingPreviews.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {pendingPreviews.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={p} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                <button
                  onClick={() => { setPendingPhotos((ps) => ps.filter((_, j) => j !== i)); setPendingPreviews((ps) => { URL.revokeObjectURL(ps[i]); return ps.filter((_, j) => j !== i); }); }}
                  style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            style={{ ...IS, flex: 1, minHeight: 56, resize: "vertical", lineHeight: 1.5 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note…"
            onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote(); }}
          />
          <button style={{ ...BP, alignSelf: "flex-end", whiteSpace: "nowrap" }} onClick={addNote} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--hint)", marginTop: 4 }}>Cmd+Enter to save</div>
      </div>

      {entries.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--hint)", textAlign: "center", padding: "20px 0" }}>
          No notes yet. Add the first entry above.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.map((n) => {
          const cc = CAT_COLORS[n.category] ?? CAT_COLORS["Other"];
          return (
            <div key={n.id} style={{ background: "var(--card)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={tag(cc.bg, cc.color, { fontSize: 10 })}>{n.category}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(n.entry_ts)}</span>
                  {n.author_name && <span style={{ fontSize: 10, color: "var(--hint)" }}>by {n.author_name}</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...BSm, fontSize: 10, padding: "2px 7px" }} onClick={() => { setEditingId(n.id); setEditText(n.body ?? ""); setEditCat(n.category); setEditDate(n.entry_ts.slice(0, 16)); }}>Edit</button>
                  <button style={{ ...BDng, fontSize: 10, padding: "2px 7px" }} onClick={() => deleteEntry(n.id)}>Delete</button>
                </div>
              </div>

              <div style={{ padding: "10px 12px" }}>
                {editingId === n.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select style={{ ...IS, width: "auto", fontSize: 12 }} value={editCat} onChange={(e) => setEditCat(e.target.value as NoteCategory)}>
                        {NOTE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                        <label style={{ fontSize: 10, color: "var(--muted)" }}>Date &amp; Time</label>
                        <input type="datetime-local" style={{ ...IS, fontSize: 12 }} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                      </div>
                    </div>
                    <textarea style={{ ...IS, minHeight: 56, resize: "vertical" }} value={editText} onChange={(e) => setEditText(e.target.value)} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button style={BS} onClick={() => setEditingId(null)}>Cancel</button>
                      <button style={BP} onClick={() => commitEdit(n.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {n.body && <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{n.body}</p>}
                    {n.photos && n.photos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: n.body ? 8 : 0 }}>
                        {(n.photos as TimelinePhoto[]).map((ph) => (
                          photoUrls[ph.storage_path] ? (
                            <img
                              key={ph.id}
                              src={photoUrls[ph.storage_path]}
                              onClick={() => setLightbox(photoUrls[ph.storage_path])}
                              style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 5, border: "1px solid var(--border)", cursor: "pointer", transition: "transform 0.1s" }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                            />
                          ) : (
                            <div key={ph.id} style={{ width: 72, height: 72, background: "var(--surface)", borderRadius: 5 }} />
                          )
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 6 }} />
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
