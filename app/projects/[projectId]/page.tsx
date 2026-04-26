export const dynamic = "force-dynamic";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/ui/Header";
import ProjectClient from "@/components/projects/ProjectClient";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ door?: string }>;
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { door: initialDoorUid } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/setup");
  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).eq("company_id", profile.company_id).single();
  if (!project) notFound();
  const { data: doors } = await supabase.from("doors").select("*").eq("project_id", projectId).order("door_id", { ascending: true });
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <Header profile={profile} projectName={project.name} />
      <ProjectClient project={project} initialDoors={doors ?? []} profile={profile} initialDoorUid={initialDoorUid} />
    </div>
  );
}
