"use client";

import React from "react";
import { Auction } from "@/models/auction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/number-utils";

interface AuctionsGridProps {
  auctions: Auction[];
}

export function AuctionsGrid({ auctions }: AuctionsGridProps) {
  if (!auctions.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No auctions found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {auctions.map((auction) => (
        <Card
          key={auction._id.toString()}
          className="hover:shadow-lg transition-shadow"
        >
          {auction.images[0] && (
            <div className="aspect-video relative overflow-hidden rounded-t-lg">
              <img
                src={auction.images[0]}
                alt={auction.title}
                className="object-cover w-full h-full"
              />
              <Badge
                className="absolute top-2 right-2"
                variant={
                  auction.status === "active"
                    ? "default"
                    : auction.status === "ended"
                    ? "secondary"
                    : "destructive"
                }
              >
                {auction.status}
              </Badge>
            </div>
          )}

          <CardHeader>
            <CardTitle className="text-lg">{auction.title}</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {auction.description}
              </p>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Current Bid</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(auction.currentPrice)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">Ends In</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(auction.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {auction.bids.length} bid{auction.bids.length !== 1 && "s"}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
