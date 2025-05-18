"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomTabs, TabItem } from "@/components/ui/custom-tabs";
import UserManagement from "@/components/users/UserManagement";
import LocationsClient from "../locations/LocationsClient";
import ClientsContent from "@/app/admin/ClientsContent";
import MakesContent from "@/app/admin/MakesContent";
import CreativeRolesManagement from "@/components/users/CreativeRolesManagement";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";

export default function AdminTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [isLoading, setIsLoading] = useState(true);

  // Set initial tab based on URL query parameter
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (
      tabParam &&
      ["users", "clients", "locations", "makes", "roles"].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }

    // Simulate loading completion
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams]);

  // Handle tab change - update both state and URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setIsLoading(true);

    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);

    // Use router.replace to update URL without adding to history
    router.replace(url.pathname + url.search, { scroll: false });

    // Simulate loading completion after tab change
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  // Render loading state or actual content based on isLoading state
  const renderTabContent = (tabValue: string, component: React.ReactNode) => {
    if (activeTab === tabValue && isLoading) {
      return <LoadingContainer fullHeight />;
    }
    return component;
  };

  return (
    <div>
      <CustomTabs
        items={[
          {
            value: "users",
            label: "Users",
            content: renderTabContent("users", <UserManagement />),
          },
          {
            value: "roles",
            label: "Creative Roles",
            content: renderTabContent("roles", <CreativeRolesManagement />),
          },
          {
            value: "clients",
            label: "Clients",
            content: renderTabContent("clients", <ClientsContent />),
          },
          {
            value: "locations",
            label: "Locations",
            content: renderTabContent("locations", <LocationsClient />),
          },
          {
            value: "makes",
            label: "Makes",
            content: renderTabContent("makes", <MakesContent />),
          },
        ]}
        defaultValue={activeTab}
        basePath="/admin"
        className="w-full"
      />
    </div>
  );
}
