'use client'

import { recentProjects } from "@/data/site-content";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function RecentProjectsSection() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 40
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.215, 0.610, 0.355, 1.000]
      }
    }
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
            <span className="font-medium">Just as any museum has a curatorial team</span> to photograph, document, archive and catalogue the works they have—
            <span className="font-medium">it is vital for the modern collector to do the same.</span>
          </h2>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold text-center mb-16"
        >
          RECENT PROJECTS
        </motion.h2>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {recentProjects.map((project) => (
            <motion.div
              key={project.id}
              variants={itemVariants}
              className="group relative flex flex-col"
            >
              <Link href={`/projects/${project.slug}`} className="space-y-6">
                <div className="aspect-[16/10] overflow-hidden rounded-lg">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full relative"
                  >
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">
                      {project.client}
                    </p>
                    <h3 className="text-xl font-medium">
                      {project.title}
                    </h3>
                  </div>
                  
                  <div className="h-px w-12 bg-red-500 transition-all duration-300 group-hover:w-24" />
                  
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}