'use client'
import React from 'react'

interface Assignment {
    name: string
    dueAt: string
    courseName?: string
}

interface AssignmentTimelineProps {
    assignments: Assignment[]
}

export const AssignmentTimeline: React.FC<AssignmentTimelineProps> = ({ assignments }) => {
    return (
        <div className="w-full bg-gray-50 rounded-xl p-6 border border-gray-100 my-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Upcoming Timeline</h4>
            <div className="relative space-y-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
                {assignments.map((item, idx) => (
                    <div key={idx} className="relative pl-8">
                        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-4 border-blue-500 shadow-sm z-10"></div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-blue-600 mb-0.5">{new Date(item.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-sm font-bold text-gray-900 leading-tight">{item.name}</span>
                            {item.courseName && <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{item.courseName}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
