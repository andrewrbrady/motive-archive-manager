import React from "react";
import { Metadata } from "next";
import ProductionClient from "./ProductionClient";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Production | Motive Archive",
  description: "Production management for Motive Archive",
};

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  return (
    <AuthGuard>
      <ProductionClient />
    </AuthGuard>
  );
}
