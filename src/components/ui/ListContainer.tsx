import React, { ReactNode } from "react";

interface ListContainerProps {
  children: ReactNode;
  className?: string;
}

export function ListContainer({
  children,
  className = "",
}: ListContainerProps) {
  return <div className={`rounded-md border ${className}`}>{children}</div>;
}
