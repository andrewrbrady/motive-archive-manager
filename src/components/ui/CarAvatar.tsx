import React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectId } from "mongodb";
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

// Cache for image URLs to avoid repeated fetches
const imageUrlCache = new Map<string, string>();

export function CarAvatar({
  primaryImageId,
  entityName,
  size = "md",
  className,
}: CarAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const fetchController = React.useRef<AbortController | null>(null);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fetchController.current) {
        fetchController.current.abort();
      }
    };
  }, []);

  React.useEffect(() => {
    // Reset state when ID changes
    setImageError(false);

    // Clean up any in-progress fetch
    if (fetchController.current) {
      fetchController.current.abort();
    }

    // No ID, nothing to do
    if (!primaryImageId) return;

    const idString = primaryImageId.toString();

    // Check cache first
    if (imageUrlCache.has(idString)) {
      setImageUrl(imageUrlCache.get(idString) || null);
      return;
    }

    // Create new abort controller for this fetch
    fetchController.current = new AbortController();

    const fetchWithTimeout = async () => {
      try {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (fetchController.current) {
            // [REMOVED] // [REMOVED] console.log("CarAvatar: Fetch timeout, aborting");
            fetchController.current.abort();
          }
        }, 5000); // 5 second timeout

        const response = await fetch(`/api/images/${idString}`, {
          signal: fetchController.current?.signal,
        });

        // Clear timeout if we got a response
        clearTimeout(timeoutId);

        if (!mountedRef.current) return;

        if (!response.ok) {
          throw new Error(
            `Failed to fetch image (${response.status}): ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!mountedRef.current) return;

        if (!data || !data.url) {
          throw new Error("No URL in image data");
        }

        // Cache the result and update state
        imageUrlCache.set(idString, data.url);
        setImageUrl(data.url);
      } catch (error) {
        if (!mountedRef.current) return;

        if (error instanceof DOMException && error.name === "AbortError") {
          // [REMOVED] // [REMOVED] console.log("CarAvatar: Fetch aborted");
        } else {
          console.error("CarAvatar: Error fetching image:", error);
          setImageError(true);
        }
      } finally {
        if (mountedRef.current) {
          fetchController.current = null;
        }
      }
    };

    fetchWithTimeout();
  }, [primaryImageId]);

  const handleImageError = React.useCallback(() => {
    console.error("CarAvatar: Image failed to load");
    if (mountedRef.current) {
      setImageError(true);
    }
  }, []);

  return (
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
          loading="eager"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-1/3 h-1/3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
