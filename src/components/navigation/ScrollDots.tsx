"use client";

import { useScroll } from "@/context/ScrollContext";
import { motion } from "framer-motion";

export default function ScrollDots() {
  const { currentSection } = useScroll();
  const sections = ["Hero", "Services", "Contact"];

  const scrollTo = (index: number) => {
    const element = document.querySelector(`[data-section="${index}"]`);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50">
      <div className="flex flex-col gap-4">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className="relative w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
          >
            {currentSection === index && (
              <motion.div
                layoutId="activeSection"
                className="absolute inset-0 bg-red-500 rounded-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
