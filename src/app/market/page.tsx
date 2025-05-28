import { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { CustomTabs } from "@/components/ui/custom-tabs";
import InventoryPage from "../inventory/page";
import AuctionsPage from "../auctions/page";
import YoutubePage from "../youtube/page";
import { AuthGuard } from "@/components/auth/AuthGuard";

// Make this page dynamic to avoid useSearchParams issues during build
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Market | Motive Archive",
  description: "Browse inventory and auctions in the Motive Archive market",
};

export default function MarketPage(props: any) {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageTitle title="Market" />
        <Suspense fallback={<div>Loading market tabs...</div>}>
          <CustomTabs
            items={[
              {
                value: "inventory",
                label: "Inventory",
                content: <InventoryPage {...props} />,
              },
              {
                value: "auctions",
                label: "Auctions",
                content: <AuctionsPage {...props} />,
              },
              {
                value: "youtube",
                label: "YouTube",
                content: <YoutubePage {...props} />,
              },
            ]}
            defaultValue="inventory"
            basePath="/market"
          />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
