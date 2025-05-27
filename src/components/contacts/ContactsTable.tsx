"use client";

import { useState, useEffect } from "react";
import { Contact } from "@/types/contact";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Mail, Phone } from "lucide-react";
import EditContactDialog from "./EditContactDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";

interface ContactsTableProps {
  filters: {
    search: string;
    status: string | null;
    company: string | null;
    role: string | null;
  };
}

export default function ContactsTable({ filters }: ContactsTableProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      if (filters.company) params.append("company", filters.company);
      if (filters.role) params.append("role", filters.role);

      const response = await fetch(`/api/contacts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch contacts");

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [filters]);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleDelete = async (contact: Contact) => {
    try {
      const response = await fetch(`/api/contacts/${contact._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete contact");
      }

      toast.success("Contact deleted successfully");
      fetchContacts();
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(error.message || "Failed to delete contact");
    } finally {
      setDeletingContact(null);
    }
  };

  const handleEditSuccess = () => {
    setEditingContact(null);
    fetchContacts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading contacts...</div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No contacts found</div>
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
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact._id.toString()}>
                <TableCell className="font-medium">
                  {contact.firstName} {contact.lastName}
                </TableCell>
                <TableCell>
                  {contact.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No email</span>
                  )}
                </TableCell>
                <TableCell>
                  {contact.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No phone</span>
                  )}
                </TableCell>
                <TableCell>{contact.role || "-"}</TableCell>
                <TableCell>{contact.company || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      contact.status === "active" ? "default" : "secondary"
                    }
                  >
                    {contact.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingContact(contact)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open: boolean) => !open && setEditingContact(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingContact && (
        <DeleteConfirmationDialog
          isOpen={!!deletingContact}
          onClose={() => setDeletingContact(null)}
          onConfirm={() => handleDelete(deletingContact)}
          title="Delete Contact"
          description={`Are you sure you want to delete ${deletingContact.firstName} ${deletingContact.lastName}? This action cannot be undone.`}
        />
      )}
    </>
  );
}
