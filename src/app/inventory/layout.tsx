import type { Metadata } from "next";
import InventoryPageWrapper from "@/components/inventory/InventoryPageWrapper";

export const metadata: Metadata = {
  title: "Inventory | Motive Archive",
  description: "Browse our vehicle inventory.",
};

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InventoryPageWrapper>{children}</InventoryPageWrapper>;
}
