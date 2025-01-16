"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { getTimeRemaining } from "@/lib/utils";

interface AuctionCardProps {
  auction: {
    _id: string;
    post_id: string;
    title: string;
    make: string;
    model: string;
    year: number;
    images: string[];
    link: string;
    excerpt: string;
    current_bid?: number;
    bid_count?: number;
    date: string;
    end_date: string;
    location?: string;
    platformId: string;
    platform?: {
      name: string;
    };
  };
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  if (!auction) return null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <Link href={auction.link} target="_blank">
        <div className="relative aspect-[16/9]">
          {auction.images && auction.images.length > 0 ? (
            <img
              src={auction.images[0]}
              alt={`${auction.year} ${auction.make} ${auction.model}`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              No Image Available
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link
          href={auction.link}
          target="_blank"
          className="text-lg font-semibold hover:text-blue-600"
        >
          {auction.title || `${auction.year} ${auction.make} ${auction.model}`}
        </Link>
        <p className="text-sm text-gray-600 mt-1">{auction.excerpt}</p>
        <div className="mt-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600">Current Bid</div>
            <div className="font-semibold">
              ${auction.current_bid?.toLocaleString() || "No Bids"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Time Left</div>
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {getTimeRemaining(auction.end_date)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {auction.location || "N/A"}
          </div>
          <div>{auction.platform?.name || "Unknown Platform"}</div>
        </div>
      </div>
    </div>
  );
}
