import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedDoorStub } from "@/lib/types";

export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_doors",
  description: "Extract all doors found in the hardware schedule.",
  input_schema: {
    type: "object" as const,
    properties: {
      doors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            door_id:       { type: "string", description: "Door number/ID e.g. '101', '202A'" },
            hw_set:        { type: "string", description: "Hardware set label e.g. 'SF-1'" },
            door_function: { type: "string", description: "Function or description if listed" },
            swing:         { type: "string", description: "Swing direction e.g. 'Active RH', 'Pair - Active LH'" },
            fire_rated:    { type: "boolean", description: "True if fire-rated is noted" },
            transom:       { type: "boolean", description: "True if transom is noted" },
            sidelite:      { type: "boolean", description: "True if sidelite is noted" },
            location:      { type: "string", description: "Room or location description if listed" },
          },
          required: ["door_id"],
        },
      },
    },
    required: ["doors"],
  },
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file uploaded." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const b64 = Buffer.from(bytes).toString("base64");
  const isImage = file.type.startsWith("image/");
  const mediaType = isImage
    ? (file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
    : ("application/pdf" as const);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode("data: " + JSON.stringify(data) + "\n\n"));

      try {
        send({ type: "progress", message: "Reading schedule…" });

        const fileBlock = isImage
          ? ({ type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: b64 } } as const)
          : ({ type: "document", source: { type: "base64", media_type: "application/pdf" as const, data: b64 } } as const);

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          tools: [EXTRACT_TOOL],
          tool_choice: { type: "any" },
          system: "You are a construction document parser. Extract every door entry from the hardware schedule provided. If a field is not present leave it as an empty string or false.",
          messages: [{
            role: "user",
            content: [
              fileBlock,
              { type: "text", text: "Extract all doors from this hardware schedule." },
            ],
          }],
        });

        const toolUse = response.content.find((b) => b.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          throw new Error("Model did not return structured data. Try uploading a clearer image.");
        }

        const parsed = toolUse.input as { doors?: ParsedDoorStub[] };
        send({ type: "done", doors: parsed.doors ?? [] });
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
