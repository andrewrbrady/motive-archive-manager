import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package, Calendar, User } from "lucide-react";
import Image from "next/image";
import { Kit } from "@/types/inventory";
import { formatDate } from "@/lib/utils";

interface KitsListProps {
  kits: Kit[];
  onEdit?: (kit: Kit) => void;
  onDelete?: (kit: Kit) => void;
  onView?: (kit: Kit) => void;
  onCheckout?: (kit: Kit) => void;
  onCheckin?: (kit: Kit) => void;
  selectionMode?: boolean;
  selectedKits?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

export default function KitsList({
  kits,
  onEdit,
  onDelete,
  onView,
  onCheckout,
  onCheckin,
  selectionMode = false,
  selectedKits = [],
  onSelectionChange,
}: KitsListProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleCheckboxChange = (kitId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedKits, kitId]);
    } else {
      onSelectionChange(selectedKits.filter((id) => id !== kitId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange(kits.map((kit) => kit.id));
    } else {
      onSelectionChange([]);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;

    let badgeClass = "";

    switch (status.toLowerCase()) {
      case "available":
        badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
        break;
      case "checked-out":
        badgeClass = "bg-orange-100 text-orange-800 hover:bg-orange-200";
        break;
      case "in-use":
        badgeClass = "bg-blue-100 text-blue-800 hover:bg-blue-200";
        break;
      case "maintenance":
        badgeClass = "bg-red-100 text-red-800 hover:bg-red-200";
        break;
      default:
        badgeClass = "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }

    return (
      <Badge className={badgeClass} variant="outline">
        {status}
      </Badge>
    );
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {selectionMode && (
                <TableHead className="w-[40px] sticky left-0 bg-muted/50 z-10">
                  <Checkbox
                    checked={
                      selectedKits.length > 0 &&
                      selectedKits.length === kits.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all kits"
                  />
                </TableHead>
              )}
              <TableHead className="sticky left-0 bg-muted/50 z-10">
                Name
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Checked Out To</TableHead>
              <TableHead>Checkout Date</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right sticky right-0 bg-muted/50 z-10">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={selectionMode ? 11 : 10}
                  className="h-24 text-center"
                >
                  No kits found.
                </TableCell>
              </TableRow>
            ) : (
              kits.map((kit) => (
                <TableRow
                  key={kit.id}
                  className="py-1 h-16"
                  onMouseEnter={() => setHoveredRow(kit.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onView && onView(kit)}
                  style={{ cursor: onView ? "pointer" : "default" }}
                >
                  {selectionMode && (
                    <TableCell
                      className="sticky left-0 bg-white z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedKits.includes(kit.id)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(kit.id, checked === true)
                        }
                        aria-label={`Select kit ${kit.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{kit.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {kit.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {kit.items?.length || 0} items
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(kit.status)}</TableCell>
                  <TableCell>
                    {kit.checkedOutTo ? (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{kit.checkedOutTo}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {kit.checkoutDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{formatDate(kit.checkoutDate)}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {kit.expectedReturnDate
                      ? formatDate(kit.expectedReturnDate)
                      : "-"}
                  </TableCell>
                  <TableCell>{kit.createdBy || "-"}</TableCell>
                  <TableCell>
                    {kit.createdAt ? formatDate(kit.createdAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-white z-10">
                    <div className="flex justify-end gap-2">
                      {kit.status === "checked-out" && onCheckin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCheckin(kit);
                          }}
                        >
                          Check In
                        </Button>
                      )}
                      {kit.status !== "checked-out" && onCheckout && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCheckout(kit);
                          }}
                        >
                          Check Out
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(kit);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(kit);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
