"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Invitation } from "@/lib/types";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("invitations").select("*").eq("token", token).single().then(({ data, error }) => {
      if (error || !data) setError("Invitation not found or expired.");
      else if (data.accepted_at) setError("This invitation has already been used.");
      else setInvite(data as Invitation);
      setLoading(false);
    });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setError(""); setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data: authData, error: signupError } = await supabase.auth.signUp({ email: invite.email, password, options: { data: { full_name: fullName } } });
      if (signupError || !authData.user) { setError(signupError?.message ?? "Sign up failed."); setSubmitting(false); return; }
    }
    const res = await fetch("/api/accept-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Could not accept invitation."); setSubmitting(false); return; }
    router.push("/"); router.refresh();
  };

  if (loading) return <div className="card text-center text-sm" style={{ color: "var(--muted)" }}>Loading…</div>;
  if (error && !invite) return <div className="card text-center text-sm" style={{ color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="card">
      <h2 className="text-base font-medium mb-2">You&rsquo;ve been invited</h2>
      <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Join your team on Door Registry. Your account will be tied to <strong style={{ color: "var(--text)" }}>{invite?.email}</strong>.</p>
      <form onSubmit={handleAccept} className="flex flex-col gap-4">
        <div className="field"><label className="field-label">Your name</label><input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
        <div className="field"><label className="field-label">Choose a password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary w-full" type="submit" disabled={submitting}>{submitting ? "Joining…" : "Join team"}</button>
      </form>
    </div>
  );
}
