"use client";

import { heroContent } from "@/data/site-content";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex(
        (prevIndex) => (prevIndex + 1) % heroContent.images.length
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={currentIndex}
          src={heroContent.images[currentIndex]}
          alt="Hero"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{
            duration: 0.8,
            ease: [0.215, 0.61, 0.355, 1.0],
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

export default function HeroSection() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 40,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.215, 0.61, 0.355, 1.0],
      },
    },
  };

  return (
    <section className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Text Content */}
      <div className="w-full md:w-1/2 flex items-center z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="max-w-3xl mx-auto px-8 py-12 md:py-0"
        >
          <motion.div variants={itemVariants}>
            <h1 className="mb-4">
              <span className="block text-7xl font-bold leading-none tracking-tight">
                MOTIVE
              </span>
              <span className="block text-7xl font-light text-gray-700 leading-none tracking-tight">
                ARCHIVE
              </span>
            </h1>
          </motion.div>
          <motion.span
            variants={itemVariants}
            className="text-lg font-medium uppercase tracking-[0.2em] text-gray-500 block mb-8"
          >
            The Collector's Resource
          </motion.span>
          <motion.div
            variants={itemVariants}
            className="h-px w-24 bg-red-500 my-8"
          />
          <motion.div
            variants={itemVariants}
            className="text-xl text-gray-700 leading-relaxed font-light max-w-lg"
          >
            {heroContent.description
              .split(". ")
              .map((sentence, index, array) => (
                <span key={index} className="block mb-4 last:mb-0">
                  {sentence}
                  {index !== array.length - 1 ? "." : ""}
                </span>
              ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Right side - Image Carousel */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-screen relative">
        <ImageCarousel />
      </div>
    </section>
  );
}
