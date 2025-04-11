import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Motive Archive",
  description: "View your profile and manage your deliverables",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
