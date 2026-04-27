"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, Profile } from "@/lib/types";
import { CS, tag } from "@/components/ui";
import ProjectWizard from "./ProjectWizard";

interface DoorCount { project_id: string; qc_status: string; }
interface Props { projects: Project[]; doorCounts: DoorCount[]; profile: Profile; }

export default function HomeClient({ projects, doorCounts, profile }: Props) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);

  function countsFor(projectId: string) {
    const rows = doorCounts.filter((d) => d.project_id === projectId);
    return { total: rows.length, approved: rows.filter((d) => d.qc_status === "Approved").length, failed: rows.filter((d) => d.qc_status === "Failed").length };
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>Projects</h1>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={{ fontSize: 13, fontWeight: 500, padding: "6px 14px", border: "none", borderRadius: 6, cursor: "pointer", background: "var(--accent)", color: "#fff" }} onClick={() => setShowWizard(true)}>+ New Project</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {projects.map((p) => {
          const c = countsFor(p.id);
          return (
            <div key={p.id} style={{ ...CS, cursor: "pointer", transition: "box-shadow 0.15s" }} onClick={() => router.push(`/projects/${p.id}`)} onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")} onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>{p.job_number && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>#{p.job_number}</div>}<div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{p.name}</div></div>
                {p.schedule_approved && <span style={tag("var(--success-bg)", "var(--success)")}>Approved</span>}
              </div>
              {p.address && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{p.address}</div>}
              <div style={{ display: "flex", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 9, marginTop: 9 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}><b style={{ color: "var(--text)", fontWeight: 500 }}>{c.total}</b> doors</span>
                <span style={{ fontSize: 12, color: "var(--success)" }}><b style={{ fontWeight: 500 }}>{c.approved}</b> QC ok</span>
                {c.failed > 0 && <span style={{ fontSize: 12, color: "var(--danger)" }}><b style={{ fontWeight: 500 }}>{c.failed}</b> failed</span>}
              </div>
            </div>
          );
        })}
        {projects.length === 0 && <div style={{ ...CS, color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 32, gridColumn: "1/-1" }}>No projects yet. Click &ldquo;+ New Project&rdquo; to begin.</div>}
      </div>
      {showWizard && <ProjectWizard companyId={profile.company_id!} userId={profile.id} onClose={() => setShowWizard(false)} onSaved={(projectId) => { setShowWizard(false); router.push(`/projects/${projectId}`); router.refresh(); }} />}
    </div>
  );
}
