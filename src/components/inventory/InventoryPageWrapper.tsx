"use client";

import React from "react";
import MarketTabs from "@/components/market/MarketTabs";
import Navbar from "@/components/layout/navbar";
import { usePathname } from "next/navigation";

export default function InventoryPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showTabs = pathname.includes("/market") || pathname === "/inventory";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {showTabs && <MarketTabs />}
        {children}
      </main>
    </div>
  );
}
