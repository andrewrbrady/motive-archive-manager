import React from "react";
import { Metadata } from "next";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Schedule | Motive Archive",
  description: "View and manage your schedule and deliverables",
};

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      {/* <Navbar /> */}
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
      {/* <Footer /> */}
    </AuthGuard>
  );
}
