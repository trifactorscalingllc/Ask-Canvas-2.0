'use client'

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

// Initialize mermaid
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'inherit',
  })
}

/**
 * MermaidVisual renders a mermaid diagram from a code string.
 */
export function MermaidVisual({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function render() {
      if (!containerRef.current || !chart) return
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
        setError(null)
      } catch (err: any) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram. Check mermaid syntax.')
      }
    }
    render()
  }, [chart])

  if (error) return <div className="text-xs text-red-400 bg-red-950/20 p-2 rounded">{error}</div>

  return (
    <div 
      className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 my-4 flex justify-center animate-in fade-in zoom-in duration-300 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/**
 * FileEmbed renders a PDF or Google Slide iframe.
 */
export function FileEmbed({ url, title, type = 'pdf' }: { url: string; title?: string; type?: 'pdf' | 'slides' | 'doc' }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full mt-6 mb-2">
      {/* Divider Line */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">Attached {type}</span>
        <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className={`border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-md transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'relative h-[450px] w-full'}`}>
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter truncate pr-4">{title || 'Document View'}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 transition-all shadow-sm active:scale-95"
            >
              {isExpanded ? 'Minimize' : 'Expand View'}
            </button>
            <a 
              href={url} 
              target="_blank" 
              className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-all shadow-sm active:scale-95"
            >
              Open Original
            </a>
          </div>
        </div>
        <iframe 
          src={url} 
          className="w-full h-full border-none bg-gray-100 dark:bg-gray-900"
          title={title || 'File Viewer'}
        />
      </div>
    </div>
  )
}
