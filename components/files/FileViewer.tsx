"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BSm, BP } from "@/components/ui";

interface ViewingFile { name: string; storagePath: string; mimeType: string | null; }
interface Props { file: ViewingFile; onClose: () => void; }

export default function FileViewer({ file, onClose }: Props) {
  const supabase = createClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isPdf = file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImg = file.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);

  useEffect(() => {
    supabase.storage.from("door-files").createSignedUrl(file.storagePath, 3600).then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [file.storagePath]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</span>
        <button style={BSm} onClick={onClose}>✕ Close</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, background: "#e8e6e0" }}>
        {!signedUrl ? <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</div>
          : isPdf ? <iframe src={signedUrl} style={{ width: "100%", height: "calc(100vh - 160px)", border: "none", borderRadius: 6, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }} title={file.name} />
          : isImg ? <img src={signedUrl} alt={file.name} style={{ maxWidth: "100%", maxHeight: "calc(100vh - 160px)", objectFit: "contain", borderRadius: 6, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }} />
          : <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 12 }}>📄</div><div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Preview not available for this file type.</div><a href={signedUrl} download={file.name} style={{ ...BP, textDecoration: "none", display: "inline-block" }}>Download File</a></div>}
      </div>
    </div>
  );
}
