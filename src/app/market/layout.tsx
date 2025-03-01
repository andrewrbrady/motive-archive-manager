import type { Metadata } from "next";

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
    <main className="min-h-screen bg-[hsl(var(--background-primary))]">
      {children}
    </main>
  );
}
