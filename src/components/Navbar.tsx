"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/production", label: "Production" },
  { href: "/inventory", label: "Inventory" },
  { href: "/cars", label: "Cars" },
];

export function Navbar() {
  const pathname = usePathname();

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
        </div>
      </nav>
    </div>
  );
}
