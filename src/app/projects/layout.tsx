import React from "react";
import { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Projects | Motive Archive",
  description: "Project management for Motive Archive",
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-background">
        <main className="relative">{children}</main>
      </div>
    </AuthGuard>
  );
}
