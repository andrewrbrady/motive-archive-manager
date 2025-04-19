import React from "react";

export default function GalleriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen flex flex-col">{children}</div>;
}
