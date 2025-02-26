"use client";

import React from "react";
import { HardDriveIcon, PencilIcon, Trash2Icon, MapPin } from "lucide-react";
import { HardDriveData } from "@/models/hard-drive";
import { Button } from "@/components/ui/button";
import { ObjectId } from "mongodb";

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
  return (
    <div
      className="p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDriveIcon className="w-4 h-4" />
          <h3 className="font-medium">{drive.label}</h3>
          {drive.systemName && (
            <span className="text-muted-foreground text-sm">
              ({drive.systemName})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2Icon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Type:</span>
          <span>{drive.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Interface:</span>
          <span>{drive.interface}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Capacity:</span>
          <span>{drive.capacity.total}GB</span>
        </div>
        {drive.capacity.used !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Used:</span>
              <span>
                {Math.round((drive.capacity.used / drive.capacity.total) * 100)}
                %
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (drive.capacity.used / drive.capacity.total) * 100 > 90
                    ? "bg-destructive"
                    : (drive.capacity.used / drive.capacity.total) * 100 > 75
                    ? "bg-warning"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(
                    (drive.capacity.used / drive.capacity.total) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
        {drive.locationDetails && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location:</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {drive.locationDetails.name}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-xs ${
              drive.status === "Available"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : drive.status === "In Use"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400"
            }`}
          >
            {drive.status}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Raw Assets:</span>
          <span>{drive.rawAssetDetails?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}
