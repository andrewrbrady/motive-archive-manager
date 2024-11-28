import { Instagram, Mail } from "lucide-react";
import Image from "next/image";
import { logos } from "@/data/site-content";

export default function Footer() {
  return (
    <footer className="bg-[#1a1f3c] text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
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
              <p className="text-gray-200">CHICAGO / SAN FRANCISCO</p>
              <p className="text-gray-200">HELLO@MOTIVEARCHIVE.COM</p>
            </div>
          </div>
          <div className="flex justify-end space-x-6 items-start">
            <a
              href="#"
              className="hover:text-gray-300 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="hover:text-gray-300 transition-colors"
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
