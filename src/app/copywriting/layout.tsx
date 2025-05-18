import React from "react";
import { Metadata } from "next";
// import Navbar from "@/components/layout/navbar";
import { AuthGuard } from "@/components/auth/AuthGuard";
// import Footer from "@/components/layout/footer";
import { PageTitle } from "@/components/ui/PageTitle";

export const metadata: Metadata = {
  title: "Copywriting | Motive Archive",
  description: "Content creation and copywriting tools",
};

export default function CopywritingLayout({
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
