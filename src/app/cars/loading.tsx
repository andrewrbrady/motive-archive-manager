"use client";

import React from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function CarsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* ✅ Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <PageTitle title="Cars Collection" />
          <Link href="/cars/new">
            <Button>
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
