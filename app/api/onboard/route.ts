import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { companyName, userId } = await req.json();
  if (!companyName || !userId) return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  const supabase = createServiceClient();
  const { data: company, error: companyError } = await supabase.from("companies").insert({ name: companyName }).select().single();
  if (companyError || !company) return NextResponse.json({ error: "Could not create company." }, { status: 500 });
  const { error: profileError } = await supabase.from("profiles").update({ company_id: company.id, role: "admin" }).eq("id", userId);
  if (profileError) return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  return NextResponse.json({ companyId: company.id });
}
