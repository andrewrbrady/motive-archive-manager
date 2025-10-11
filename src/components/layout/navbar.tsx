"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logos } from "@/data/site-content";
import { useTheme } from "@/components/ThemeProvider";
import { useSession } from "@/hooks/useFirebaseAuth";
import React, { useState, lazy, Suspense } from "react";
import { useFastLink } from "@/lib/navigation/simple-cache";

// ✅ Only import essential icons directly
import { Menu, Moon, Sun } from "lucide-react";

// ✅ Lazy load heavy components
const UserMenu = lazy(() =>
  import("@/components/auth/UserMenu").then((m) => ({ default: m.UserMenu }))
);

// Common classes for consistent styling
const navClasses =
  "fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--background-secondary))] border-b border-[hsl(var(--border))] shadow-sm backdrop-blur-sm";
const linkClasses =
  "text-sm uppercase tracking-wider text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";
const iconButtonClasses =
  "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground-subtle))] transition-colors";
const mobileLinkClasses =
  "text-sm uppercase tracking-wider text-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground-subtle))] transition-colors py-3 px-3 border-b border-[hsl(var(--border))] last:border-b-0 block hover:bg-[hsl(var(--accent))/5] rounded-md flex items-center gap-3";

interface NavbarProps {
  className?: string;
}

export default function Navbar({ className }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Navigation items
  const navigationItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Cars", href: "/cars" },
    { name: "Galleries", href: "/galleries" },
    { name: "Projects", href: "/projects" },
    { name: "Production", href: "/production" },
    { name: "Images", href: "/images" },
    { name: "Events", href: "/events" },
    { name: "Calendar", href: "/events/calendar" },
  ];

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav className={`${navClasses} ${className || ""}`}>
      <div className="container-fluid flex justify-between items-center h-20">
        {/* Left side - Logo and Desktop Navigation */}
        <div className="flex items-center space-x-12">
          <FastLink href="/" className="shrink-0">
            <Image
              src={logos.primary}
              alt="Motive Archive"
              width={96}
              height={96}
              className="w-12 h-12"
            />
          </FastLink>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:flex space-x-8">
            {navigationItems.map((item) => (
              <FastLink
                key={item.href}
                href={item.href}
                className={`${linkClasses} ${
                  pathname === item.href
                    ? "text-[hsl(var(--foreground-subtle))]"
                    : ""
                }`}
              >
                {item.name}
              </FastLink>
            ))}
          </div>
        </div>

        {/* Right side - Theme toggle, Social links, User menu, and Mobile menu button */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-md ${iconButtonClasses}`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Social Links - Lazy load icons */}
          <div className="hidden md:flex items-center space-x-3">
            <Suspense fallback={<div className="w-9 h-9" />}>
              <SocialLinks />
            </Suspense>
          </div>

          {/* User Menu - Lazy loaded */}
          <Suspense
            fallback={
              <div className="w-9 h-9 bg-muted rounded-full animate-pulse" />
            }
          >
            <UserMenu />
          </Suspense>

          {/* Mobile Menu Button - Lazy loaded */}
          <Suspense fallback={<div className="w-10 h-10" />}>
            <MobileMenu
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              navigationItems={navigationItems}
              pathname={pathname}
              theme={theme}
              toggleTheme={toggleTheme}
              handleLinkClick={handleLinkClick}
            />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}

// ✅ Separate component for social links to lazy load icons
function SocialLinks() {
  const [Instagram, setInstagram] = useState<any>(null);
  const [Mail, setMail] = useState<any>(null);

  React.useEffect(() => {
    import("lucide-react").then((m) => {
      setInstagram(() => m.Instagram);
      setMail(() => m.Mail);
    });
  }, []);

  if (!Instagram || !Mail) return null;

  return (
    <>
      <a
        href="https://instagram.com/motivefilms"
        target="_blank"
        rel="noopener noreferrer"
        className={`p-2 rounded-md ${iconButtonClasses}`}
        aria-label="Instagram"
      >
        <Instagram className="h-5 w-5" />
      </a>
      <a
        href="mailto:hello@motivefilms.com"
        className={`p-2 rounded-md ${iconButtonClasses}`}
        aria-label="Email"
      >
        <Mail className="h-5 w-5" />
      </a>
    </>
  );
}

// ✅ Separate component for mobile menu to lazy load Sheet components
function MobileMenu({
  isOpen,
  setIsOpen,
  navigationItems,
  pathname,
  theme,
  toggleTheme,
  handleLinkClick,
}: any) {
  const [SheetComponents, setSheetComponents] = useState<any>(null);

  React.useEffect(() => {
    import("@/components/ui/sheet").then((m) => {
      setSheetComponents({
        Sheet: m.Sheet,
        SheetContent: m.SheetContent,
        SheetHeader: m.SheetHeader,
        SheetTitle: m.SheetTitle,
        SheetTrigger: m.SheetTrigger,
        SheetClose: m.SheetClose,
      });
    });
  }, []);

  if (!SheetComponents) {
    return (
      <button className={`lg:hidden p-2 rounded-md ${iconButtonClasses}`}>
        <Menu className="h-6 w-6" />
      </button>
    );
  }

  const {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
  } = SheetComponents;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={`lg:hidden p-2 rounded-md ${iconButtonClasses}`}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden mt-6 -mx-6 px-6">
          <div className="flex flex-col space-y-1">
            {navigationItems.map((item: any) => (
              <SheetClose asChild key={item.href}>
                <FastLink
                  href={item.href}
                  className={`${mobileLinkClasses} ${
                    pathname === item.href ? "bg-[hsl(var(--accent))/10]" : ""
                  }`}
                  onClick={handleLinkClick}
                >
                  <span className="w-4 h-4 flex-shrink-0"></span>
                  {item.name}
                </FastLink>
              </SheetClose>
            ))}
          </div>

          {/* Mobile-only controls */}
          <div className="mt-8 pt-6 border-t border-[hsl(var(--border))]">
            <div className="flex flex-col space-y-4">
              {/* Mobile Theme Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--foreground-muted))] uppercase tracking-wider">
                  Theme
                </span>
                <button
                  onClick={toggleTheme}
                  className={`p-2 rounded-md ${iconButtonClasses}`}
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Fast Link Component - Uses standard Next.js Link with minimal preloading
 */
interface FastLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

function FastLink({ href, children, className, onClick }: FastLinkProps) {
  const { linkProps } = useFastLink({ href });

  return (
    <Link {...linkProps} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
