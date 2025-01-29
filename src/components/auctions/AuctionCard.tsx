"use client";

import React from "react";
import { VehicleCard } from "@/components/ui/VehicleCard";
import { Auction } from "@/types/auction";

interface AuctionCardProps {
  auction: Auction;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  if (!auction) return null;

  return <VehicleCard vehicle={auction} variant="auction" showExternalLink />;
}
