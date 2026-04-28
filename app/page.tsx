export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth-context";
import AppShell from "@/components/layout/AppShell";
import HomeClient from "@/components/projects/HomeClient";

export default async function HomePage() {
  const { supabase, profile, company, recentProjects } = await getAuthContext();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  const { data: doorStubs } = await supabase
    .from("doors")
    .select("door_id, project_id")
    .eq("company_id", profile.company_id);

  return (
    <AppShell profile={profile} company={company} recentProjects={recentProjects}>
      <HomeClient projects={projects ?? []} doorStubs={doorStubs ?? []} profile={profile} />
    </AppShell>
  );
}
