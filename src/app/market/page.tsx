import InventoryPage from "../inventory/page";
import AuctionsPage from "../auctions/page";
import YoutubePage from "../youtube/page";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function MarketPage(props: any) {
  // Get the tab from search params
  const tab = props.searchParams?.tab || "inventory";

  // Render the appropriate page based on the tab
  return (
    <AuthGuard>
      {tab === "auctions" ? (
        <AuctionsPage {...props} />
      ) : tab === "youtube" ? (
        <YoutubePage {...props} />
      ) : (
        <InventoryPage {...props} />
      )}
    </AuthGuard>
  );
}
