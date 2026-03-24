import { signup } from './actions'
import { TokenHelpModal } from '@/components/token-help-modal'

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 flex-col px-4 font-sans">
      <form action={signup} className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg shadow-gray-200/50 w-full max-w-sm space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center mb-2">Create Account</h2>
        
        {searchParams?.error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {searchParams.error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" required className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" placeholder="you@student.edu" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={6} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" placeholder="••••••••" />
          </div>
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700" htmlFor="canvas_key">Canvas API Token</label>
              <TokenHelpModal />
            </div>
            <p className="text-xs text-gray-400 font-medium mb-1.5 leading-snug">Your token is encrypted with AES-256. See our <a href="/security" className="text-blue-600 hover:underline">Security Overview</a>.</p>
            <input id="canvas_key" name="canvas_key" type="password" required className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-mono tracking-tight" placeholder="7~abcdef..." />
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md mt-4 active:scale-[0.98]">
          Sign Up
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-8">
        Already have an account? <a href="/login" className="text-blue-600 font-semibold hover:underline">Log in</a>
      </p>
    </div>
  )
}
