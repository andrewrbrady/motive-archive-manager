"use client";

import { motion } from "framer-motion";

interface ScrollIndicatorProps {
  sectionsCount: number;
  activeSection: number;
  onDotClick: (index: number) => void;
}

export default function ScrollIndicator({
  sectionsCount,
  activeSection,
  onDotClick,
}: ScrollIndicatorProps) {
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50">
      <div className="flex flex-col gap-4">
        {Array.from({ length: sectionsCount }).map((_, index) => (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            className="group relative w-3 h-3"
            aria-label={`Scroll to section ${index + 1}`}
          >
            <motion.div
              className={`
                absolute inset-0 rounded-full transition-all duration-300
                ${
                  activeSection === index
                    ? "bg-red-500 scale-100"
                    : "bg-gray-300 scale-75 group-hover:scale-90 group-hover:bg-gray-400"
                }
              `}
              layoutId="activeDot"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
