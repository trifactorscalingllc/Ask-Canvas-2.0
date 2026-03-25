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
    let isMounted = true;
    async function render() {
      if (!chart || chart.trim().length === 0) return
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        // Pre-initialize ensure theme is correct
        mermaid.initialize({ theme: 'dark', securityLevel: 'loose' })
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (isMounted) {
          setSvg(renderedSvg)
          setError(null)
        }
      } catch (err: any) {
        console.error('Mermaid rendering error:', err)
        if (isMounted) setError('Failed to render diagram. Syntax might be incomplete.')
      }
    }
    render()
    return () => { isMounted = false; }
  }, [chart])

  if (error) return <div className="text-xs text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-900/50 my-2">{error}</div>
  if (!svg && !error) return <div className="p-8 bg-gray-900/10 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 animate-pulse" />

  return (
    <div className="w-full my-6 flex flex-col items-center gap-2">
      <div 
        className="w-full bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex justify-center animate-in fade-in zoom-in duration-500 overflow-x-auto min-h-[100px]"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interactive Study Model</span>
    </div>
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
