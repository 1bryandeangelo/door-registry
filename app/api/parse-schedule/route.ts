import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { RawHwItem, CutsheetMatch, ScheduleParseResult } from "@/lib/types";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch (_) { /* try next */ }
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch (_) { /* try next */ }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) { /* fall through */ }
  }
  throw new Error("Could not extract valid JSON from response.");
}

/**
 * Two-pass hardware schedule parse.
 * Accepts: multipart form with projectId + file.
 * Streams SSE progress events, then updates all doors and stores the PDF.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const projectId = formData.get("projectId") as string | null;
  const file = formData.get("file") as File | null;

  if (!projectId || !file) {
    return Response.json({ error: "Missing projectId or file." }, { status: 400 });
  }

  // Auth check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");
  const isImage = file.type.startsWith("image/");
  const mediaType = isImage
    ? (file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
    : ("application/pdf" as const);
  const docType = isImage ? ("image" as const) : ("document" as const);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode("data: " + JSON.stringify(data) + "\n\n"));

      try {
        // ── Fetch project + company ──────────────────────────────────────────
        const supa = createServiceClient();
        const { data: project } = await supa
          .from("projects")
          .select("id, company_id, schedule_approved")
          .eq("id", projectId)
          .single();

        if (!project) throw new Error("Project not found.");
        if (!project.schedule_approved) throw new Error("Mark the schedule as approved before parsing.");

        const companyId = project.company_id;

        // ── Pass 1 ───────────────────────────────────────────────────────────
        send({ type: "progress", message: "Pass 1 of 2 — Reading door schedule and hardware sets…" });

        const fileBlock = isImage
          ? ({ type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: b64 } } as const)
          : ({ type: "document", source: { type: "base64", media_type: "application/pdf" as const, data: b64 } } as const);

        const pass1Response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          system: "You are a construction document parser. You MUST return ONLY a raw JSON object with no explanation, no markdown, no code fences. Start with { and end with }.",
          messages: [{
            role: "user",
            content: [
              fileBlock,
              {
                type: "text",
                text: `This is a door hardware schedule submittal package. Read ALL pages carefully.\n\nTASK: Extract two things:\n1. The door index: which hardware set applies to each door ID\n2. The full line items for each hardware set (qty, description, part number, finish, item code, manufacturer code)\n\nReturn ONLY valid JSON, no markdown:\n{\n  "doorSets": {"109A":"SF-1","110A":"SF-1","110B":"SF-2"},\n  "sets": {\n    "SF-1": [\n      {"qty":"16","description":"Hinge, Full Mortise RC","partNumber":"TA2314 NRP 4-1/2x4","finish":"US32D","itemCode":"HI-1","mfr":"MK"}\n    ]\n  }\n}\nExtract every door and every set completely. Part numbers must be exact as written.`,
              },
            ],
          }],
        });

        const pass1Raw = pass1Response.content.find((b) => b.type === "text")?.text ?? "";
        const pass1 = extractJSON(pass1Raw) as ScheduleParseResult;

        // ── Pass 2 ───────────────────────────────────────────────────────────
        send({ type: "progress", message: "Pass 2 of 2 — Matching cutsheets to hardware items…" });

        const usedSets = new Set(Object.values(pass1.doorSets ?? {}));
        const setData = pass1.sets ?? {};
        const allPartNumbers: string[] = [];
        usedSets.forEach((setId) => {
          (setData[setId] ?? []).forEach((item: RawHwItem) => {
            if (item.partNumber) allPartNumbers.push(item.partNumber);
          });
        });
        const uniqueParts = [...new Set(allPartNumbers)];

        const pass2Response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          system: "You are a construction document parser. You MUST return ONLY a raw JSON object with no explanation, no markdown, no code fences. Start with { and end with }.",
          messages: [{
            role: "user",
            content: [
              fileBlock,
              {
                type: "text",
                text: `This is the same hardware schedule submittal package.\nThe back half contains product cutsheets — one or more pages per product.\n\nI need to match cutsheet pages to these part numbers:\n${uniqueParts.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nFor each part number, identify which page numbers in this document contain its cutsheet.\nA cutsheet page may cover multiple products.\n\nReturn ONLY valid JSON:\n{\n  "matches": {\n    "TA2314 NRP 4-1/2x4": {"pages":[6,7],"note":"McKinney TA2314 hinge, highlighted row: 4.5x4"},\n    "EPT2 .689": {"pages":[8,9],"note":"Von Duprin EPT-2 electrical power transfer"}\n  }\n}\nPage numbers are 1-indexed.`,
              },
            ],
          }],
        });

        const pass2Raw = pass2Response.content.find((b) => b.type === "text")?.text ?? "";
        const pass2 = extractJSON(pass2Raw) as { matches: Record<string, CutsheetMatch> };
        const matches = pass2.matches ?? {};

        // ── Upload PDF to storage ────────────────────────────────────────────
        send({ type: "progress", message: "Uploading hardware schedule to storage…" });

        const storagePath = `${companyId}/${projectId}/hw-schedule.${isImage ? "jpg" : "pdf"}`;
        await supa.storage
          .from("hw-cutsheets")
          .upload(storagePath, Buffer.from(bytes), {
            contentType: mediaType,
            upsert: true,
          });

        await supa
          .from("projects")
          .update({ hw_cutsheet_path: storagePath, hw_cutsheet_media_type: mediaType })
          .eq("id", projectId);

        // ── Update all doors ─────────────────────────────────────────────────
        send({ type: "progress", message: "Updating door hardware data…" });

        const { data: doors } = await supa
          .from("doors")
          .select("uid, door_id")
          .eq("project_id", projectId);

        let updatedCount = 0;
        for (const door of (doors ?? [])) {
          const setId = pass1.doorSets?.[door.door_id];
          if (!setId) continue;

          const items = (setData[setId] ?? []).map((item: RawHwItem) => {
            const matchKey = Object.keys(matches).find(
              (k) => k === item.partNumber || k.includes(item.partNumber.split(" ")[0]) || item.partNumber.includes(k.split(" ")[0])
            );
            const match = matchKey ? matches[matchKey] : null;
            return {
              ...item,
              cutsheetPages: match?.pages ?? [],
              cutsheetNote: match?.note ?? "",
            };
          });

          await supa
            .from("doors")
            .update({ hw_set: setId, hw_items: items })
            .eq("uid", door.uid);

          updatedCount++;
        }

        send({
          type: "done",
          message: `Done — updated ${updatedCount} door${updatedCount !== 1 ? "s" : ""} with hardware data.`,
          updatedCount,
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Parse failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
