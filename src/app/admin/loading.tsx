"use client";

import Navbar from "@/components/layout/navbar";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <h1 className="text-3xl font-bold container mx-auto px-4 pt-8 pb-4">
          Admin Dashboard
        </h1>
        {/* Minimal loading - no spinner to avoid navigation lag */}
        <div className="flex-1 container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
