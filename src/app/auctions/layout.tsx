import type { Metadata } from "next";
import AuctionsPageWrapper from "@/components/auctions/AuctionsPageWrapper";

export const metadata: Metadata = {
  title: "Auctions | Motive Archive",
  description: "Browse available auctions.",
};

export default function AuctionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuctionsPageWrapper>{children}</AuctionsPageWrapper>;
}
