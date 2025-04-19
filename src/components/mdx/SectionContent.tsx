import React from "react";

interface SectionContentProps {
  children: React.ReactNode;
  className?: string;
}

const SectionContent: React.FC<SectionContentProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 ${className}`}
    >
      {children}
    </div>
  );
};

export default SectionContent;
