import React from "react";
import Image from "next/image";

export const components = {
  p: ({ children }: { children: React.ReactNode }) => (
    <div className="mb-4">{children}</div>
  ),
  img: ({ src, alt }: { src: string; alt?: string }) => {
    if (!src) return null;
    return (
      <div className="my-4">
        <Image
          src={src}
          alt={alt || ""}
          width={800}
          height={400}
          className="rounded-lg"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  },
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-3xl font-bold mb-4">{children}</h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-2xl font-bold mb-3">{children}</h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xl font-bold mb-2">{children}</h3>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-4">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-4">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="mb-1">{children}</li>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">
      {children}
    </blockquote>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="bg-gray-100 rounded px-1">{children}</code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4">
      {children}
    </pre>
  ),
};
