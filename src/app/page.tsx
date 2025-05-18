"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollIndicator from "@/components/navigation/ScrollIndicator";
import HeroSection from "@/components/sections/hero";
import ServicesSection from "@/components/sections/services";
import RecentProjectsSection from "@/components/sections/recent-projects";
import ContactSection from "@/components/sections/contact";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
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
          </section>
        </div>
      </main>
    </div>
  );
}
