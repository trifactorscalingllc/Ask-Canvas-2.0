'use client'

import { useState, useEffect } from 'react'
import { updateToken, deleteAccount } from './actions'
import { createClient } from '@/lib/supabase/client'
import { TokenHelpModal } from '@/components/token-help-modal'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || '')
      }
      setLoading(false)
    })
  }, [supabase.auth])

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
    <div className="flex-1 bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-500">Manage your Canvas API integration and personal account details.</p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">Profile Information</h3>
          </div>
          <div className="px-6 py-6">
            <label className="block text-sm font-semibold text-gray-700">Email Address</label>
            <div className="mt-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm">
              {loading ? <span className="animate-pulse bg-gray-200 h-4 w-32 rounded inline-block"></span> : email}
            </div>
            <p className="mt-2 text-xs text-gray-400">Your email is tied to your authentication identity.</p>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">Canvas Integration</h3>
          </div>
          <div className="px-6 py-6">
            {message.text && (
               <div className={`mb-4 p-4 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                 {message.text}
               </div>
            )}
            <form id="tokenForm" action={handleUpdateToken} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="canvas_key" className="block text-sm font-semibold text-gray-700">Update Canvas API Token</label>
                  <TokenHelpModal />
                </div>
                <input
                  type="password"
                  name="canvas_key"
                  id="canvas_key"
                  required
                  placeholder="New API Token (7~abcdef...)"
                  className="block w-full px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-mono tracking-tight"
                />
                <p className="mt-2 text-xs text-gray-400">Updating your token will replace the existing one. It is encrypted at rest using AES-256.</p>
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

        <div className="bg-red-50 shadow-sm border border-red-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-red-100/50">
            <h3 className="text-lg font-semibold leading-6 text-red-800">Danger Zone</h3>
          </div>
          <div className="px-6 py-6 sm:flex sm:items-start sm:justify-between">
            <div>
              <h4 className="text-sm font-bold text-red-900">Delete Account</h4>
              <p className="mt-1 text-sm text-red-700/80">
                Permanently delete your account and wipe all Canvas integrations and conversation history. This action cannot be undone.
              </p>
            </div>
            <div className="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:flex-shrink-0 sm:items-center">
              <form action={deleteAccount}>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
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
