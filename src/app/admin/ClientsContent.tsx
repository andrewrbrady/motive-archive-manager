"use client";

import { useState } from "react";
import ClientsTable from "@/components/clients/ClientsTable";
import ClientsFilters from "@/components/clients/ClientsFilters";
import CreateClientDialog from "@/components/clients/CreateClientDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { FilterContainer } from "@/components/ui/FilterContainer";

export default function ClientsContent() {
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
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1">
          <ClientsFilters
            initialFilters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          variant="outline"
          className="border-[hsl(var(--border-subtle))] text-[hsl(var(--foreground))]"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </FilterContainer>

      <ClientsTable filters={filters} />

      <CreateClientDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
