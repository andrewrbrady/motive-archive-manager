"use client";

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ 
  src, 
  fallbackSrc = "/no-image.jpg",
  alt,
  ...props 
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        if (!error) {
          setImgSrc(fallbackSrc);
          setError(true);
        }
      }}
      unoptimized={imgSrc === fallbackSrc} // Don't optimize fallback image
      loading="lazy"
    />
  );
}