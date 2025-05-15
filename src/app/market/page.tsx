import { Metadata } from "next";
import { PageTitle } from "@/components/ui/PageTitle";
import { CustomTabs } from "@/components/ui/custom-tabs";
import InventoryPage from "../inventory/page";
import AuctionsPage from "../auctions/page";
import YoutubePage from "../youtube/page";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Market | Motive Archive",
  description: "Browse inventory and auctions in the Motive Archive market",
};

export default function MarketPage(props: any) {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageTitle title="Market" />
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
      </div>
    </AuthGuard>
  );
}
