"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Project, Door, Profile } from "@/lib/types";
import DoorListItem from "@/components/doors/DoorListItem";
import DoorDetail from "@/components/doors/DoorDetail";
import DoorModal from "@/components/doors/DoorModal";
import FilesSidebar from "@/components/files/FilesSidebar";
import FileViewer from "@/components/files/FileViewer";
import HardwareSchedulePanel from "@/components/doors/HardwareSchedulePanel";
import { BS, BDng, BP, tag } from "@/components/ui";
import type { DoorFile } from "@/lib/types";

interface Props {
  project: Project;
  initialDoors: Door[];
  profile: Profile;
  initialDoorUid?: string;
}

export default function ProjectClient({ project: initialProject, initialDoors, profile, initialDoorUid }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState(initialProject);
  const [doors, setDoors] = useState<Door[]>(initialDoors);
  const [activeDoorId, setActiveDoorId] = useState<string | null>(initialDoorUid ?? null);
  const [showAddDoor, setShowAddDoor] = useState(false);
  const [search, setSearch] = useState("");
  const [viewingFile, setViewingFile] = useState<{ name: string; storagePath: string; mimeType: string | null } | null>(null);
  const [doorFiles, setDoorFiles] = useState<DoorFile[]>([]);

  const activeDoor = activeDoorId ? doors.find((d) => d.uid === activeDoorId) ?? null : null;

  // Load files for active door
  useEffect(() => {
    if (!activeDoor) { setDoorFiles([]); return; }
    supabase
      .from("door_files")
      .select("*")
      .eq("door_uid", activeDoor.uid)
      .order("created_at", { ascending: true })
      .then(({ data }) => setDoorFiles(data ?? []));
  }, [activeDoor?.uid]);

  // Supabase Realtime — keep door list live for the whole team
  useEffect(() => {
    const channel = supabase
      .channel(`project:${project.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "doors", filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setDoors((prev) => prev.filter((d) => d.uid !== payload.old.uid));
            setActiveDoorId((id) => (id === payload.old.uid ? null : id));
          } else if (payload.eventType === "INSERT") {
            setDoors((prev) => {
              if (prev.find((d) => d.uid === payload.new.uid)) return prev;
              return [...prev, payload.new as Door].sort((a, b) => a.door_id.localeCompare(b.door_id));
            });
          } else if (payload.eventType === "UPDATE") {
            setDoors((prev) => prev.map((d) => (d.uid === payload.new.uid ? (payload.new as Door) : d)));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [project.id]);

  const handleDoorSaved = useCallback((door: Door) => {
    setDoors((prev) => {
      const idx = prev.findIndex((d) => d.uid === door.uid);
      if (idx >= 0) return prev.map((d) => (d.uid === door.uid ? door : d));
      return [...prev, door].sort((a, b) => a.door_id.localeCompare(b.door_id));
    });
    setActiveDoorId(door.uid);
  }, []);

  const handleDeleteDoor = useCallback(async (doorUid: string) => {
    await supabase.from("doors").delete().eq("uid", doorUid);
    setDoors((prev) => prev.filter((d) => d.uid !== doorUid));
    setActiveDoorId(null);
  }, []);

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    await supabase.from("projects").delete().eq("id", project.id);
    router.push("/");
    router.refresh();
  };

  const handleToggleApproved = async () => {
    const updated = { ...project, schedule_approved: !project.schedule_approved };
    await supabase.from("projects").update({ schedule_approved: updated.schedule_approved }).eq("id", project.id);
    setProject(updated);
  };

  const filtered = doors.filter((d) =>
    !search || `${d.door_id} ${d.location ?? ""} ${d.hw_set ?? ""} ${d.door_function ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const qcCounts = {
    approved: doors.filter((d) => d.qc_status === "Approved").length,
    failed:   doors.filter((d) => d.qc_status === "Failed").length,
    pending:  doors.filter((d) => d.qc_status === "Pending").length,
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
      <div style={{ width: 260, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "var(--card)", flexShrink: 0 }}>
        {/* Project header */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          {project.job_number && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginBottom: 1 }}>#{project.job_number}</div>}
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{project.name}</div>
          <input
            style={{ width: "100%", fontSize: 12, padding: "5px 8px", border: "1px solid var(--border-med)", borderRadius: 5, background: "#fff", outline: "none" }}
            placeholder="Search doors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Door list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: 20, color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
              {doors.length === 0 ? "No doors yet." : "No doors match search."}
            </div>
          )}
          {filtered.map((d) => (
            <DoorListItem
              key={d.uid}
              door={d}
              active={d.uid === activeDoorId}
              onClick={() => { setActiveDoorId(d.uid); setViewingFile(null); }}
            />
          ))}
        </div>

        {/* Files sidebar for selected door */}
        {activeDoor && (
          <FilesSidebar
            door={activeDoor}
            files={doorFiles}
            companyId={profile.company_id!}
            onFilesChange={setDoorFiles}
            onViewFile={setViewingFile}
            viewingFile={viewingFile}
          />
        )}
      </div>

      {/* ── MAIN PANEL ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
        {viewingFile ? (
          <FileViewer file={viewingFile} onClose={() => setViewingFile(null)} />
        ) : activeDoor ? (
          <DoorDetail
            key={activeDoor.uid}
            door={activeDoor}
            project={project}
            profile={profile}
            onSaved={handleDoorSaved}
            onDelete={() => handleDeleteDoor(activeDoor.uid)}
          />
        ) : (
          <div style={{ padding: "32px 28px" }}>
            {/* Project overview */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                {project.job_number && (
                  <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                    Job #{project.job_number}
                  </div>
                )}
                <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project.name}</h2>
                {project.address && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{project.address}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                <span style={tag("var(--success-bg)", "var(--success)", { fontSize: 12 })}>{qcCounts.approved} QC Approved</span>
                {qcCounts.failed > 0 && <span style={tag("var(--danger-bg)", "var(--danger)", { fontSize: 12 })}>{qcCounts.failed} Failed</span>}
                <span style={tag("var(--warning-bg)", "var(--warning)", { fontSize: 12 })}>{qcCounts.pending} Pending</span>
                <button
                  style={{ ...BS, fontSize: 12 }}
                  onClick={handleToggleApproved}
                >
                  {project.schedule_approved ? "✓ Schedule Approved" : "Mark Approved"}
                </button>
                <a href={`/api/export?projectId=${project.id}`} download style={{ textDecoration: "none" }}>
                  <button style={BS}>Export CSV</button>
                </a>
                <button style={BDng} onClick={handleDeleteProject}>Delete Project</button>
                <button style={BP} onClick={() => setShowAddDoor(true)}>+ Add Door</button>
              </div>
            </div>

            {/* Hardware Schedule Parse Panel */}
            <HardwareSchedulePanel
              project={project}
              onParseDone={() => router.refresh()}
            />

            <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
              {doors.length === 0
                ? "No doors yet — click + Add Door to begin."
                : "← Select a door from the list to view its record."}
            </div>
          </div>
        )}
      </div>

      {showAddDoor && (
        <DoorModal
          projectId={project.id}
          companyId={profile.company_id!}
          userId={profile.id}
          existingDoorIds={doors.map((d) => d.door_id)}
          onClose={() => setShowAddDoor(false)}
          onSaved={(door) => { handleDoorSaved(door); setShowAddDoor(false); }}
        />
      )}
    </div>
  );
}
