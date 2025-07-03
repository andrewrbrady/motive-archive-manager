"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { formatDate } from "@/lib/date-utils";

export type ImageData = {
  _id: string;
  cloudflareId: string;
  url: string;
  filename: string;
  width: number;
  height: number;
  metadata: {
    // Car-specific fields
    angle?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
    description?: string;
    category?: string;

    // General image analysis fields
    content_type?: string;
    primary_subject?: string;
    dominant_colors?: string;
    style?: string;
    usage_context?: string;
    has_text?: boolean;
    has_brand_elements?: boolean;

    // Vehicle info for car detection
    vehicleInfo?: {
      make?: string;
      model?: string;
      year?: number;
      [key: string]: any;
    };

    // Allow any additional fields
    [key: string]: any;
  };
  carId?: string;
  createdAt: string;
  updatedAt: string;
};

export const columns: ColumnDef<ImageData>[] = [
  {
    accessorKey: "url",
    header: "Preview",
    cell: ({ row }) => {
      const url = row.getValue("url") as string;
      return (
        <div className="relative w-20 h-20">
          <Image
            src={url}
            alt={row.original.filename}
            fill
            className="object-cover rounded-md"
          />
        </div>
      );
    },
  },
  {
    accessorKey: "filename",
    header: "Filename",
  },
  {
    accessorKey: "metadata.angle",
    header: "Angle",
  },
  {
    accessorKey: "metadata.movement",
    header: "Movement",
  },
  {
    accessorKey: "metadata.tod",
    header: "Time of Day",
  },
  {
    accessorKey: "metadata.view",
    header: "View",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Updated",
    cell: ({ row }) => {
      const date = row.getValue("updatedAt") as string;
      return <span>{formatDate(date)}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const image = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(image.url)}
            >
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(image.url, "_blank")}>
              View Full Size
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Metadata
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
