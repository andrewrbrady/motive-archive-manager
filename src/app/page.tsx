"use client";
import Navbar from "@/components/layout/navbar";
import HeroSection from "@/components/sections/hero";
import ServicesSection from "@/components/sections/services";
import RecentProjectsSection from "@/components/sections/recent-projects";
import ContactSection from "@/components/sections/contact";
import Footer from "@/components/layout/footer";
import ScrollIndicator from "@/components/navigation/ScrollIndicator";
import { useState, useEffect } from "react";

export default function Page() {
  const [activeSection, setActiveSection] = useState(0);
  const sections = ["hero", "services", "projects", "contact"];

  const handleScroll = (index: number) => {
    const element = document.getElementById(sections[index]);
    element?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(index);
  };

  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const index = sections.indexOf(id);
          if (index !== -1) {
            setActiveSection(index);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.5,
    });

    sections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />
      <ScrollIndicator
        sectionsCount={sections.length}
        activeSection={activeSection}
        onDotClick={handleScroll}
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
    </>
  );
}
