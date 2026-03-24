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

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
        
        {/* Left Column: Nav Icons (if logged in) or empty */}
        <div className="flex-1 flex justify-start items-center">
          {user && <NavIcons />}
        </div>

        {/* Center Column: Ask Canvas */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="font-extrabold text-gray-900 tracking-tight text-xl">Ask Canvas</span>
          </Link>
        </div>
        
        {/* Right Column: User State / Auth items */}
        <div className="flex-1 flex justify-end items-center">
          {user ? (
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
          ) : (
            <div className="hidden sm:flex items-center space-x-5">
              <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
