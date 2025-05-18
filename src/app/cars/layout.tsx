import React from "react";
// import Navbar from "@/components/layout/navbar";
// import Footer from "@/components/layout/footer";
import { Metadata } from "next";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Cars | Motive Archive",
  description: "Browse and manage cars in the Motive Archive",
};

export default function CarsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">{children}</div>
      {/* <Footer /> */}
    </AuthGuard>
  );
}
