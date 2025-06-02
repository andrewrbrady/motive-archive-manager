import React from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectId } from "mongodb";

interface ProjectAvatarProps {
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

export function ProjectAvatar({
  primaryImageId,
  entityName,
  size = "md",
  className,
}: ProjectAvatarProps) {
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
    setImageUrl(null);

    // Clean up any in-progress fetch
    if (fetchController.current) {
      fetchController.current.abort();
    }

    // ✅ Enhanced validation - handle null, undefined, empty string, and invalid IDs
    if (
      !primaryImageId ||
      primaryImageId === "" ||
      primaryImageId === "null" ||
      primaryImageId === "undefined"
    ) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `ProjectAvatar: No valid primaryImageId provided for ${entityName}`,
          { primaryImageId }
        );
      }
      return;
    }

    const idString = primaryImageId.toString().trim();

    // ✅ Additional validation for ObjectId format
    if (idString.length < 12) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `ProjectAvatar: Invalid primaryImageId format for ${entityName}`,
          { primaryImageId: idString }
        );
      }
      return;
    }

    // Check cache first
    if (imageUrlCache.has(idString)) {
      const cachedUrl = imageUrlCache.get(idString);
      if (cachedUrl) {
        setImageUrl(cachedUrl);
        return;
      }
    }

    // Create new abort controller for this fetch
    fetchController.current = new AbortController();

    const fetchWithTimeout = async () => {
      try {
        // Set up timeout
        const timeoutId = setTimeout(() => {
          if (fetchController.current) {
            fetchController.current.abort();
          }
        }, 5000); // 5 second timeout

        const response = await fetch(`/api/images/${idString}`, {
          signal: fetchController.current?.signal,
          headers: {
            "Cache-Control": "max-age=300", // Cache for 5 minutes
          },
        });

        // Clear timeout if we got a response
        clearTimeout(timeoutId);

        if (!mountedRef.current) return;

        if (!response.ok) {
          // ✅ Enhanced error handling - don't throw for common HTTP errors
          if (response.status === 404) {
            // Image not found - this is common and not really an error
            if (process.env.NODE_ENV === "development") {
              console.log(
                `ProjectAvatar: Image not found (404) for ID: ${idString} (${entityName})`
              );
            }
          } else if (response.status === 401) {
            // Authentication issue - log but don't spam
            if (process.env.NODE_ENV === "development") {
              console.log(
                `ProjectAvatar: Authentication required for image ${idString} (${entityName})`
              );
            }
          } else {
            console.warn(
              `ProjectAvatar: Failed to fetch image (${response.status}): ${response.statusText} for ID: ${idString} (${entityName})`
            );
          }
          setImageError(true);
          return;
        }

        const data = await response.json();

        if (!mountedRef.current) return;

        if (!data || !data.url) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ProjectAvatar: No URL in image data for ID: ${idString} (${entityName})`
            );
          }
          setImageError(true);
          return;
        }

        // Fix Cloudflare URLs by adding appropriate variant/sizing
        let finalImageUrl = data.url;
        if (
          data.url &&
          data.url.includes("imagedelivery.net") &&
          !data.url.match(
            /\/(public|thumbnail|avatar|medium|large|webp|preview|original|w=\d+)$/
          )
        ) {
          // Use flexible variants for dynamic resizing (better than large /public images for avatars)
          finalImageUrl = `${data.url}/w=200,h=200,fit=cover`;
        }

        // Cache the result (use final formatted URL for cache) and update state
        imageUrlCache.set(idString, finalImageUrl);

        setImageUrl(finalImageUrl);
      } catch (error) {
        if (!mountedRef.current) return;

        if (error instanceof DOMException && error.name === "AbortError") {
          // Fetch was aborted, this is normal
          return;
        }

        // ✅ Enhanced error handling - use console.warn instead of console.error
        if (process.env.NODE_ENV === "development") {
          console.warn("ProjectAvatar: Error fetching image:", {
            error: error instanceof Error ? error.message : error,
            imageId: idString,
            entityName,
          });
        }
        setImageError(true);
      } finally {
        if (mountedRef.current) {
          fetchController.current = null;
        }
      }
    };

    fetchWithTimeout();
  }, [primaryImageId]);

  // ✅ Enhanced image error handler - more graceful error handling
  const handleImageError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      // Only log in development to avoid console spam
      if (process.env.NODE_ENV === "development") {
        console.warn("ProjectAvatar: Image failed to load", {
          src: event.currentTarget.src,
          entityName,
          primaryImageId,
        });
      }

      if (mountedRef.current) {
        setImageError(true);
        // Clear the problematic URL from cache
        if (primaryImageId) {
          const idString = primaryImageId.toString();
          imageUrlCache.delete(idString);
        }
      }
    },
    [entityName, primaryImageId]
  );

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
