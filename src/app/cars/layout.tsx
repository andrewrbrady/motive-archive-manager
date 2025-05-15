import React from "react";
import { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-4 pt-20">{children}</main>
      </div>
    </AuthGuard>
  );
}
