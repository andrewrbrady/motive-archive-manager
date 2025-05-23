"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { Client } from "@/types/contact";
import EditClientDialog from "./EditClientDialog";
import DeleteConfirmDialog from "@/components/ui/DeleteConfirmDialog";
import { useToast } from "@/components/ui/use-toast";
import ClientsFilters from "./ClientsFilters";
import { LoadingContainer } from "@/components/ui/loading";

const BUSINESS_TYPES = [
  "Dealership",
  "Private Collector",
  "Auction House",
  "Service Center",
  "Other",
];

const formatBusinessType = (type: string | undefined) => {
  if (!type) return "";
  // Find the matching business type with correct capitalization
  const match = BUSINESS_TYPES.find(
    (t) => t.toLowerCase() === type.toLowerCase()
  );
  return match || type;
};

interface ClientsTableProps {
  filters: {
    search: string;
    status: string | null;
    businessType: string | null;
  };
}

export default function ClientsTable({ filters }: ClientsTableProps) {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, [page, filters]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      // [REMOVED] // [REMOVED] console.log("Fetching clients with filters:", filters);

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
      });

      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.businessType)
        params.append("businessType", filters.businessType);

      const response = await fetch(`/api/clients?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // [REMOVED] // [REMOVED] console.log("Received clients data:", data);

      setClients(data.clients || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;

    try {
      const response = await fetch(`/api/clients/${deletingClient._id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete client");

      toast({
        title: "Success",
        description: "Client deleted successfully",
      });

      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    } finally {
      setDeletingClient(null);
    }
  };

  if (loading) {
    return <LoadingContainer />;
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        No clients found. Add a new client to get started.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Business Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client._id.toString()}>
                <TableCell
                  className="font-medium cursor-pointer hover:underline"
                  onClick={() => router.push(`/clients/${client._id}`)}
                >
                  {client.name}
                </TableCell>
                <TableCell>{formatBusinessType(client.businessType)}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                  {client.address?.city}, {client.address?.state}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      client.status === "active"
                        ? "bg-success-50 text-success-700 ring-1 ring-inset ring-success-600/20"
                        : "bg-destructive-50 text-destructive-700 ring-1 ring-inset ring-destructive-600/20"
                    }`}
                  >
                    {client.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeletingClient(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onOpenChange={(open) => !open && setEditingClient(null)}
          onSuccess={() => {
            setEditingClient(null);
            fetchClients();
          }}
        />
      )}

      <DeleteConfirmDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone."
      />
    </>
  );
}
