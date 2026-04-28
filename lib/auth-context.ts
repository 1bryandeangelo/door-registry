import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/setup");

  const { data: company } = await supabase.from("companies").select("*").eq("id", profile.company_id).single();
  if (!company) redirect("/setup");

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("updated_at", { ascending: false })
    .limit(10);

  return { supabase, user, profile, company, recentProjects: recentProjects ?? [] };
}
