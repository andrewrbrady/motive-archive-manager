"use client";

import { useState } from "react";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactsFilters from "@/components/contacts/ContactsFilters";
import CreateContactDialog from "@/components/contacts/CreateContactDialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { FilterContainer } from "@/components/ui/FilterContainer";

export default function ContactsContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: null,
    company: null,
    role: null,
  });
  const [key, setKey] = useState(0);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleCreateSuccess = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <FilterContainer>
        <div className="flex-1">
          <ContactsFilters
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
          Add Contact
        </Button>
      </FilterContainer>

      <ContactsTable key={key} filters={filters} />

      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
