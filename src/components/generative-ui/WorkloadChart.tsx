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

interface WorkloadDataEntry {
    date: string;
    points: number;
    assignments: number;
}

interface WorkloadChartProps {
    data: any; // Context data from get_full_academic_context
}

export function WorkloadChart({ data }: WorkloadChartProps) {
    // ── Data Processing ────────────────────────────────────────────────────────
    // Flatten all assignments and group by date
    const processedData: WorkloadDataEntry[] = React.useMemo(() => {
        if (!data?.courses) return [];

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
    }, [data]);

    if (processedData.length === 0) {
        return (
            <div className="my-6 p-8 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                <p className="text-sm font-medium text-gray-500">No major workload peaks detected in the next 14 days. 🏖️</p>
            </div>
        );
    }

    return (
        <div className="my-8 p-6 bg-white dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Workload Forecast</h3>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Upcoming Performance Peaks</p>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Total Points: {processedData.reduce((acc, curr) => acc + curr.points, 0)}</span>
                </div>
            </div>

            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '12px',
                            }}
                            labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1f2937' }}
                        />
                        <Bar
                            dataKey="points"
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                        >
                            {processedData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.points > 100 ? '#6366f1' : '#818cf8'}
                                    fillOpacity={0.85}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-[10px] text-gray-500 font-medium">High Point Weight</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-300" />
                    <span className="text-[10px] text-gray-500 font-medium">Standard Task</span>
                </div>
            </div>
        </div>
    );
}
