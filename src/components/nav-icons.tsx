'use client'

import Link from 'next/link'
import { Settings, Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function NavIcons() {
  const pathname = usePathname()

  const handleToggleSidebar = () => {
    if (pathname !== '/chat') {
      window.location.href = '/chat'
    } else {
      window.dispatchEvent(new CustomEvent('toggleSidebar'))
    }
  }

  return (
    <div className="flex items-center space-x-5">
      <button 
        onClick={handleToggleSidebar}
        className="text-gray-500 hover:text-blue-600 transition-colors p-1"
        title="History"
      >
        <Menu className="w-5 h-5" />
      </button>


      <Link href="/settings" className="text-gray-500 hover:text-blue-600 transition-colors p-1" title="Settings">
        <Settings className="w-5 h-5" />
      </Link>
    </div>
  )
}
