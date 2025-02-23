"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Auction } from "@/lib/fetchAuctions";

interface AuctionsListProps {
  auctions: Auction[];
}

export function AuctionsList({ auctions }: AuctionsListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-[hsl(var(--foreground))] uppercase bg-[hsl(var(--background))]">
          <tr>
            <th className="px-6 py-3">Vehicle</th>
            <th className="px-6 py-3">Current Bid</th>
            <th className="px-6 py-3">Time Left</th>
            <th className="px-6 py-3">Location</th>
            <th className="px-6 py-3">Platform</th>
            <th className="px-6 py-3">Bids</th>
          </tr>
        </thead>
        <tbody>
          {auctions.map((auction) => (
            <tr
              key={auction._id}
              className="bg-[var(--background-primary)] border-b hover:bg-[hsl(var(--background))]"
            >
              <td className="px-6 py-4 font-medium">
                <Link
                  href={auction.link}
                  target="_blank"
                  className="hover:text-info-600"
                >
                  {auction.year} {auction.make} {auction.model}
                  {auction.trim && ` ${auction.trim}`}
                </Link>
              </td>
              <td className="px-6 py-4">
                ${auction.current_bid?.toLocaleString() || "No Bids"}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{getTimeRemaining(auction.end_date)}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{auction.location || "N/A"}</span>
                </div>
              </td>
              <td className="px-6 py-4">{auction.platform.name}</td>
              <td className="px-6 py-4">{auction.bid_count || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getTimeRemaining(endDate: string | null): string {
  if (!endDate) return "No end date";

  const end = new Date(endDate);
  const now = new Date();

  if (isNaN(end.getTime())) {
    return "Invalid date";
  }

  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
