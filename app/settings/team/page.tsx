export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/ui/Header";
import TeamClient from "./TeamClient";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/setup");
  const { data: company } = await supabase.from("companies").select("*").eq("id", profile.company_id).single();
  const { data: members } = await supabase.from("profiles").select("id, full_name, role, created_at").eq("company_id", profile.company_id).order("created_at");
  const { data: invitations } = await supabase.from("invitations").select("*").eq("company_id", profile.company_id).is("accepted_at", null).order("created_at", { ascending: false });
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Header profile={profile} />
      <TeamClient company={company} currentProfile={profile} members={members ?? []} invitations={invitations ?? []} />
    </div>
  );
}
