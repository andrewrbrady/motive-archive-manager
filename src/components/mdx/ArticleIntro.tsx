"use client";

import React from "react";
import Image from "next/image";

interface ArticleIntroProps {
  title: string;
  subtitle?: string;
  coverImage?: {
    url: string;
    alt?: string;
  };
}

export default function ArticleIntro({
  title,
  subtitle,
  coverImage,
}: ArticleIntroProps) {
  return (
    <section className="snap-section full-bleed min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
        <div className="prose lg:prose-xl flex flex-col justify-center px-8 lg:px-20 py-12">
          <h1>{title}</h1>
          <p className="text-xl text-gray-600">{subtitle}</p>
        </div>
        <div className="relative min-h-[50vh] lg:min-h-screen">
          {coverImage && (
            <img
              src={coverImage.url}
              alt={coverImage.alt || title}
              className="w-full h-full object-cover inset-0"
            />
          )}
        </div>
      </div>
    </section>
  );
}
