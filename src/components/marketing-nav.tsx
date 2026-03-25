'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Product', href: '/' },
  { label: 'How it Works', href: '/#how-it-works' },
  { label: 'Security', href: '/#security' },
]

export function MarketingNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-8">
      {navItems.map(({ label, href }) => {
        const basePath = href.split('#')[0] || '/'
        const isActive = pathname === basePath
        return (
          <Link
            key={label}
            href={href}
            className={`text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'text-blue-700 font-semibold border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
