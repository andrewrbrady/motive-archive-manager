import React from "react";

export default function GalleriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen flex flex-col pt-20">{children}</div>;
}
