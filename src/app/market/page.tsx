import InventoryPage from "../inventory/page";
import AuctionsPage from "../auctions/page";

export default function MarketPage(props: any) {
  // Get the tab from search params
  const tab = props.searchParams?.tab || "inventory";

  // Render the appropriate page based on the tab
  if (tab === "auctions") {
    return <AuctionsPage {...props} />;
  }

  // Default to inventory
  return <InventoryPage {...props} />;
}
