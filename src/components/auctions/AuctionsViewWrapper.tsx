"use client";

import AuctionCard from "./AuctionCard";
import { AuctionsList } from "./AuctionsList";
import { Auction } from "@/types/auction";

interface AuctionsViewWrapperProps {
  auctions: Auction[];
  view: "grid" | "list";
}

export function AuctionsViewWrapper({
  auctions,
  view,
}: AuctionsViewWrapperProps) {
  // [REMOVED] // [REMOVED] console.log("AuctionsViewWrapper - Received auctions:", auctions);

  if (!auctions || auctions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-[hsl(var(--foreground-muted))]">No auctions found</p>
      </div>
    );
  }

  if (view === "list") {
    return <AuctionsList auctions={auctions} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => (
        <AuctionCard key={auction._id} auction={auction} />
      ))}
    </div>
  );
}
