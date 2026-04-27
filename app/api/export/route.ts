import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CSV_HEADERS = ["Door ID","Location","Manufacturer","Model","Thermal","Finish","Elevation Ref","Glass Tag","Glass Makeup","Glass Size","Has Mid Rail","Glass Size (Mid Rail)","Hardware Set","Door Function","Swing","Transom","Sidelite","Fire Rated","Work Order","QC Sheet","QC Status","QC Date","HW Schedule Ref"];

function esc(v: string | null | undefined): string {
  if (!v) return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let query = supabase.from("doors").select("*");
  if (projectId) { query = query.eq("project_id", projectId); } else {
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) return NextResponse.json({ error: "No company." }, { status: 400 });
    query = query.eq("company_id", profile.company_id);
  }
  const { data: doors, error } = await query.order("door_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = [CSV_HEADERS.join(","), ...(doors ?? []).map((d) => [d.door_id,d.location,d.manufacturer,d.model,d.thermal,d.finish,d.elevation,d.glass_tag,d.glass_makeup,d.glass_size,d.has_midrail?"Yes":"No",d.glass_size_midrail,d.hw_set,d.door_function,d.swing,d.transom?"Yes":"No",d.sidelite?"Yes":"No",d.fire_rated?"Yes":"No",d.work_order,d.qc_sheet,d.qc_status,d.qc_date,d.hw_schedule].map(esc).join(","))].join("\r\n");
  const filename = projectId ? `doors-${projectId}.csv` : "doors-all.csv";
  return new Response(rows, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
}
