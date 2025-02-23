"use client";

import { Instagram, Mail } from "lucide-react";
import Image from "next/image";
import { logos } from "@/data/site-content";

export default function Footer() {
  return (
    <footer className="bg-[var(--background-primary)] dark:bg-[var(--background-primary)] border-t border-[hsl(var(--border-subtle))] dark:border-[hsl(var(--border-subtle))] py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Image
              src={logos.primary}
              alt="Motive Archive"
              width={48}
              height={48}
              className="w-12 h-12"
            />
            <div className="space-y-1">
              <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                CHICAGO / SAN FRANCISCO
              </p>
              <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
                HELLO@MOTIVEARCHIVE.COM
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-6 items-start">
            <a
              href="#"
              className="text-[hsl(var(--foreground-subtle))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))] transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-[hsl(var(--foreground-subtle))] hover:text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-muted))] dark:hover:text-[hsl(var(--foreground-subtle))] transition-colors"
              aria-label="Email"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
