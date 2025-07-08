"use client";

import { useState, useEffect } from "react";
import { Contact } from "@/types/contact";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchActiveContacts } from "@/lib/fetchContacts";
import { useAPI } from "@/hooks/useAPI";
import { toast } from "react-hot-toast";

interface ContactSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  includeInactive?: boolean;
}

interface ContactsResponse {
  contacts: ContactWithStringId[];
}

// Contact type with string _id to match API response and fetchActiveContacts return type
interface ContactWithStringId {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  status: "active" | "inactive";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ContactSelector({
  value,
  onValueChange,
  placeholder = "Select a contact",
  disabled = false,
  includeInactive = false,
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<ContactWithStringId[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useAPI();

  useEffect(() => {
    if (!api) return; // Guard inside hook

    const loadContacts = async () => {
      try {
        setLoading(true);
        let contactsData: ContactWithStringId[];

        if (includeInactive) {
          // Fetch all contacts if includeInactive is true
          const data = await api.get<ContactsResponse>("contacts");
          contactsData = data.contacts || [];
        } else {
          // Fetch only active contacts - fetchActiveContacts returns ContactWithStringId[]
          contactsData = await fetchActiveContacts();
        }

        setContacts(contactsData);
      } catch (error: any) {
        console.error("Error loading contacts:", error);
        toast.error("Failed to load contacts");
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [includeInactive, api]);

  // Authentication check - show loading if not authenticated
  if (!api) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading contacts..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {contacts.length === 0 ? (
          <SelectItem value="" disabled>
            No contacts available
          </SelectItem>
        ) : (
          contacts.map((contact) => (
            <SelectItem
              key={contact._id.toString()}
              value={contact._id.toString()}
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {contact.firstName} {contact.lastName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {contact.role || "No role specified"}
                  {contact.company && ` • ${contact.company}`}
                </span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
