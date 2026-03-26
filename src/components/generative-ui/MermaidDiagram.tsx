'use client'
import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
        primaryColor: '#eff6ff',
        primaryTextColor: '#1e40af',
        primaryBorderColor: '#3b82f6',
        lineColor: '#94a3b8',
        secondaryColor: '#f8fafc',
        tertiaryColor: '#ffffff'
    }
})

interface MermaidDiagramProps {
    chart: string
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (ref.current && chart) {
            mermaid.contentLoaded()
        }
    }, [chart])

    return (
        <div className="w-full overflow-x-auto bg-white rounded-xl border border-gray-100 p-4 my-4 flex justify-center customize-scrollbar">
            <div ref={ref} className="mermaid">
                {chart}
            </div>
        </div>
    )
}
