import { Instagram, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { logos } from "@/data/site-content";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1f3c] shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-20 px-4">
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
              className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/cars"
              className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            >
              Cars
            </Link>
            <Link
              href="/contact"
              className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/raw"
              className="text-sm uppercase tracking-wider text-white hover:text-gray-300 transition-colors"
            >
              Raw
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <a
            href="#"
            className="hover:text-gray-300 transition-colors text-white"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5" />
          </a>
          <a
            href="#"
            className="hover:text-gray-300 transition-colors text-white"
            aria-label="Email"
          >
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  );
}
