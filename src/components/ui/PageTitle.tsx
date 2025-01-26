import React from "react";

interface PageTitleProps {
  title: string;
  count?: number;
  children?: React.ReactNode;
}

export function PageTitle({ title, count, children }: PageTitleProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
