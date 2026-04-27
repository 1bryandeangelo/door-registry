"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Door, Project } from "@/lib/types";
import { BSm } from "@/components/ui";

interface Props {
  door: Door;
  project: Project;
}

export default function HardwareCutsheets({ door, project }: Props) {
  const supabase = createClient();
  const [selected, setSelected] = useState<{ pageKey: string; pages: number[]; items: { itemCode: string; description: string }[]; note: string } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [cutsheetUrl, setCutsheetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!project.hw_cutsheet_path) return;
    supabase.storage
      .from("hw-cutsheets")
      .createSignedUrl(project.hw_cutsheet_path, 3600)
      .then(({ data }) => setCutsheetUrl(data?.signedUrl ?? null));
  }, [project.hw_cutsheet_path]);

  const groups: { pageKey: string; pages: number[]; items: typeof door.hw_items; note: string }[] = [];
  const seenPageSets = new Set<string>();

  (door.hw_items ?? []).forEach((item) => {
    if (!item.cutsheetPages?.length) return;
    const key = [...item.cutsheetPages].sort((a, b) => a - b).join(",");
    if (seenPageSets.has(key)) {
      groups.find((g) => g.pageKey === key)?.items.push(item);
    } else {
      seenPageSets.add(key);
      groups.push({ pageKey: key, pages: item.cutsheetPages, items: [item], note: item.cutsheetNote });
    }
  });

  if (groups.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--hint)" }}>No cutsheet pages matched yet. Run the hardware schedule parse from the project page.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {groups.map((g) => {
          const label = g.items.map((it) => it.itemCode || it.description.split(",")[0]).join(" / ");
          const isSel = selected?.pageKey === g.pageKey;
          return (
            <button
              key={g.pageKey}
              style={{ fontSize: 11, fontWeight: 500, padding: "4px 9px", border: "1px solid var(--border-med)", borderRadius: 5, cursor: "pointer", background: isSel ? "var(--accent-light)" : "transparent", borderColor: isSel ? "var(--accent)" : undefined, color: isSel ? "var(--accent)" : "var(--text)" }}
              onClick={() => setSelected(isSel ? null : g)}
            >
              {label} <span style={{ color: "var(--muted)", fontWeight: 400 }}>(pp. {g.pages.join(", ")})</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            <b style={{ color: "var(--text)", fontWeight: 500 }}>{selected.items.map((i) => i.description).join(" / ")}</b>
            {selected.note && <span> — {selected.note}</span>}
          </div>
          <div style={{ background: "#e8e6e0", borderRadius: 8, padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {selected.pages.map((pageNum) => (
              <CutsheetPage
                key={pageNum}
                pageNum={pageNum}
                signedUrl={cutsheetUrl}
                isImage={project.hw_cutsheet_media_type?.startsWith("image/") ?? false}
                onLightbox={setLightbox}
              />
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 6 }} />
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

function CutsheetPage({ pageNum, signedUrl, isImage, onLightbox }: {
  pageNum: number;
  signedUrl: string | null;
  isImage: boolean;
  onLightbox: (src: string) => void;
}) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!signedUrl) return;

    const render = async () => {
      try {
        if (isImage) {
          setImgSrc(signedUrl);
          setLoading(false);
          return;
        }

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();

        const pdf = await pdfjsLib.getDocument(signedUrl).promise;
        const page = await pdf.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvas, viewport } as Parameters<typeof page.render>[0]).promise;
        setImgSrc(canvas.toDataURL());
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    render();
  }, [pageNum, signedUrl, isImage]);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Page {pageNum}</div>
      {loading && !error && (
        <div style={{ width: 200, height: 280, background: "rgba(0,0,0,0.08)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>
          Loading…
        </div>
      )}
      {error && (
        <div style={{ width: 200, height: 100, background: "var(--surface)", borderRadius: 4, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, padding: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Page {pageNum}</div>
          <div style={{ fontSize: 10, color: "var(--hint)" }}>Preview unavailable</div>
        </div>
      )}
      {imgSrc && !loading && (
        <img
          src={imgSrc}
          onClick={() => onLightbox(imgSrc)}
          style={{ maxWidth: 240, maxHeight: 340, objectFit: "contain", borderRadius: 4, border: "1px solid var(--border)", cursor: "zoom-in", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        />
      )}
    </div>
  );
}
