"use client";

import React from "react";
import MarketTabs from "@/components/market/MarketTabs";
import Navbar from "@/components/layout/navbar";

export default function AuctionsPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <MarketTabs />
        {children}
      </main>
    </div>
  );
}
