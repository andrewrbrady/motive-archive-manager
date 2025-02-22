"use client";

import { Instagram, Mail } from "lucide-react";
import Image from "next/image";
import { logos } from "@/data/site-content";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[var(--background-primary)] border-t border-gray-200 dark:border-gray-800 py-12">
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
              <p className="text-gray-600 dark:text-gray-400">
                CHICAGO / SAN FRANCISCO
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                HELLO@MOTIVEARCHIVE.COM
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-6 items-start">
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
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
