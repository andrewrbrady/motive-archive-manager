"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { PageTitle } from "@/components/ui/PageTitle";

export default function MarketTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "inventory";

  // Determine the active tab based on the current path or search param
  const activeTab = pathname.includes("/market")
    ? tab || "inventory"
    : pathname.includes("/inventory")
    ? "inventory"
    : pathname.includes("/auctions")
    ? "auctions"
    : "inventory";

  return (
    <div className="space-y-6">
      <PageTitle title="Market" />

      <CustomTabs
        items={[
          {
            value: "inventory",
            label: "Inventory",
            content: null, // Content is rendered by the page, not by the tabs
          },
          {
            value: "auctions",
            label: "Auctions",
            content: null, // Content is rendered by the page, not by the tabs
          },
        ]}
        defaultValue={activeTab}
        basePath="/market"
        className="w-full"
      />
    </div>
  );
}
