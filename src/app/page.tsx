import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat')
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] font-sans">
      {/* Hero Section */}
      <section className="bg-white px-6 py-20 lg:py-32 text-center border-b border-gray-100 flex-1 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Your Personal <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Canvas LMS Agent</span>
          </h1>
          <p className="text-lg lg:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Stop digging through modular tabs and hidden assignment lists. Ask natural questions and get instant, accurate answers about your course data.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link href="/signup" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5">
              Create Free Account
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold rounded-full border border-gray-200 transition-all shadow-sm">
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-50 px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">How it Works</h2>
            <p className="mt-4 text-gray-500 text-lg">Three simple steps to supercharge your academic workflow.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl mb-6">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Sync Canvas</h3>
              <p className="text-gray-500 leading-relaxed">Securely connect your active university Canvas account using an encrypted API token.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl mb-6">2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ask Anything</h3>
              <p className="text-gray-500 leading-relaxed">Ask "What is my current grade in Math?" or "What assignments are due this week?"</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center font-bold text-xl mb-6">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Learn Faster</h3>
              <p className="text-gray-500 leading-relaxed">The AI Agent securely reads your data and returns instant, precise answers without hallucinating.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-gray-900 px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 mb-2">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">Security First. Always.</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Your academic data belongs to you. We strictly implement standard AES-256-CBC encryption on all Canvas Tokens at rest, ensuring absolute compliance and security.
          </p>
          <div className="pt-6">
            <Link href="/security" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-center hover:underline">
              Read our full Security Protocol
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
