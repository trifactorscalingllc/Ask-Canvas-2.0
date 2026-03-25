import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavIcons } from './nav-icons'
import { MarketingNav } from './marketing-nav'

export async function HeaderNavbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function handleSignOut() {
    'use server'
    const sub = await createClient()
    await sub.auth.signOut()
    redirect('/')
  }

  // ── Marketing header (unauthenticated) ──────────────────────────────────
  if (!user) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/90 backdrop-blur-[12px] border-b border-gray-100 dark:border-gray-800 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-xl font-bold tracking-tighter text-slate-900 dark:text-white">
              Ask Canvas
            </Link>
            <MarketingNav />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2 transition-all text-sm">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-white px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 active:scale-95 shadow-md text-sm"
              style={{ background: 'linear-gradient(135deg, #004ac6 0%, #2563eb 100%)' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
    )
  }

  // ── App header (authenticated) ──────────────────────────────────────────
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        
        <div className="flex-1 flex justify-start items-center">
          <NavIcons />
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-extrabold text-gray-900 dark:text-white tracking-tight text-xl">Ask Canvas</span>
          </Link>
        </div>
        
        <div className="flex-1 flex justify-end items-center">
          <div className="flex items-center space-x-4">
            {user.email === 'admin@trifactorscaling.com' && (
              <Link href="/admin" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                Admin
              </Link>
            )}
            <form action={handleSignOut} className="flex">
              <button
                type="submit"
                className="text-sm font-semibold text-red-600 dark:text-red-400 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
              >
                Log Out
              </button>
            </form>
          </div>
        </div>

      </div>
    </header>
  )
}
