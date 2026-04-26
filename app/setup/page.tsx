"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, userId: user.id }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Could not create company.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Door <span style={{ color: "var(--accent)" }}>Registry</span></h1>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "22px 24px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Set up your company</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>Create your company workspace. You&apos;ll be the admin and can invite team members later.</p>
          <form onSubmit={handleSetup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Company name</label>
              <input style={{ width: "100%", fontSize: 13, padding: "7px 10px", border: "1px solid var(--border-med)", borderRadius: 6, background: "#fff", color: "var(--text)", outline: "none" }} type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Glazing" required autoFocus />
            </div>
            {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
            <button style={{ fontSize: 13, fontWeight: 500, padding: "8px 14px", border: "none", borderRadius: 6, cursor: "pointer", background: "var(--accent)", color: "#fff" }} type="submit" disabled={loading}>{loading ? "Creating…" : "Create company"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
