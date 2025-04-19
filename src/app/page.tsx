"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/sections/hero";
import ServicesSection from "@/components/sections/services";
import RecentProjectsSection from "@/components/sections/recent-projects";
import ContactSection from "@/components/sections/contact";
import Footer from "@/components/layout/footer";
import ScrollIndicator from "@/components/navigation/ScrollIndicator";
import MDXEditor from "@/components/MDXEditor";
import { MediaSelector } from "@/components/MediaSelector";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
    }
  };

  return (
    <>
      <Navbar />
      <ScrollIndicator
        sectionsCount={4}
        activeSection={0}
        onDotClick={(index) => {
          const sections = ["hero", "services", "projects", "contact"];
          const element = document.getElementById(sections[index]);
          element?.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <div className="h-screen overflow-y-auto snap-mandatory snap-y">
        <section id="hero" className="snap-start h-screen">
          <HeroSection />
        </section>
        <section id="services" className="snap-start h-screen">
          <ServicesSection />
        </section>
        <section id="projects" className="snap-start h-screen">
          <RecentProjectsSection />
        </section>
        <section id="contact" className="snap-start h-screen flex flex-col">
          <div className="flex-1">
            <ContactSection />
          </div>
          <Footer />
        </section>
      </div>
      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Motive Archive Manager</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Editor</h2>
              <MediaSelector
                onSelect={(mdxCode) => setContent(content + "\n" + mdxCode)}
              />
            </div>
            <div className="border rounded-lg overflow-hidden">
              <MDXEditor value={content} onChange={handleEditorChange} />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Preview</h2>
            <div className="prose dark:prose-invert max-w-none p-4 border rounded-lg">
              {content || (
                <p className="text-muted-foreground">
                  Start writing to see the preview...
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
