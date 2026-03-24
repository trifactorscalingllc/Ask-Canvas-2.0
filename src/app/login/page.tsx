import { login } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 flex-col px-4 font-sans">
      <form className="bg-white p-8 sm:p-10 rounded-3xl shadow-lg shadow-gray-200/50 w-full max-w-sm space-y-6">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center mb-2">Welcome Back</h2>
        
        {searchParams?.error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {searchParams.error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" required className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" placeholder="••••••••" />
        </div>
        <button formAction={login} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md mt-4 active:scale-[0.98]">
          Sign In
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-8">
        Don't have an account? <a href="/signup" className="text-blue-600 font-semibold hover:underline">Sign up</a>
      </p>
    </div>
  )
}
