"use client";

import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BSm } from "@/components/ui";

interface Props { label: string; storagePath: string | null; bucket: string; onUpload: (file: File | null) => void; }

export default function ImageSlot({ label, storagePath, bucket, onUpload }: Props) {
  const supabase = createClient();
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) { setImgUrl(null); return; }
    supabase.storage.from(bucket).createSignedUrl(storagePath, 3600).then(({ data }) => setImgUrl(data?.signedUrl ?? null));
  }, [storagePath, bucket]);

  if (imgUrl) {
    return (
      <div>
        <img src={imgUrl} alt={label} style={{ width: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)" }} />
        <button style={{ ...BSm, marginTop: 5, fontSize: 10 }} onClick={() => onUpload(null)}>Remove</button>
      </div>
    );
  }

  return (
    <div style={{ border: `1px dashed ${drag ? "var(--accent)" : "var(--border-med)"}`, background: drag ? "var(--accent-light)" : "transparent", borderRadius: 6, padding: "20px 12px", textAlign: "center", cursor: "pointer", transition: "all 0.15s" }} onClick={() => ref.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onUpload(f); }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{drag ? "Drop to upload" : label}</div>
      <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 3 }}>{drag ? "" : "Click or drag & drop image"}</div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </div>
  );
}
