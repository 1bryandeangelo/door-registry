import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedDoorStub } from "@/lib/types";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch (_) {}
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) { try { return JSON.parse(raw.slice(start, end + 1)); } catch (_) {} }
  throw new Error("Could not extract valid JSON from response.");
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file uploaded." }, { status: 400 });
  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");
  const isImage = file.type.startsWith("image/");
  const mediaType = isImage ? (file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp") : ("application/pdf" as const);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode("data: " + JSON.stringify(data) + "\n\n"));
      try {
        send({ type: "progress", message: "Parsing hardware schedule…" });
        const fileBlock = isImage
          ? ({ type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: b64 } } as const)
          : ({ type: "document", source: { type: "base64", media_type: "application/pdf" as const, data: b64 } } as const);
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5", max_tokens: 4000,
          system: "You are a construction document parser. Extract door data from hardware schedules. You MUST return ONLY a raw JSON object. Start with { end with }. Nothing else.",
          messages: [{ role: "user", content: [fileBlock, { type: "text", text: `Extract all doors from this hardware schedule. Return ONLY valid JSON.\nFormat: {"doors":[{"door_id":"109A","hw_set":"SF-1","door_function":"Entrance / Vestibule","swing":"Pair - Active RH","transom":false,"sidelite":false,"fire_rated":false,"location":"","elevation":"","hw_schedule":"","work_order":"","qc_sheet":"","qc_status":"Pending","qc_date":""}]}\nExtract: door ID, hardware set, door function if stated, swing direction, fire-rated if noted.` }] }],
        });
        const raw = response.content.find((b) => b.type === "text")?.text ?? "";
        const parsed = extractJSON(raw) as { doors?: ParsedDoorStub[] };
        send({ type: "done", doors: parsed.doors ?? [] });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Parse failed." });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
