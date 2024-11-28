"use client";

import { motion } from "framer-motion";

export default function ContactSection() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3,
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
    <section className="h-full flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-12"
          initial="hidden"
          whileInView="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-4xl font-bold mb-8">Archive with us.</h2>
          </motion.div>

          <motion.div variants={itemVariants}>
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                             transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                             transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2
                           transition-all duration-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-red-400 text-white px-6 py-2 rounded hover:bg-red-500 transition-all duration-200
                         hover:scale-[1.02] active:scale-[0.98]"
              >
                Send
              </button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
