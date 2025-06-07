"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, alt, onError, ...props }, ref) => {
  const handleError = React.useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      // Enhanced debugging for avatar loading issues
      if (process.env.NODE_ENV === "development" && src) {
        console.warn("🔴 Avatar image failed to load:", {
          src,
          alt,
          error: event.type,
          timestamp: new Date().toISOString(),
        });

        // Test if it's a CORS issue by trying to fetch the URL
        if (src.includes("googleusercontent.com") || src.includes("firebase")) {
          console.warn(
            "🔴 This appears to be a Google/Firebase URL - likely CORS restricted"
          );
          console.info(
            "💡 Consider running avatar sync: POST /api/users/sync-all-avatars"
          );
        }
      }

      // Call the original onError if provided
      if (onError) {
        onError(event);
      }
    },
    [src, alt, onError]
  );

  // Don't render the image if src is empty or clearly invalid
  if (!src || src === "" || src === "null" || src === "undefined") {
    return null; // This will cause the fallback to show
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      src={src}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
