"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/users/UserManagement";
import LocationsClient from "../locations/LocationsClient";
import ClientsContent from "@/app/admin/ClientsContent";
import MakesContent from "@/app/admin/MakesContent";
import { Loader2 } from "lucide-react";
import { LoadingContainer } from "@/components/ui/loading";

export default function AdminTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [isLoading, setIsLoading] = useState(true);

  // Set initial tab based on URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["users", "clients", "locations", "makes"].includes(tabParam)
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
      return (
        <LoadingContainer
          text={`Loading ${tabValue}...`}
          size={24}
          fullHeight
        />
      );
    }
    return component;
  };

  return (
    <div>
      <Tabs
        defaultValue="users"
        className="w-full"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="mb-4 w-full bg-background-secondary/50 dark:bg-background-secondary/25 p-1 gap-1">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="makes">Makes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {renderTabContent("users", <UserManagement />)}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          {renderTabContent("clients", <ClientsContent />)}
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          {renderTabContent("locations", <LocationsClient hideNavbar={true} />)}
        </TabsContent>

        <TabsContent value="makes" className="space-y-4">
          {renderTabContent("makes", <MakesContent />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
