import Image from "next/image";
import type { ImageData } from "@/app/images/columns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageGridProps {
  images: ImageData[];
  isLoading?: boolean;
}

export function ImageGrid({ images, isLoading = false }: ImageGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="relative aspect-square">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!images.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No images found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {images.map((image) => (
        <div
          key={image._id}
          className="group relative aspect-square bg-muted rounded-lg overflow-hidden"
        >
          <Image
            src={image.url}
            alt={image.filename}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
            <div className="flex justify-between items-start">
              <div className="text-white">
                <h3 className="font-medium truncate">{image.filename}</h3>
                <p className="text-sm text-white/70">
                  {formatDate(image.updatedAt)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 text-white">
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
                  <DropdownMenuItem
                    onClick={() => window.open(image.url, "_blank")}
                  >
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
            </div>
            <div className="text-white/70 text-sm">
              {image.metadata.angle && (
                <span className="mr-2">Angle: {image.metadata.angle}</span>
              )}
              {image.metadata.view && (
                <span className="mr-2">View: {image.metadata.view}</span>
              )}
              {image.metadata.movement && (
                <span>Movement: {image.metadata.movement}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
