"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ViewModeSelector } from "@/components/ui/ViewModeSelector";
import PageSizeSelector from "@/components/PageSizeSelector";
import SortSelector from "@/components/ui/SortSelector";

export default function CarsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ViewModeSelector currentView="grid" />
            <PageSizeSelector currentPageSize={96} options={[12,24,48,96]} />
            <SortSelector currentSort="createdAt_desc" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search cars..." className="pl-9" />
            </div>
          </div>
          <Link href="/cars/new">
            <Button
              variant="ghost"
              className="h-9 px-3 bg-transparent border border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))] hover:border-white hover:bg-transparent transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Car
            </Button>
          </Link>
        </div>

        {/* ✅ Simple loading spinner */}
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading cars...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
