export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "@/components/projects/HomeClient";
import Header from "@/components/ui/Header";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/setup");

  const { data: projects } = await supabase.from("projects").select("*").eq("company_id", profile.company_id).order("created_at", { ascending: false });
  const { data: doorCounts } = await supabase.from("doors").select("project_id, qc_status").eq("company_id", profile.company_id);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header profile={profile} />
      <HomeClient projects={projects ?? []} doorCounts={doorCounts ?? []} profile={profile} />
    </div>
  );
}
