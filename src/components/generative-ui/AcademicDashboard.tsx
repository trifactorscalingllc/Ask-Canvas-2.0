'use client';

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface Assignment {
    name: string;
    dueAt: string;
    pointsPossible: number;
    courseName?: string;
}

interface DashboardData {
    courses: { name: string; score?: string }[];
    recentAssignments: Assignment[];
    upcomingAssignments: Assignment[];
}

interface AcademicDashboardProps {
    data: DashboardData;
}

export const AcademicDashboard: React.FC<AcademicDashboardProps> = ({ data }) => {
    const chartData = data.upcomingAssignments.slice(0, 6).map(a => ({
        name: a.name.length > 15 ? a.name.slice(0, 12) + '...' : a.name,
        points: a.pointsPossible || 0,
        fullName: a.name
    }));

    return (
        <div className="my-8 w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Interactive Bar Chart: High-Priority Tasks */}
            <div className="bg-white dark:bg-[#0f172a]/80 backdrop-blur-xl border border-gray-100 dark:border-[#1e293b] rounded-3xl p-8 shadow-2xl shadow-blue-500/5">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Impact Analysis</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Point distributions of upcoming assignments</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-800">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Next 7 Days</span>
                    </div>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '16px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Bar
                                dataKey="points"
                                fill="url(#barGradient)"
                                radius={[8, 8, 0, 0]}
                                animationDuration={1500}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Horizontal Scrollable Timeline */}
            <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">Upcoming Milestones</h4>
                <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide snap-x">
                    {data.upcomingAssignments.map((a, idx) => (
                        <div
                            key={idx}
                            className="flex-shrink-0 w-64 snap-start bg-white dark:bg-[#1e293b]/50 border border-gray-100 dark:border-[#334155] rounded-2xl p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 group shadow-lg shadow-gray-200/20 dark:shadow-none"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse"></div>
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{new Date(a.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-blue-500 transition-colors">{a.name}</h5>
                            {a.courseName && <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate mb-3">{a.courseName}</p>}
                            <div className="pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                                <span className="text-xs font-black text-gray-900 dark:text-gray-200">{a.pointsPossible} <span className="text-[8px] text-gray-400 uppercase tracking-tighter ml-0.5">pts</span></span>
                                <div className="w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                                    <svg className="w-3 h-3 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
