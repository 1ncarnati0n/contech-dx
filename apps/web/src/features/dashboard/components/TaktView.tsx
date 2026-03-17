'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { Filter, MoreHorizontal } from 'lucide-react';

interface TaskItem {
    id: string;
    building: string;
    floor: string;
    task: string;
}

export function TaktView() {
    const [filter, setFilter] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Mock Data
    const allTasks: TaskItem[] = [
        { id: '1', building: '101동', floor: '7층', task: '거푸집 설치' },
        { id: '2', building: '102동', floor: '3층', task: '철근 배근' },
        { id: '3', building: '103동', floor: '10층', task: '콘크리트 타설' },
        { id: '4', building: '101동', floor: '6층', task: '양생' },
        { id: '5', building: '104동', floor: '지하 1층', task: '콘크리트 타설' },
        { id: '6', building: '102동', floor: '5층', task: '거푸집 해체' },
        { id: '7', building: '105동', floor: '2층', task: '철근 배근' },
    ];

    // 필터링된 작업 목록
    const filteredTasks = filter === 'all'
        ? allTasks
        : allTasks.filter(task => task.building === filter);

    // 건물 목록 추출
    const buildings = Array.from(new Set(allTasks.map(task => task.building))).sort();

    const handleFilterClick = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleBuildingFilter = (building: string) => {
        setFilter(building);
        setIsFilterOpen(false);
    };

    const clearFilter = () => {
        setFilter('all');
        setIsFilterOpen(false);
    };

    return (
        <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">동별 진행상황</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">실시간 현장 작업 현황입니다.</p>
                </div>
                <div className="relative">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleFilterClick}
                    >
                        <Filter className="w-4 h-4" />
                        필터
                        {filter !== 'all' && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded dark:bg-blue-900/30 dark:text-blue-400">
                                {filter}
                            </span>
                        )}
                    </Button>

                    {/* Filter Dropdown */}
                    {isFilterOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                            <div className="p-2">
                                <button
                                    onClick={clearFilter}
                                    className={`w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-sm ${filter === 'all' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    전체 보기
                                </button>
                                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                                {buildings.map((building) => (
                                    <button
                                        key={building}
                                        onClick={() => handleBuildingFilter(building)}
                                        className={`w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-sm ${filter === building ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                                            }`}
                                    >
                                        {building}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">동 (Building)</th>
                            <th className="px-4 py-3">층 (Floor)</th>
                            <th className="px-4 py-3">작업 내용 (Task)</th>
                            <th className="px-4 py-3 rounded-r-lg text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTasks.map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{task.building}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{task.floor}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{task.task}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        필터링된 작업이 없습니다.
                    </div>
                )}
            </div>
        </Card>
    );
}
