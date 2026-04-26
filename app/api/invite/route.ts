import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const supa = createServiceClient();
  const { data: profile } = await supa.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!profile?.company_id) return NextResponse.json({ error: "No company." }, { status: 400 });
  if (profile.role !== "admin") return NextResponse.json({ error: "Only admins can invite." }, { status: 403 });
  const { data: existing } = await supa.from("invitations").select("id").eq("company_id", profile.company_id).eq("email", email.toLowerCase()).is("accepted_at", null).single();
  if (existing) return NextResponse.json({ error: "An invitation is already pending for this email." }, { status: 400 });
  const { data: invite, error } = await supa.from("invitations").insert({ company_id: profile.company_id, email: email.toLowerCase(), invited_by: user.id }).select().single();
  if (error || !invite) return NextResponse.json({ error: "Could not create invitation." }, { status: 500 });
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`;
  await supa.auth.admin.inviteUserByEmail(email, { redirectTo: inviteUrl, data: { invite_token: invite.token } });
  return NextResponse.json({ ok: true, token: invite.token });
}
