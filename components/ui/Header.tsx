"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useState } from "react";

interface Props {
  profile: Profile | null;
  projectName?: string;
  onMenuClick?: () => void;
}

export default function Header({ profile, projectName, onMenuClick }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{
      background: "var(--card)", borderBottom: "1px solid var(--border)",
      padding: "0 16px", display: "flex", alignItems: "center",
      justifyContent: "space-between", height: 52, position: "sticky",
      top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onMenuClick}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text)", display: "flex", flexDirection: "column", gap: 5, borderRadius: 4 }}
          aria-label="Open menu"
        >
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 1 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 1 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 1 }} />
        </button>

        <Link href="/" style={{ fontSize: 16, fontWeight: 500, textDecoration: "none", color: "var(--text)" }}>
          Door <span style={{ color: "var(--accent)" }}>Registry</span>
        </Link>

        {projectName && (
          <>
            <span style={{ color: "var(--hint)" }}>›</span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{projectName}</span>
          </>
        )}
      </div>

      <button
        style={{ fontSize: 12, padding: "5px 10px", border: "1px solid var(--border-med)", borderRadius: 5, cursor: "pointer", background: "transparent", color: "var(--muted)" }}
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? "…" : "Sign out"}
      </button>
    </div>
  );
}
