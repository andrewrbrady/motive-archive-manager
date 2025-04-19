import React from "react";
import { cn } from "@/lib/utils";

interface SnapSectionProps {
  children: React.ReactNode;
  className?: string;
}

const SnapSection: React.FC<SnapSectionProps> = ({
  children,
  className = "",
}) => {
  return (
    <section
      className={cn(
        "min-h-screen w-full flex-shrink-0 snap-start snap-always",
        className
      )}
    >
      {children}
    </section>
  );
};

export default SnapSection;
