"use client";

import { useState } from "react";
import Navbar from "@/components/layout/navbar";
import { PageTitle } from "@/components/ui/PageTitle";
import ClientsTable from "@/components/clients/ClientsTable";
import ClientsFilters from "@/components/clients/ClientsFilters";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ClientsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: null,
    businessType: null,
  });

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <PageTitle title="Clients" />
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </div>

          <ClientsFilters
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
          <ClientsTable filters={filters} />

          <CreateClientDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          />
        </div>
      </main>
    </div>
  );
}
