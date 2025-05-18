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
  primaryImageId?: string | ObjectId;
  entityName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function CarAvatar({
  primaryImageId,
  entityName,
  size = "md",
  className,
}: CarAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const isMounted = React.useRef(true);
  const hasErrored = React.useRef(false);
  const isLoading = React.useRef(false);

  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!primaryImageId || isLoading.current || hasErrored.current) return;

    const fetchImageUrl = async () => {
      if (!isMounted.current) return;

      isLoading.current = true;
      try {
        const response = await fetch(
          `/api/images/${primaryImageId.toString()}`
        );
        if (!isMounted.current) return;

        if (!response.ok) {
          throw new Error("Failed to fetch image URL");
        }
        const imageData = await response.json();
        if (!imageData.url) {
          throw new Error("No URL in image data");
        }
        if (isMounted.current) {
          setImageUrl(imageData.url);
          setImageError(false);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
        if (isMounted.current && !hasErrored.current) {
          hasErrored.current = true;
          setImageError(true);
        }
      } finally {
        isLoading.current = false;
      }
    };

    fetchImageUrl();
  }, [primaryImageId]);

  const handleImageError = React.useCallback(() => {
    if (!hasErrored.current && isMounted.current) {
      hasErrored.current = true;
      setImageError(true);
    }
  }, []);

  const resolvedTooltipContent = primaryImageId
    ? `Primary image for ${entityName}`
    : `No primary image selected for ${entityName}`;

  const avatar = React.useMemo(
    () => (
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
            alt={`Avatar for ${entityName}`}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-1/3 h-1/3 text-muted-foreground" />
          </div>
        )}
      </div>
    ),
    [imageUrl, imageError, size, className, entityName, handleImageError]
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>{resolvedTooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
