"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTitle } from "@/components/ui/PageTitle";

export default function MarketTabs() {
  const router = useRouter();
  const pathname = usePathname();

  // Determine the active tab based on the current path
  const activeTab = pathname.includes("/inventory")
    ? "inventory"
    : pathname.includes("/auctions")
    ? "auctions"
    : "inventory";

  // Handle tab change
  const handleTabChange = (value: string) => {
    router.push(`/${value}`);
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Market" />

      <Tabs
        defaultValue={activeTab}
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-6 w-full bg-background-secondary/50 dark:bg-background-secondary/25 p-1 gap-1">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
