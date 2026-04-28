"use client";

import { useState } from "react";
import Header from "@/components/ui/Header";
import Sidebar from "./Sidebar";
import type { Profile, Company } from "@/lib/types";

interface Props {
  profile: Profile;
  company: Company;
  recentProjects: { id: string; name: string }[];
  projectName?: string;
  fullHeight?: boolean;
  children: React.ReactNode;
}

export default function AppShell({ profile, company, recentProjects, projectName, fullHeight, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{
      display: "flex", flexDirection: "column", background: "var(--bg)",
      ...(fullHeight ? { height: "100vh", overflow: "hidden" } : { minHeight: "100vh" }),
    }}>
      <Header profile={profile} projectName={projectName} onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        plan={company.plan}
        recentProjects={recentProjects}
      />
      <div style={{
        flex: 1,
        ...(fullHeight ? { overflow: "hidden", display: "flex", flexDirection: "column" } : {}),
      }}>
        {children}
      </div>
    </div>
  );
}
