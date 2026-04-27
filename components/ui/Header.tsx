"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { useState } from "react";
import { BSm } from "./index";

export default function Header({ profile, projectName }: { profile: Profile | null; projectName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isSearch = pathname === "/search";

  return (
    <div style={{ background: "var(--card)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 500, textDecoration: "none", color: "var(--text)" }}>Door <span style={{ color: "var(--accent)" }}>Registry</span></Link>
        {projectName && <><span style={{ color: "var(--hint)" }}>›</span><span style={{ fontSize: 13, color: "var(--muted)" }}>{projectName}</span></>}
        {isSearch && <><span style={{ color: "var(--hint)" }}>›</span><span style={{ fontSize: 13, color: "var(--muted)" }}>Global Search</span></>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {!isSearch && <Link href="/search" style={{ textDecoration: "none" }}><button style={BSm}>Global Search</button></Link>}
        {profile && <Link href="/settings/team" style={{ textDecoration: "none" }}><button style={BSm}>Team</button></Link>}
        <button style={{ ...BSm, borderColor: "transparent", color: "var(--muted)" }} onClick={handleSignOut} disabled={signingOut}>Sign out</button>
      </div>
    </div>
  );
}
