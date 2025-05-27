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

interface ContactSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  includeInactive?: boolean;
}

export default function ContactSelector({
  value,
  onValueChange,
  placeholder = "Select a contact",
  disabled = false,
  includeInactive = false,
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        let contactsData;

        if (includeInactive) {
          // Fetch all contacts if includeInactive is true
          const response = await fetch("/api/contacts");
          const data = await response.json();
          contactsData = data.contacts || [];
        } else {
          // Fetch only active contacts
          contactsData = await fetchActiveContacts();
        }

        setContacts(contactsData);
      } catch (error) {
        console.error("Error loading contacts:", error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [includeInactive]);

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
