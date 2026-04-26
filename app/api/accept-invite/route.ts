import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const supabase = createServiceClient();
  const { data: invite, error: inviteError } = await supabase.from("invitations").select("*").eq("token", token).single();
  if (inviteError || !invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  if (invite.accepted_at) return NextResponse.json({ error: "Invitation already used." }, { status: 400 });
  const { error: profileError } = await supabase.from("profiles").update({ company_id: invite.company_id, role: "member" }).eq("id", user.id);
  if (profileError) return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  await supabase.from("invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  return NextResponse.json({ ok: true });
}
