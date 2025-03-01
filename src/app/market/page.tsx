import { redirect } from "next/navigation";

export default function MarketPage() {
  // Redirect to inventory page by default
  redirect("/inventory");
}
