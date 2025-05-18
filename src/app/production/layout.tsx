import React from "react";
import { Metadata } from "next";
// import Navbar from "@/components/layout/navbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
// import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";

export const metadata: Metadata = {
  title: "Production | Motive Archive",
  description: "Production management for Motive Archive",
};

export default function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-background">
        {/* <Navbar /> */}
        <main className="container relative mx-auto px-4 py-8">{children}</main>
        {/* <Footer /> */}
      </div>
    </AuthGuard>
  );
}
