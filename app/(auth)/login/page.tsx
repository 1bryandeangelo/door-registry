"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); } else { router.push("/"); router.refresh(); }
    setLoading(false);
  };

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-5">Sign in</h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="field"><label className="field-label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
        <div className="field"><label className="field-label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      </form>
      <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>No account?{" "}<Link href="/signup" style={{ color: "var(--accent)" }}>Create one</Link></p>
    </div>
  );
}
