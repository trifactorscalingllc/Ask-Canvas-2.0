'use client';

import React from 'react';
import { Calendar, AlertCircle, TrendingUp, Clock } from 'lucide-react';

interface TriageBoardProps {
    data: any; // Context data from get_full_academic_context
}

export function TriageBoard({ data }: TriageBoardProps) {
    const urgentAssignments = React.useMemo(() => {
        if (!data?.courses) return [];

        const all = data.courses.flatMap((course: any) =>
            (course.assignments || []).map((a: any) => ({
                ...a,
                courseName: course.name
            }))
        );

        // Sort by due date (upcoming first) and filter out past ones
        const now = new Date();
        return all
            .filter((a: any) => a.dueAt && new Date(a.dueAt) > now)
            .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
            .slice(0, 3);
    }, [data]);

    if (urgentAssignments.length === 0) {
        return (
            <div className="my-6 p-8 bg-green-50/50 dark:bg-green-900/10 rounded-3xl border border-dashed border-green-200 dark:border-green-800 text-center">
                <p className="text-sm font-medium text-green-600 dark:text-green-400 italic">"Inbox Zero" – You're all caught up! 🌴</p>
            </div>
        );
    }

    return (
        <div className="my-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Urgent Priorities
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Focus your academic kinetic energy here.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {urgentAssignments.map((assignment: any, idx: number) => {
                    const dueDate = new Date(assignment.dueAt);
                    const timeDiff = dueDate.getTime() - new Date().getTime();
                    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

                    return (
                        <div
                            key={idx}
                            className="group bg-white dark:bg-gray-900/60 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <TrendingUp className="w-12 h-12 text-indigo-500" />
                            </div>

                            <div className="flex flex-col h-full space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter opacity-70">
                                        {assignment.courseName}
                                    </span>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug">
                                        {assignment.name}
                                    </h4>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className={daysLeft <= 2 ? "text-red-500 font-bold" : ""}>
                                            {daysLeft === 0 ? "Due Today" : `${daysLeft} days left`}
                                        </span>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                        <div className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                            {assignment.pointsPossible || 0} PTS
                                        </div>
                                        {daysLeft <= 3 && (
                                            <div className="animate-pulse bg-red-100 dark:bg-red-900/20 px-2 py-0.5 rounded text-[8px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">
                                                Hot
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
