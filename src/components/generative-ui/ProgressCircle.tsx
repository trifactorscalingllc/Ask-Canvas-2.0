'use client';

import React from 'react';
import {
    RadialBarChart,
    RadialBar,
    Legend,
    Tooltip,
    ResponsiveContainer,
    PolarAngleAxis
} from 'recharts';

interface ProgressCircleProps {
    data: {
        name: string;
        value: number; // 0-100 percentage
        fill: string;
    }[];
    title?: string;
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({ data, title }) => {
    return (
        <div className="my-6 p-6 bg-[#0f172a]/50 border border-[#1e293b] rounded-2xl backdrop-blur-md shadow-2xl">
            {title && (
                <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-4 border-l-2 border-indigo-500 pl-3">
                    {title}
                </h3>
            )}
            <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="100%"
                        barSize={12}
                        data={data}
                        startAngle={180}
                        endAngle={-180}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                            background
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                color: '#f8fafc',
                            }}
                        />
                        <Legend
                            iconSize={10}
                            layout="vertical"
                            verticalAlign="middle"
                            wrapperStyle={{
                                top: '50%',
                                right: 0,
                                transform: 'translate(0, -50%)',
                                lineHeight: '24px',
                                fontSize: '12px',
                                color: '#fff'
                            }}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
