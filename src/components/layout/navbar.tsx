"use client";

import {
  Instagram,
  Mail,
  Moon,
  Sun,
  Menu,
  Home,
  Car,
  ImageIcon,
  FolderIcon,
  FolderOpen,
  FileText,
  Package,
  TrendingUp,
  Calendar,
  PenTool,
  Settings,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logos } from "@/data/site-content";
import { useTheme } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/auth/UserMenu";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

// Common classes for consistent styling
const navClasses =
  "fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background-secondary))] border-b border-[hsl(var(--border))] shadow-sm backdrop-blur-sm";
const linkClasses =
  "text-sm uppercase tracking-wider text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";
const iconButtonClasses =
  "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";
const mobileLinkClasses =
  "text-sm uppercase tracking-wider text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-subtle))] transition-colors py-3 px-3 border-b border-[hsl(var(--border))] last:border-b-0 block hover:bg-[hsl(var(--accent))/5] rounded-md flex items-center gap-3";

// Function to get the appropriate icon for each navigation item
const getNavIcon = (href: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    "/": Home,
    "/cars": Car,
    "/images": ImageIcon,
    "/galleries": FolderIcon,
    "/projects": FolderOpen,
    "/documents": FileText,
    "/production": Package,
    "/market": TrendingUp,
    "/schedule": Calendar,
    "/copywriting": PenTool,
    "/admin": Settings,
  };

  return iconMap[href] || FileText;
};

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  // Navigation items
  const navigationItems = [
    { name: "Home", href: "/" },
    { name: "Cars", href: "/cars" },
    { name: "Images", href: "/images" },
    { name: "Galleries", href: "/galleries" },
    { name: "Documents", href: "/documents" },
    { name: "Production", href: "/production" },
    { name: "Projects", href: "/projects" },
    { name: "Market", href: "/market" },
    { name: "Schedule", href: "/schedule" },
    { name: "Copywriting", href: "/copywriting" },
    { name: "Admin", href: "/admin" },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav className={`${navClasses} ${className || ""}`}>
      <div className="container-fluid flex justify-between items-center h-20">
        {/* Left side - Logo and Desktop Navigation */}
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

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex space-x-8">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClasses}>
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Theme toggle, Social links, User menu, and Mobile menu button */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Desktop-only social icons and theme toggle */}
          <div className="hidden md:flex items-center space-x-4 sm:space-x-6">
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

          {/* User menu - always visible */}
          <UserMenu />

          {/* Mobile menu button - Only visible on mobile/tablet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={`lg:hidden ${iconButtonClasses} p-2`}
                aria-label="Open mobile menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] sm:w-[320px] flex flex-col"
            >
              <SheetHeader className="text-left flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                  <Image
                    src={logos.primary}
                    alt="Motive Archive"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                  <SheetTitle className="text-lg font-bold tracking-wider">
                    MOTIVE ARCHIVE
                  </SheetTitle>
                </div>
              </SheetHeader>

              {/* Scrollable navigation area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden mt-6 -mx-6 px-6">
                <div className="flex flex-col space-y-1">
                  {navigationItems.map((item) => {
                    const IconComponent = getNavIcon(item.href);
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={mobileLinkClasses}
                          onClick={handleLinkClick}
                        >
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                          {item.name}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                {/* Mobile-only controls */}
                <div className="flex flex-col space-y-4 mt-6 pt-6 border-t border-[hsl(var(--border))]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--foreground-muted))] uppercase tracking-wider font-medium">
                      Theme
                    </span>
                    <button
                      onClick={toggleTheme}
                      className={`${iconButtonClasses} p-2 rounded-md hover:bg-[hsl(var(--accent))]`}
                      aria-label="Toggle theme"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4" />
                      ) : (
                        <Moon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[hsl(var(--foreground-muted))] uppercase tracking-wider font-medium">
                      Connect
                    </span>
                    <div className="flex space-x-1">
                      <a
                        href="#"
                        className={`${iconButtonClasses} p-2 rounded-md hover:bg-[hsl(var(--accent))]`}
                        aria-label="Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a
                        href="#"
                        className={`${iconButtonClasses} p-2 rounded-md hover:bg-[hsl(var(--accent))]`}
                        aria-label="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
