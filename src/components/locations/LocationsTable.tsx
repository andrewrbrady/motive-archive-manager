"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { LocationResponse } from "@/models/location";

interface LocationsTableProps {
  locations: LocationResponse[];
  onEdit: (location: LocationResponse) => void;
  onDelete: (location: LocationResponse) => void;
}

export default function LocationsTable({
  locations,
  onEdit,
  onDelete,
}: LocationsTableProps) {
  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        No locations found. Add a location to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>City</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {locations.map((location) => (
          <TableRow key={location.id}>
            <TableCell className="font-medium">{location.name}</TableCell>
            <TableCell>{location.type}</TableCell>
            <TableCell>{location.address || "-"}</TableCell>
            <TableCell>{location.city || "-"}</TableCell>
            <TableCell>{location.state || "-"}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  location.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {location.isActive ? "Active" : "Inactive"}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(location)}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDelete(location)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
