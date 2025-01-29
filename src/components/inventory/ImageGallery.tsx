"use client";

import React from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [mainImage, setMainImage] = React.useState(images[0]);

  return (
    <div className="space-y-2">
      <div className="w-full h-64 relative">
        <Image
          src={mainImage}
          alt="Vehicle"
          className="object-cover rounded-lg"
          fill
          sizes="100vw"
          priority
        />
      </div>
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {images.slice(0, 5).map((image, index) => (
          <button
            key={index}
            onClick={() => setMainImage(image)}
            className="flex-shrink-0 relative w-20 h-20"
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}`}
              className="object-cover rounded-md hover:opacity-75 transition"
              fill
              sizes="80px"
            />
          </button>
        ))}
        {images.length > 5 && (
          <div className="flex items-center justify-center w-20 h-20 bg-gray-100 rounded-md">
            <span className="text-sm text-gray-600">+{images.length - 5}</span>
          </div>
        )}
      </div>
    </div>
  );
};
