"use client";

import { Instagram, Mail, Moon, Sun } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logos } from "@/data/site-content";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Spacer div to prevent content from going under navbar */}
      <div className="h-20" />

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 ${
          className || ""
        }`}
      >
        <div className="container mx-auto flex justify-between items-center h-20 px-4">
          <div className="flex items-center space-x-12">
            <Link href="/" className="shrink-0">
              <Image
                src={logos.primary}
                alt="Motive Archive"
                width={96}
                height={96}
                className="w-12 h-12"
              />
            </Link>
            <div className="space-x-8">
              <Link
                href="/"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/cars"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Cars
              </Link>
              <Link
                href="/inventory"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Inventory
              </Link>
              <Link
                href="/auctions"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Auctions
              </Link>
              <Link
                href="/raw"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Raw
              </Link>
              <Link
                href="/deliverables"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Deliverables
              </Link>
              <Link
                href="/events"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Events
              </Link>
              <Link
                href="/users"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Users
              </Link>
              <Link
                href="/clients"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Clients
              </Link>
              <Link
                href="/makes"
                className="text-sm uppercase tracking-wider text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              >
                Makes
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={toggleTheme}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
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
      </nav>
    </>
  );
}
