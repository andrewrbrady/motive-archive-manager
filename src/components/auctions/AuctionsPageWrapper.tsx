"use client";

import React from "react";
import MarketTabs from "@/components/market/MarketTabs";
import { PageTitle } from "@/components/ui/PageTitle";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";

export default function AuctionsPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showTabs = pathname?.includes("/market") || pathname === "/auctions";

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {showTabs && <MarketTabs />}
        {children}
      </main>
    </div>
  );
}
