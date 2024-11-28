"use client";

import { services } from "@/data/site-content";
import { motion } from "framer-motion";

export default function ServicesSection() {
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
    <section className="min-h-screen flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-20 max-w-4xl mx-auto text-center"
        >
          <h2 className="text-xl md:text-2xl font-light leading-relaxed text-gray-600">
            <span className="font-medium">
              Just as any museum has a curatorial team
            </span>{" "}
            to photograph, document, archive and catalogue the works they have—
            <span className="font-medium">
              it is vital for the modern collector to do the same.
            </span>
          </h2>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold text-center mb-16"
        >
          SERVICES
        </motion.h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              variants={itemVariants}
              className="group relative flex flex-col"
            >
              <div className="aspect-[4/3] mb-6 overflow-hidden rounded-lg">
                <motion.img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="flex flex-col flex-1">
                <h3 className="text-lg font-medium uppercase tracking-wider mb-4">
                  {service.title}
                </h3>

                <div className="h-px w-12 bg-red-500 mb-4 transition-all duration-300 group-hover:w-24" />

                <p className="text-gray-600 text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>

              <motion.div
                className="absolute inset-0 border-2 border-transparent rounded-lg"
                whileHover={{
                  borderColor: "rgba(239, 68, 68, 0.2)",
                  transition: { duration: 0.3 },
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
