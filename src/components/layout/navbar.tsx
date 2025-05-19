"use client";

import { Instagram, Mail, Moon, Sun } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logos } from "@/data/site-content";
import { useTheme } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { useSession } from "next-auth/react";

// Common classes for consistent styling
const navClasses =
  "fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background-secondary))] border-b border-[hsl(var(--border))] shadow-sm backdrop-blur-sm";
const linkClasses =
  "text-sm uppercase tracking-wider text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";
const iconButtonClasses =
  "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();

  // Find the navigation items array and add the galleries link
  const navigationItems = [
    { name: "Cars", href: "/cars" },
    { name: "Images", href: "/images" },
    { name: "Galleries", href: "/galleries" },
    { name: "Documents", href: "/documents" },
    { name: "Inventory", href: "/inventory" },
  ];

  return (
    <nav className={`${navClasses} ${className || ""}`}>
      <div className="container-fluid flex justify-between items-center h-20">
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
            <Link href="/production" className={linkClasses}>
              Production
            </Link>
            <Link href="/market" className={linkClasses}>
              Market
            </Link>
            <Link href="/schedule" className={linkClasses}>
              Schedule
            </Link>
            <Link href="/copywriting" className={linkClasses}>
              Copywriting
            </Link>
            <Link href="/admin" className={linkClasses}>
              Admin
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
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
