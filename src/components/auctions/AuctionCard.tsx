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
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md dark:shadow-gray-800 overflow-hidden border border-gray-200 dark:border-gray-800">
      <Link href={auction.link} target="_blank">
        <div className="relative aspect-[16/9]">
          {auction.images && auction.images.length > 0 ? (
            <img
              src={auction.images[0]}
              alt={`${auction.year} ${auction.make} ${auction.model}`}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No Image Available
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <Link
          href={auction.link}
          target="_blank"
          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {auction.title || `${auction.year} ${auction.make} ${auction.model}`}
        </Link>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {auction.excerpt}
        </p>
        <div className="mt-4 flex justify-between items-center">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current Bid
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              ${auction.current_bid?.toLocaleString() || "No Bids"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Time Left
            </div>
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
              {getTimeRemaining(auction.end_date)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
            {auction.location || "N/A"}
          </div>
          <div>{auction.platform?.name || "Unknown Platform"}</div>
        </div>
      </div>
    </div>
  );
}
