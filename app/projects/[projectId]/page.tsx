export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import AppShell from "@/components/layout/AppShell";
import ProjectClient from "@/components/projects/ProjectClient";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ door?: string }>;
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { projectId } = await params;
  const { door: initialDoorUid } = await searchParams;
  const { supabase, profile, company, recentProjects } = await getAuthContext();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("company_id", profile.company_id)
    .single();
  if (!project) notFound();

  const { data: doors } = await supabase
    .from("doors")
    .select("*")
    .eq("project_id", projectId)
    .order("door_id", { ascending: true });

  return (
    <AppShell profile={profile} company={company} recentProjects={recentProjects} projectName={project.name} fullHeight>
      <ProjectClient project={project} initialDoors={doors ?? []} profile={profile} initialDoorUid={initialDoorUid} />
    </AppShell>
  );
}
