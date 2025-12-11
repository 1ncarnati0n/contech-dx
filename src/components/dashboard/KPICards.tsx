'use client';

import { Card } from '@/components/ui';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function KPICards() {
    // Mock Data
    const structuralProgress = 68; // %

    const planVsActualData = [
        { name: '형틀(갱폼)', plan: 20, actual: 22 },
        { name: '형틀(알폼)', plan: 30, actual: 28 },
        { name: '형틀(기타)', plan: 15, actual: 15 },
        { name: '철근공', plan: 40, actual: 45 },
        { name: '타설공', plan: 30, actual: 32 },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Card 1: Structural Progress */}
            <Card className="p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        골조 공사 진행률
                    </h3>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{structuralProgress}%</span>
                </div>
                <div className="space-y-2">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${structuralProgress}%` }}
                        />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-right">목표 대비 +2% 달성 중</p>
                </div>
            </Card>

            {/* Card 2: Plan vs Actual Chart */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">인원투입 계획,실행</h3>
                </div>
                <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={planVsActualData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: 'transparent' }}
                            />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                            <Bar dataKey="plan" name="계획" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={12} />
                            <Bar dataKey="actual" name="실적" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
