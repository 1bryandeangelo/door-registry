"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (authError || !authData.user) { setError(authError?.message ?? "Sign up failed."); setLoading(false); return; }
    const res = await fetch("/api/onboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName, userId: authData.user.id }) });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Could not create company."); setLoading(false); return; }
    router.push("/"); router.refresh(); setLoading(false);
  };

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-5">Create your account</h2>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div className="field"><label className="field-label">Your name</label><input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus /></div>
        <div className="field"><label className="field-label">Company name</label><input className="input" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="e.g. Acme Glazing" /></div>
        <div className="field"><label className="field-label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label className="field-label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
      </form>
      <p className="text-xs mt-4" style={{ color: "var(--muted)" }}>Already have an account?{" "}<Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link></p>
    </div>
  );
}
