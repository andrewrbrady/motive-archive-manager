import React, { ReactNode } from "react";

interface FilterContainerProps {
  children: ReactNode;
  className?: string;
}

export function FilterContainer({
  children,
  className = "",
}: FilterContainerProps) {
  return (
    <div className={`space-y-4 mb-6 ${className}`}>
      <div className="flex flex-wrap gap-4">{children}</div>
    </div>
  );
}
