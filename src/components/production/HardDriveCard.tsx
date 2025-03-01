"use client";

import React from "react";
import { HardDriveIcon, PencilIcon, Trash2Icon, MapPin } from "lucide-react";
import { HardDriveData } from "@/models/hard-drive";
import { Button } from "@/components/ui/button";
import { ObjectId } from "mongodb";
import { cn } from "@/lib/utils";

interface HardDriveCardProps {
  drive: HardDriveData & {
    _id?: ObjectId;
    rawAssetDetails?: { _id: string; date: string; description: string }[];
    locationDetails?: { _id: string; name: string; type: string };
  };
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export default function HardDriveCard({
  drive,
  onEdit,
  onDelete,
  onClick,
}: HardDriveCardProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]";
      case "In Use":
        return "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]";
      case "Archived":
        return "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]";
      case "Offline":
        return "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]";
      default:
        return "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]";
    }
  };

  const formatCapacity = (
    total: number,
    used?: number
  ): { text: string; percent?: number } => {
    if (used !== undefined) {
      const usedGB = Math.round(used);
      const totalGB = Math.round(total);
      const percent = Math.round((usedGB / totalGB) * 100);
      return {
        text: `${usedGB}GB / ${totalGB}GB (${percent}%)`,
        percent,
      };
    }
    return { text: `${Math.round(total)}GB` };
  };

  const capacityInfo = formatCapacity(
    drive.capacity.total,
    drive.capacity.used
  );

  return (
    <div
      className="border border-[hsl(var(--border))] rounded-lg p-4 hover:bg-[hsl(var(--accent))] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <HardDriveIcon className="w-5 h-5 text-[hsl(var(--foreground))]" />
          <div>
            <h3 className="font-medium text-base">{drive.label}</h3>
            {drive.systemName && (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {drive.systemName}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
            aria-label="Edit drive"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors"
            aria-label="Delete drive"
          >
            <Trash2Icon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
            Type
          </p>
          <p className="text-sm">{drive.type}</p>
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
            Interface
          </p>
          <p className="text-sm">{drive.interface}</p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
          Capacity
        </p>
        <div className="space-y-1">
          <p className="text-sm">{capacityInfo.text}</p>
          {capacityInfo.percent !== undefined && (
            <div className="w-full bg-[hsl(var(--secondary))] rounded-full h-1">
              <div
                className="bg-[hsl(var(--primary))] h-1 rounded-full"
                style={{ width: `${Math.min(capacityInfo.percent, 100)}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
            Status
          </p>
          <span
            className={cn(
              "inline-block px-2 py-1 text-xs rounded-md",
              getStatusClass(drive.status)
            )}
          >
            {drive.status}
          </span>
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
            Assets
          </p>
          <p className="text-sm">{drive.rawAssetDetails?.length || 0} assets</p>
        </div>
      </div>

      {drive.locationDetails && (
        <div className="mt-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
            Location
          </p>
          <p className="text-sm flex items-center">
            <MapPin className="w-3 h-3 mr-1" />
            {drive.locationDetails.name}
          </p>
        </div>
      )}
    </div>
  );
}
