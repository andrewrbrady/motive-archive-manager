"use client";

import React from "react";
import { VehicleCard } from "@/components/ui/VehicleCard";

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

  return <VehicleCard vehicle={auction} variant="auction" showExternalLink />;
}
