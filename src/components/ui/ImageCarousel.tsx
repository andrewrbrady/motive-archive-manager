"use client";

import { heroContent } from "@/data/site-content";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(
        (prevIndex) => (prevIndex + 1) % heroContent.images.length
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img
            src={heroContent.images[currentIndex]}
            alt="Hero"
            className="w-full h-full object-cover"
          />
          {/* Optional overlay for better text contrast */}
          <div className="absolute inset-0 bg-black/20" />
        </motion.div>
      </AnimatePresence>
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
      <div className="max-w-7xl flex-1 flex items-center md:w-1/2">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          className="max-w-7xl mx-auto px-8"
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

      {/* Desktop carousel */}
      <motion.div
        className="w-1/2 h-screen relative hidden md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1.0] }}
      >
        <ImageCarousel />
      </motion.div>

      {/* Mobile carousel */}
      <motion.div
        className="md:hidden w-full h-[50vh] mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.215, 0.61, 0.355, 1.0] }}
      >
        <ImageCarousel />
      </motion.div>
    </section>
  );
}
