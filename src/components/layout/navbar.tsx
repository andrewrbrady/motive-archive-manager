"use client";

import { Instagram, Mail, Moon, Sun } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logos } from "@/data/site-content";
import { useTheme } from "@/components/ThemeProvider";

// Common classes for consistent styling
const navClasses =
  "fixed top-0 left-0 right-0 z-50 bg-background-primary border-b border-gray-800";
const linkClasses =
  "text-sm uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors";
const iconButtonClasses = "text-gray-400 hover:text-gray-300 transition-colors";

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
      <nav className={`${navClasses} ${className || ""}`}>
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
              <Link href="/" className={linkClasses}>
                Home
              </Link>
              <Link href="/cars" className={linkClasses}>
                Cars
              </Link>
              <Link href="/inventory" className={linkClasses}>
                Inventory
              </Link>
              <Link href="/auctions" className={linkClasses}>
                Auctions
              </Link>
              <Link href="/raw" className={linkClasses}>
                Raw
              </Link>
              <Link href="/deliverables" className={linkClasses}>
                Deliverables
              </Link>
              <Link href="/events" className={linkClasses}>
                Events
              </Link>
              <Link href="/users" className={linkClasses}>
                Users
              </Link>
              <Link href="/clients" className={linkClasses}>
                Clients
              </Link>
              <Link href="/makes" className={linkClasses}>
                Makes
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <button
              onClick={toggleTheme}
              className={iconButtonClasses}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <a href="#" className={iconButtonClasses} aria-label="Instagram">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className={iconButtonClasses} aria-label="Email">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
