import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: (isPortrait: boolean) => void;
}

const ResponsiveImage = ({
  src,
  alt,
  className = "",
  onLoad,
}: ResponsiveImageProps) => {
  const [isPortrait, setIsPortrait] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = document.createElement("img");
    img.onload = () => {
      const portrait = img.height > img.width;
      setIsPortrait(portrait);
      setLoaded(true);
      if (onLoad) {
        onLoad(portrait);
      }
    };
    img.src = src;
  }, [src, onLoad]);

  return (
    <div
      className={`relative ${className} ${!loaded ? "bg-muted" : ""}`}
      style={{ aspectRatio: isPortrait ? "3/4" : "4/3" }}
    >
      {loaded && <Image src={src} alt={alt} fill className="object-contain" />}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default ResponsiveImage;
