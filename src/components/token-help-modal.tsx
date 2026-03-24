'use client'

import { useState, useEffect } from 'react'

export function TokenHelpModal() {
  const [isOpen, setIsOpen] = useState(false)

  const closeModal = () => {
    setIsOpen(false)
    setTimeout(() => {
      const el = document.getElementById('canvas_key')
      if (el) el.focus()
    }, 10)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium underline decoration-blue-200 hover:decoration-blue-600 transition-colors"
      >
        Where do I find this?
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 sm:py-12 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeModal}></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all flex flex-col max-h-full slide-in-from-bottom-4">
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Find Your API Token</h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-200 transition-colors" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto space-y-8 flex-1 customize-scrollbar">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</span>
                  <h4 className="font-semibold text-gray-900">Go to Account Settings</h4>
                </div>
                <p className="text-sm text-gray-600 ml-11 leading-relaxed">Log in to your Canvas account, click on <strong>Account</strong> in the left global sidebar, and select <strong>Settings</strong>.</p>
                <div className="ml-11 mt-2 bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-center space-x-3 shadow-inner">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">2</span>
                  <h4 className="font-semibold text-gray-900">Generate New Access Token</h4>
                </div>
                <p className="text-sm text-gray-600 ml-11 leading-relaxed">Scroll down to the <strong>Approved Integrations</strong> section and click the <strong>+ New Access Token</strong> button.</p>
                <div className="ml-11 mt-2 bg-gray-50 rounded-xl p-5 border border-gray-200 flex justify-center shadow-inner">
                  <div className="px-4 py-2 bg-blue-600 rounded-lg text-xs text-white font-medium flex items-center shadow-sm">
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    New Access Token
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">3</span>
                  <h4 className="font-semibold text-gray-900">Copy the Token String</h4>
                </div>
                <p className="text-sm text-gray-600 ml-11 leading-relaxed">Enter "Ask Canvas" as the purpose, click <strong>Generate</strong>, and copy the robust token string immediately. It will only be shown once.</p>
                <div className="ml-11 mt-2 bg-gray-900 rounded-xl p-4 border border-gray-800 shadow-md">
                  <div className="text-green-400 font-mono text-xs break-all selection:bg-green-400/30 line-clamp-2">7236~RzQhL3Mpx8... (Mock Example)</div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
               <button type="button" onClick={closeModal} className="order-2 sm:order-1 w-full sm:w-auto px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-sm text-sm active:scale-95">
                 I've got it
               </button>
               <a href="https://psu.instructure.com/profile/settings" target="_blank" rel="noreferrer" className="order-1 sm:order-2 w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md text-sm text-center flex items-center justify-center active:scale-95">
                 Open Canvas Settings
                 <svg className="w-4 h-4 ml-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
               </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
