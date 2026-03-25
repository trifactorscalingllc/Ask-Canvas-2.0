import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavIcons } from './nav-icons'

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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-[12px] border-b border-gray-100 shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-xl font-bold tracking-tighter text-slate-900">
              Ask Canvas
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-blue-700 font-semibold border-b-2 border-blue-600 transition-colors text-sm">Product</Link>
              <Link href="/#workflow-section" className="text-slate-600 hover:text-slate-900 transition-colors text-sm">How it Works</Link>
              <Link href="/security" className="text-slate-600 hover:text-slate-900 transition-colors text-sm">Security</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-slate-600 hover:text-slate-900 font-medium px-4 py-2 transition-all text-sm">
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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        
        <div className="flex-1 flex justify-start items-center">
          <NavIcons />
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-extrabold text-gray-900 tracking-tight text-xl">Ask Canvas</span>
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
              <button type="submit" className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors ml-2 pl-4 border-l border-gray-200">
                Log Out
              </button>
            </form>
          </div>
        </div>

      </div>
    </header>
  )
}
