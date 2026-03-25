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

  // For Google Slides/Docs, we might need to modify the URL to /embed or similar if possible.
  // For PDFs, we can use an iframe for direct URL or a specialized viewer.
  
  const embedUrl = type === 'pdf' ? url : url // Needs logic for google/canvas specific embedding

  return (
    <div className={`my-4 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : 'relative h-96 w-full'}`}>
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{type} Viewer: {title || 'Document'}</span>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
        >
          {isExpanded ? 'Exit Fullscreen' : 'Expand'}
        </button>
      </div>
      <iframe 
        src={embedUrl} 
        className="w-full h-full border-none"
        title={title || 'File Viewer'}
      />
    </div>
  )
}
