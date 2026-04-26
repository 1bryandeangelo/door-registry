export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/ui/Header";
import SearchClient from "./SearchClient";

export default async function SearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/setup");
  const { data: projects } = await supabase.from("projects").select("id, name, job_number").eq("company_id", profile.company_id);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header profile={profile} />
      <SearchClient projects={projects ?? []} companyId={profile.company_id} />
    </div>
  );
}
