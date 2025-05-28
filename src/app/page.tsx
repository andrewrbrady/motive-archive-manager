"use client";

import { useSession } from "@/hooks/useFirebaseAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollIndicator from "@/components/navigation/ScrollIndicator";

// ✅ Lazy load heavy sections to reduce initial bundle
const HeroSection = lazy(() => import("@/components/sections/hero"));
const ServicesSection = lazy(() => import("@/components/sections/services"));
const RecentProjectsSection = lazy(
  () => import("@/components/sections/recent-projects")
);
const ContactSection = lazy(() => import("@/components/sections/contact"));

// ✅ Simple loading component
const SectionSkeleton = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

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
            <Suspense fallback={<SectionSkeleton />}>
              <HeroSection />
            </Suspense>
          </section>
          <section id="services" className="snap-start h-screen">
            <Suspense fallback={<SectionSkeleton />}>
              <ServicesSection />
            </Suspense>
          </section>
          <section id="projects" className="snap-start h-screen">
            <Suspense fallback={<SectionSkeleton />}>
              <RecentProjectsSection />
            </Suspense>
          </section>
          <section id="contact" className="snap-start h-screen flex flex-col">
            <div className="flex-1">
              <Suspense fallback={<SectionSkeleton />}>
                <ContactSection />
              </Suspense>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
