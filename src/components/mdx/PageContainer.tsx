import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("w-full max-w-none mx-auto", className)}>{children}</div>
  );
}
