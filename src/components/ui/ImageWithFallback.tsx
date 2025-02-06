"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { MotiveLogo } from "./MotiveLogo";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  src: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

export function ImageWithFallback({
  src,
  fallbackSrc,
  alt,
  className,
  containerClassName,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn(
          "relative w-full h-full min-h-[200px] bg-background-secondary/50 dark:bg-background-secondary/10 flex flex-col items-center justify-center gap-4 p-8 rounded-md border border-border/50",
          containerClassName
        )}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <MotiveLogo className="w-full h-full max-w-[120px] text-text-primary/25 dark:text-text-primary/15" />
          <span className="text-sm font-medium text-text-secondary dark:text-text-secondary/50">
            No Image
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative w-full h-full min-h-[200px]", containerClassName)}
    >
      <Image
        {...props}
        src={src}
        alt={alt}
        className={cn("object-cover rounded-md", className)}
        onError={() => setError(true)}
        fill
      />
    </div>
  );
}
