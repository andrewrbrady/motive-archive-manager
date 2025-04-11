import React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectId } from "mongodb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CarImage } from "@/types/car";

interface CarAvatarProps {
  images?: CarImage[];
  primaryImageId?: string | ObjectId;
  alt: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function CarAvatar({
  images,
  primaryImageId,
  alt,
  size = "md",
  showTooltip = false,
  tooltipContent,
  className,
}: CarAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchImageUrl = async () => {
      if (!primaryImageId) return;

      try {
        const response = await fetch(
          `/api/images/${primaryImageId.toString()}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch image URL");
        }
        const imageData = await response.json();
        if (!imageData.url) {
          throw new Error("No URL in image data");
        }
        setImageUrl(imageData.url);
        setImageError(false);
      } catch (error) {
        console.error("Error fetching image:", error);
        setImageError(true);
      }
    };

    setImageError(false);
    fetchImageUrl();
  }, [primaryImageId]);

  const avatar = (
    <div
      className={cn(
        "relative rounded-full overflow-hidden border border-border shrink-0 bg-muted",
        sizeClasses[size],
        className
      )}
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-1/3 h-1/3 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{avatar}</TooltipTrigger>
          <TooltipContent>{tooltipContent || <p>{alt}</p>}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatar;
}
