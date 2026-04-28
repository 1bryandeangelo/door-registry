"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Plan } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  recentProjects: { id: string; name: string }[];
}

function NavItem({ href, icon, label, active, onClick }: { href: string; icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
        borderRadius: 6, fontSize: 13, fontWeight: active ? 500 : 400,
        color: active ? "var(--accent)" : "var(--text)",
        background: active ? "var(--accent-light)" : "transparent",
        textDecoration: "none", cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      {label}
    </Link>
  );
}

export default function Sidebar({ open, onClose, plan, recentProjects }: Props) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.32)", zIndex: 99 }}
          onClick={onClose}
        />
      )}

      <div style={{
        position: "fixed", top: 0, left: 0, height: "100vh", width: 256,
        background: "var(--card)", borderRight: "1px solid var(--border)",
        zIndex: 100, display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
        boxShadow: open ? "4px 0 24px rgba(0,0,0,0.1)" : "none",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            Door <span style={{ color: "var(--accent)" }}>Registry</span>
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18, padding: 2, lineHeight: 1 }}>✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          <NavItem href="/" icon="⌂" label="Dashboard" active={pathname === "/"} onClick={onClose} />
          <NavItem href="/organization" icon="⊞" label="Organization" active={pathname === "/organization"} onClick={onClose} />

          <div style={{ marginTop: 2 }}>
            <NavItem href="/" icon="📁" label="Projects" active={false} onClick={onClose} />
            {recentProjects.length > 0 && (
              <div style={{ paddingLeft: 28, marginBottom: 2 }}>
                {recentProjects.map((p) => {
                  const isActive = pathname === `/projects/${p.id}`;
                  return (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      onClick={onClose}
                      style={{
                        display: "block", padding: "3px 10px", fontSize: 12, borderRadius: 4,
                        color: isActive ? "var(--accent)" : "var(--muted)",
                        background: isActive ? "var(--accent-light)" : "transparent",
                        textDecoration: "none", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <NavItem href="/issues" icon="⚠" label="Issues" active={pathname === "/issues"} onClick={onClose} />
          <NavItem href="/search" icon="⌕" label="Search" active={pathname === "/search"} onClick={onClose} />

          {plan === "pro" && (
            <NavItem
              href="/reviewer"
              icon="✦"
              label="Hardware Reviewer"
              active={pathname.startsWith("/reviewer")}
              onClick={onClose}
            />
          )}
        </nav>

        <div style={{ padding: "8px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <NavItem href="/settings/team" icon="⚙" label="Settings" active={pathname.startsWith("/settings")} onClick={onClose} />
        </div>
      </div>
    </>
  );
}
