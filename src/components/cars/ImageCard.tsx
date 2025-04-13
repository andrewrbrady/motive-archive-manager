import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageData } from "@/lib/imageLoader";

interface ImageCardProps {
  image: ImageData;
  onSelect?: (image: ImageData) => void;
  isSelected?: boolean;
}

export function ImageCard({ image, onSelect, isSelected }: ImageCardProps) {
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-md cursor-pointer",
        "hover:opacity-90 transition-opacity",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect?.(image)}
    >
      <Image
        src={image.url}
        alt={image.filename || "Car image"}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
