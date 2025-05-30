import { Instagram, Mail } from 'lucide-react'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-[hsl(var(--background))] text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <div className="text-2xl font-bold">MA</div>
          <div className="space-x-6">
            <Link href="/" className="hover:text-[hsl(var(--foreground-subtle))]">Home</Link>
            <Link href="/cars" className="hover:text-[hsl(var(--foreground-subtle))]">Cars</Link>
            <Link href="/contact" className="hover:text-[hsl(var(--foreground-subtle))]">Contact</Link>
          </div>
        </div>
        <div className="flex space-x-4">
          <Instagram className="w-6 h-6" />
          <Mail className="w-6 h-6" />
        </div>
      </div>
    </nav>
  )
}