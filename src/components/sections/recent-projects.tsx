"use client";

import { recentProjects } from "@/data/site-content";
import Image from "next/image";
import Link from "next/link";

export default function RecentProjectsSection() {
  return (
    <section className="min-h-screen flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full py-16">
        <div className="mb-20 max-w-4xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-light leading-relaxed text-[hsl(var(--foreground-subtle))]">
            <span className="font-medium">
              Just as any museum has a curatorial team
            </span>{" "}
            to photograph, document, archive and catalogue the works they have—
            <span className="font-medium">
              it is vital for the modern collector to do the same.
            </span>
          </h2>
        </div>

        <h2 className="text-5xl font-bold text-center mb-16">
          RECENT PROJECTS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recentProjects.map((project) => (
            <div key={project.id} className="group relative flex flex-col">
              <Link href={`/projects/${project.slug}`} className="space-y-6">
                <div className="aspect-[16/10] overflow-hidden rounded-lg">
                  <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-300">
                    <Image
                      src={project.thumbnailUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[hsl(var(--foreground-muted))] uppercase tracking-wider mb-2">
                      {project.client}
                    </p>
                    <h3 className="text-xl font-medium">{project.title}</h3>
                  </div>

                  <div className="h-px w-12 bg-destructive-500 transition-all duration-300 group-hover:w-24" />

                  <p className="text-[hsl(var(--foreground-subtle))] text-sm leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
