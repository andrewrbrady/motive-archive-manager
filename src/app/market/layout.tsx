import type { Metadata } from "next";
import Navbar from "@/components/layout/navbar";
import MarketTabs from "@/components/market/MarketTabs";

export const metadata: Metadata = {
  title: "Market | Motive Archive",
  description: "Browse inventory and auctions in the Motive Archive market.",
};

export default function MarketLayout({
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
