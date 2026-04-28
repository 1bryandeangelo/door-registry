export const dynamic = "force-dynamic";
import { getAuthContext } from "@/lib/auth-context";
import AppShell from "@/components/layout/AppShell";

export default async function IssuesPage() {
  const { profile, company, recentProjects } = await getAuthContext();

  return (
    <AppShell profile={profile} company={company} recentProjects={recentProjects}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: 2 }}>Issues</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Issue tracking coming soon.</p>
      </div>
    </AppShell>
  );
}
