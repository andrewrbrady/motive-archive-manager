"use client";

import { useState } from "react";
import { Kit, FormattedKitItem } from "@/types/inventory";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Edit,
  Trash2,
  Package,
  Calendar,
  User,
  LogIn,
  LogOut,
  Info,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// Extend the Kit type for our local needs
interface KitWithDetails extends Kit {
  itemDetails?: FormattedKitItem[];
}

interface KitsGridProps {
  kits: KitWithDetails[];
  onEdit?: (kit: KitWithDetails) => void;
  onDelete?: (kit: KitWithDetails) => void;
  onView?: (kit: KitWithDetails) => void;
  onCheckout?: (kit: KitWithDetails) => void;
  onCheckin?: (kit: KitWithDetails) => void;
  selectionMode?: boolean;
  selectedKits?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  isEditMode?: boolean;
}

export default function KitsGrid({
  kits,
  onEdit,
  onDelete,
  onView,
  onCheckout,
  onCheckin,
  selectionMode = false,
  selectedKits = [],
  onSelectionChange,
  isEditMode = false,
}: KitsGridProps) {
  const handleCheckboxChange = (kitId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedKits, kitId]);
    } else {
      onSelectionChange(selectedKits.filter((id) => id !== kitId));
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {kits.map((kit) => (
        <Card
          key={kit.id}
          className={`relative overflow-hidden hover:border-primary/50 transition-colors ${
            selectedKits.includes(kit.id) && selectionMode
              ? "border-primary bg-primary/10"
              : ""
          }`}
          onClick={() => {
            if (selectionMode && onSelectionChange) {
              const isSelected = selectedKits.includes(kit.id);
              handleCheckboxChange(kit.id, !isSelected);
            } else if (onView) {
              onView(kit);
            }
          }}
        >
          {selectionMode && (
            <div
              className="absolute top-3 left-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selectedKits.includes(kit.id)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(kit.id, checked === true)
                }
                aria-label={`Select kit ${kit.name}`}
                className="h-5 w-5"
              />
            </div>
          )}

          <div className="p-4 flex flex-col h-full">
            {/* Kit Header */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-tight">
                    {kit.name}
                  </h3>
                  <div className="mt-1">{getStatusBadge(kit.status)}</div>
                </div>
              </div>
            </div>

            {/* Kit Details */}
            <CardContent className="p-0 pt-2 pb-3 text-sm flex-grow">
              {kit.description && (
                <p className="text-muted-foreground line-clamp-3 mb-2">
                  {kit.description}
                </p>
              )}

              <div className="space-y-1.5 mt-3">
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-normal text-xs">
                    {kit.itemDetails?.length || kit.items?.length || 0} items
                  </Badge>
                </div>

                {kit.checkedOutTo && (
                  <div className="flex items-center gap-1 text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Checked out to:
                    </span>
                    <span className="font-medium">{kit.checkedOutTo}</span>
                  </div>
                )}

                {kit.checkoutDate && (
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Checkout date:
                    </span>
                    <span>{formatDate(kit.checkoutDate)}</span>
                  </div>
                )}

                {kit.expectedReturnDate && (
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Expected return:
                    </span>
                    <span>{formatDate(kit.expectedReturnDate)}</span>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Actions */}
            {!selectionMode && (
              <CardFooter className="p-0 pt-3 border-t flex justify-between">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onView) onView(kit);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  {isEditMode && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEdit) onEdit(kit);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDelete) onDelete(kit);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {kit.status === "checked-out" && onCheckin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckin(kit);
                      }}
                    >
                      <LogIn className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                  )}
                  {kit.status !== "checked-out" && onCheckout && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckout(kit);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Check Out
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
