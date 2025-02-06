"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { MotiveLogo } from "./MotiveLogo";
import { cn } from "@/lib/utils";

interface CardImageProps extends Omit<ImageProps, "src"> {
  src?: string | null;
  containerClassName?: string;
}

export function CardImage({
  src,
  alt,
  containerClassName,
  className,
  ...props
}: CardImageProps) {
  const [error, setError] = useState(!src);

  if (!src || error) {
    return (
      <div
        className={cn(
          "relative w-full h-full min-h-[200px] bg-background-primary/50 flex items-center justify-center p-8",
          containerClassName
        )}
      >
        <MotiveLogo className="w-full h-full max-w-[150px] opacity-25" />
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
        className={cn("object-cover", className)}
        onError={() => setError(true)}
        fill
      />
    </div>
  );
}
