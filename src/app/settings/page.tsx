'use client'

import { useState, useEffect } from 'react'
import { updateToken, deleteAccount } from './actions'
import { createClient } from '@/lib/supabase/client'
import { TokenHelpModal } from '@/components/token-help-modal'
import { useRouter } from 'next/navigation'
import { X, Sun, Moon } from 'lucide-react'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [isDark, setIsDark] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '')
      setLoading(false)
    })
    // Restore theme from localStorage on mount
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [supabase.auth])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  async function handleUpdateToken(formData: FormData) {
    setSubmitLoading(true)
    setMessage({ text: '', type: '' })
    const res = await updateToken(formData)
    setSubmitLoading(false)
    if (res?.error) {
      setMessage({ text: res.error, type: 'error' })
    } else {
      setMessage({ text: 'API Token successfully updated.', type: 'success' })
      const form = document.getElementById('tokenForm') as HTMLFormElement
      if (form) form.reset()
    }
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 font-sans animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Account Settings</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage your Canvas API integration and personal account details.</p>
          </div>
          <button
            onClick={() => router.back()}
            title="Close Settings"
            className="mt-1 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">Profile Information</h3>
          </div>
          <div className="px-6 py-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
            <div className="mt-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm">
              {loading ? <span className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded inline-block"></span> : email}
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Your email is tied to your authentication identity.</p>
          </div>
        </div>

        {/* ── Theme Toggle ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">Appearance</h3>
          </div>
          <div className="px-6 py-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isDark ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Toggle between light and dark themes. Saved automatically.</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isDark ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center transition-transform duration-300 ${isDark ? 'translate-x-7' : 'translate-x-0'}`}>
                {isDark ? <Moon className="w-3.5 h-3.5 text-blue-600" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
            <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">Canvas Integration</h3>
          </div>
          <div className="px-6 py-6">
            {message.text && (
               <div className={`mb-4 p-4 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50' : 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50'}`}>
                 {message.text}
               </div>
            )}
            <form id="tokenForm" action={handleUpdateToken} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="canvas_key" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Update Canvas API Token</label>
                  <TokenHelpModal />
                </div>
                <input
                  type="password"
                  name="canvas_key"
                  id="canvas_key"
                  required
                  placeholder="New API Token (7~abcdef...)"
                  className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-mono tracking-tight dark:text-white"
                />
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Updating your token will replace the existing one. It is encrypted at rest using AES-256.</p>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="inline-flex justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 transition-colors"
                >
                  {submitLoading ? 'Saving...' : 'Save Token'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 shadow-sm border border-red-100 dark:border-red-900/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-red-100/50 dark:border-red-900/50">
            <h3 className="text-lg font-semibold leading-6 text-red-800 dark:text-red-400">Danger Zone</h3>
          </div>
          <div className="px-6 py-6 sm:flex sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-400">Delete Account</h4>
              <p className="mt-1 text-sm text-red-700/80 dark:text-red-400/80">
                Permanently delete your account and wipe all Canvas integrations and conversation history. This action cannot be undone.
              </p>
            </div>
            <div className="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:flex-shrink-0 sm:items-center">
              <form action={deleteAccount}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-red-600 dark:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                  onClick={(e) => {
                    if (!confirm("Are you absolutely sure you want to delete your account? All data will be wiped immediately.")) {
                      e.preventDefault()
                    }
                  }}
                >
                  Delete Account
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
