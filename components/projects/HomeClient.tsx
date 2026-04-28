"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, Profile } from "@/lib/types";
import { CS } from "@/components/ui";
import ProjectWizard from "./ProjectWizard";

interface DoorStub { door_id: string; project_id: string; }
interface Props { projects: Project[]; doorStubs: DoorStub[]; profile: Profile; }

function sortProjects(list: Project[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export default function HomeClient({ projects, doorStubs, profile }: Props) {
  const router = useRouter();
  const [sorted, setSorted] = useState<Project[]>(() => sortProjects(projects));
  const [showWizard, setShowWizard] = useState(false);

  const doorsFor = (projectId: string) =>
    doorStubs.filter((d) => d.project_id === projectId).map((d) => d.door_id);

  const togglePin = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    const project = sorted.find((p) => p.id === projectId)!;
    const pinned = !project.pinned;
    setSorted((prev) => sortProjects(prev.map((p) => p.id === projectId ? { ...p, pinned } : p)));
    await supabase.from("projects").update({ pinned }).eq("id", projectId);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 2 }}>Dashboard</h1>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{sorted.length} project{sorted.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer", background: "var(--accent)", color: "#fff" }}
          onClick={() => setShowWizard(true)}
        >
          + New Project
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))", gap: 14 }}>
        {sorted.map((p) => {
          const doors = doorsFor(p.id);
          const visible = doors.slice(0, 9);
          const extra = doors.length - visible.length;
          return (
            <div
              key={p.id}
              style={{ ...CS, cursor: "pointer", position: "relative", transition: "box-shadow 0.15s" }}
              onClick={() => router.push(`/projects/${p.id}`)}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {/* Pin button */}
              <button
                onClick={(e) => togglePin(p.id, e)}
                title={p.pinned ? "Unpin" : "Pin to top"}
                style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: p.pinned ? "var(--accent)" : "var(--hint)", padding: 2, lineHeight: 1 }}
              >
                {p.pinned ? "📌" : "⊙"}
              </button>

              {/* Header */}
              <div style={{ paddingRight: 24, marginBottom: 8 }}>
                {p.job_number && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 1 }}>#{p.job_number}</div>}
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                {p.address && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{p.address}</div>}
              </div>

              {/* Door chips */}
              {doors.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                  {visible.map((id) => (
                    <span key={id} style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--text)", fontFamily: "monospace" }}>
                      {id}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span style={{ fontSize: 10, color: "var(--hint)", alignSelf: "center" }}>+{extra} more</span>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--hint)", marginBottom: 10 }}>No doors yet</div>
              )}

              {/* Footer */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 12, color: "var(--muted)" }}>
                {doors.length} door{doors.length !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{ ...CS, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 40, gridColumn: "1/-1" }}>
            No projects yet — click &ldquo;+ New Project&rdquo; to begin.
          </div>
        )}
      </div>

      {showWizard && (
        <ProjectWizard
          companyId={profile.company_id!}
          userId={profile.id}
          onClose={() => setShowWizard(false)}
          onSaved={(projectId) => { setShowWizard(false); router.push(`/projects/${projectId}`); router.refresh(); }}
        />
      )}
    </div>
  );
}
