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
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6",
        className
      )}
    >
      <h1 className="text-lg uppercase tracking-wide font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))] flex-shrink-0">
        {title}{" "}
        {count !== undefined && (
          <span className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            ({count.toLocaleString()})
          </span>
        )}
      </h1>
      {children && (
        <div className="w-full sm:w-auto sm:flex-shrink-0">{children}</div>
      )}
    </div>
  );
}
