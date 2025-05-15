import React from "react";
import { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Footer from "@/components/layout/footer";

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
      <div className="relative min-h-screen bg-background">
        <Navbar />
        <main className="container relative mx-auto px-4 pt-20 pb-16">
          {children}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
