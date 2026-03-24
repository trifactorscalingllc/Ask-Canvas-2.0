import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-blue-700 transition-colors">
            A
          </div>
          <span className="font-extrabold text-gray-900 tracking-tight text-lg">Ask Canvas</span>
        </Link>
        
        <nav className="flex items-center space-x-6">
          {user ? (
            <div className="flex items-center space-x-6">
              <Link href="/chat" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">
                Chat
              </Link>
              <Link href="/settings" className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">
                Settings
              </Link>
              {user.email === 'admin@trifactorscaling.com' && (
                <Link href="/admin" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                  Admin
                </Link>
              )}
              <form action={handleSignOut} className="flex">
                <button type="submit" className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors ml-2 pl-6 border-l border-gray-200">
                  Log Out
                </button>
              </form>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-6">
              <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all shadow-sm">
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
