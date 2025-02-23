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
      <h1 className="text-lg uppercase tracking-wide font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
        {title}{" "}
        {count !== undefined && (
          <span className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
            ({count.toLocaleString()})
          </span>
        )}
      </h1>
      {children}
    </div>
  );
}
