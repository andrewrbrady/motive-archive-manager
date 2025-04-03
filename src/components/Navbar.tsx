"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const publicNavItems = [{ href: "/", label: "Home" }];

const protectedNavItems = [
  { href: "/production", label: "Production" },
  { href: "/inventory", label: "Inventory" },
  { href: "/cars", label: "Cars" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = session
    ? [...publicNavItems, ...protectedNavItems]
    : publicNavItems;

  return (
    <div className="container mx-auto px-4 py-4">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Motive Archive
        </Link>

        <div className="flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {!session ? (
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Sign In
            </Link>
          ) : (
            <Link
              href="/auth/signout"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Sign Out
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
