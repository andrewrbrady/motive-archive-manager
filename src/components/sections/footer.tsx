import { Instagram, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">MOTIVE ARCHIVE</h3>
            <p>CHICAGO / SAN FRANCISCO</p>
            <p>HELLO@MOTIVEARCHIVE.COM</p>
          </div>
          <div className="flex justify-end space-x-4">
            <Instagram className="w-6 h-6" />
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>
    </footer>
  )
}