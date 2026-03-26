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
    Cell,
} from 'recharts';
import { Calendar, AlertCircle, TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

type ViewType = 'workload_chart' | 'triage_cards' | 'timeline_list';

interface SmartViewProps {
    viewType: ViewType;
    data: any; // Context data from get_full_academic_context
}

export function SmartView({ viewType, data }: SmartViewProps) {
    if (!data?.courses) {
        return (
            <div className="my-6 p-8 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                <p className="text-sm font-medium text-gray-500">No academic data available to visualize. 📚</p>
            </div>
        );
    }

    // ── View 1: Gradient Workload Chart ───────────────────────────────────────
    if (viewType === 'workload_chart') {
        const processedData = (() => {
            const dateMap: Record<string, { points: number; count: number }> = {};
            const now = new Date();
            const twoWeeksOut = new Date();
            twoWeeksOut.setDate(now.getDate() + 14);

            data.courses.forEach((course: any) => {
                course.assignments?.forEach((assignment: any) => {
                    if (!assignment.dueAt) return;
                    const dueDate = new Date(assignment.dueAt);
                    if (dueDate < now || dueDate > twoWeeksOut) return;

                    const dateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!dateMap[dateStr]) dateMap[dateStr] = { points: 0, count: 0 };
                    dateMap[dateStr].points += assignment.pointsPossible || 0;
                    dateMap[dateStr].count += 1;
                });
            });

            return Object.entries(dateMap)
                .map(([date, stats]) => ({
                    date,
                    points: stats.points,
                    assignments: stats.count,
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        })();

        if (processedData.length === 0) {
            return (
                <div className="my-6 p-8 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                    <p className="text-sm font-medium text-gray-500">Your upcoming 14 days are clear! 🌴</p>
                </div>
            );
        }

        return (
            <div className="my-8 p-6 bg-white dark:bg-gray-900 font-sans rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            Workload Forecast
                        </h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Upcoming Performance Pressure</p>
                    </div>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200, 200, 200, 0.1)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#111827',
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                                    padding: '12px',
                                    color: '#fff'
                                }}
                            />
                            <Bar
                                dataKey="points"
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    // ── View 2: Urgency Triage Cards ──────────────────────────────────────────
    if (viewType === 'triage_cards') {
        const urgentItems = (() => {
            const all = data.courses.flatMap((course: any) =>
                (course.assignments || []).map((a: any) => ({
                    ...a,
                    courseName: course.name
                }))
            );
            const now = new Date();
            return all
                .filter((a: any) => a.dueAt && new Date(a.dueAt) > now)
                .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                .slice(0, 3);
        })();

        if (urgentItems.length === 0) return null;

        return (
            <div className="my-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Immediate Triage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {urgentItems.map((item: any, idx: number) => {
                        const dueDate = new Date(item.dueAt);
                        const hoursLeft = (dueDate.getTime() - Date.now()) / (1000 * 3600);
                        const borderColor = hoursLeft < 24 ? 'border-t-red-500' : hoursLeft < 48 ? 'border-t-yellow-500' : 'border-t-green-500';

                        return (
                            <div key={idx} className={`bg-white dark:bg-gray-900 border-t-4 ${borderColor} rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
                                <p className="text-[9px] font-bold text-gray-400 mb-2 truncate">{item.courseName}</p>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 line-clamp-2 leading-tight">{item.name}</h4>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        {Math.ceil(hoursLeft / 24)}d left
                                    </div>
                                    <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black text-gray-500">
                                        {item.pointsPossible} PTS
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── View 3: Vertical Timeline List ────────────────────────────────────────
    if (viewType === 'timeline_list') {
        const timelineItems = (() => {
            const all = data.courses.flatMap((course: any) =>
                (course.assignments || []).map((a: any) => ({
                    ...a,
                    courseName: course.name
                }))
            );
            const now = new Date();
            return all
                .filter((a: any) => a.dueAt && new Date(a.dueAt) > now)
                .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
                .slice(0, 15);
        })();

        if (timelineItems.length === 0) return null;

        return (
            <div className="my-10 animate-in fade-in slide-in-from-bottom-4 duration-600">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Academic Timeline</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Sequential Task Stream</p>
                    </div>
                </div>

                <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-transparent">
                    {timelineItems.map((item: any, idx: number) => {
                        const isToday = new Date(item.dueAt).toDateString() === new Date().toDateString();

                        return (
                            <div key={idx} className="relative group">
                                {/* Node Dot */}
                                <div className={`absolute -left-[24px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 bg-indigo-500 shadow-sm z-10 transition-transform group-hover:scale-125 ${isToday ? 'animate-bounce' : ''}`} />

                                <div className="bg-white dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md hover:translate-x-1 group-hover:border-indigo-500/30 flex items-center justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-indigo-500/80">{item.courseName}</span>
                                            <span className="text-[10px] text-gray-400">•</span>
                                            <span className="text-[10px] text-gray-500">{new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-4">{item.name}</h4>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
}
