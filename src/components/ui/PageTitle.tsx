import React from "react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  count?: number;
  children?: React.ReactNode;
  className?: string;
}

export function PageTitle({
  title,
  count,
  children,
  className,
}: PageTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
        className
      )}
    >
      <h1 className="text-lg uppercase tracking-wide font-medium text-gray-900 dark:text-gray-100">
        {title}{" "}
        {count !== undefined && (
          <span className="text-gray-600 dark:text-gray-400">
            ({count.toLocaleString()})
          </span>
        )}
      </h1>
      {children}
    </div>
  );
}
