"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company, Profile, Invitation } from "@/lib/types";
import { CS, BS, BP, BDng, IS, LS, BSm, tag } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface Props {
  company: Company | null;
  currentProfile: Profile;
  members: Pick<Profile, "id" | "full_name" | "role" | "created_at">[];
  invitations: Invitation[];
}

export default function TeamClient({ company, currentProfile, members, invitations: initialInvites }: Props) {
  const router = useRouter();
  const isAdmin = currentProfile.role === "admin";
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState(initialInvites);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setInviteError(""); setInviteSuccess("");
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail.trim() }) });
    const data = await res.json();
    if (!res.ok) { setInviteError(data.error ?? "Could not send invitation."); } else { setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}.`); setInviteEmail(""); router.refresh(); }
    setInviting(false);
  };

  const cancelInvite = async (id: string) => {
    const supabase = createClient();
    await supabase.from("invitations").delete().eq("id", id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  const removeMember = async (memberId: string) => {
    if (!confirm("Remove this member from the team? They will lose access immediately.")) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ company_id: null }).eq("id", memberId);
    router.refresh();
  };

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 4 }}>Team</h1>
      {company && <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>{company.name}</p>}
      <div style={{ ...CS, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>Members ({members.length})</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              <div><span style={{ fontSize: 13, fontWeight: 500 }}>{m.full_name ?? "—"}</span>{m.id === currentProfile.id && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>(you)</span>}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={tag(m.role === "admin" ? "var(--accent-light)" : "var(--surface)", m.role === "admin" ? "var(--accent)" : "var(--muted)")}>{m.role}</span>
                <span style={{ fontSize: 11, color: "var(--hint)" }}>joined {fmtDate(m.created_at)}</span>
                {isAdmin && m.id !== currentProfile.id && <button style={{ ...BDng, fontSize: 10, padding: "2px 7px" }} onClick={() => removeMember(m.id)}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {invitations.length > 0 && (
        <div style={{ ...CS, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>Pending Invitations</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {invitations.map((inv) => (
              <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span>{inv.email}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--hint)" }}>sent {fmtDate(inv.created_at)}</span>
                  {isAdmin && <button style={{ ...BDng, fontSize: 10, padding: "2px 7px" }} onClick={() => cancelInvite(inv.id)}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isAdmin && (
        <div style={CS}>
          <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>Invite a Team Member</div>
          <form onSubmit={sendInvite} style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={LS}>Email address</label>
              <input style={IS} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" required />
            </div>
            <div style={{ alignSelf: "flex-end" }}><button style={BP} type="submit" disabled={inviting}>{inviting ? "Sending…" : "Send Invite"}</button></div>
          </form>
          {inviteError && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 8 }}>{inviteError}</p>}
          {inviteSuccess && <p style={{ fontSize: 12, color: "var(--success)", marginTop: 8 }}>{inviteSuccess}</p>}
          <p style={{ fontSize: 11, color: "var(--hint)", marginTop: 8 }}>They&apos;ll receive an email with a link to join your team. Invitation expires after 7 days.</p>
        </div>
      )}
    </div>
  );
}
