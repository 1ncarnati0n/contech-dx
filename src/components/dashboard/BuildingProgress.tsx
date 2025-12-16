'use client';

import { Card } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

export function BuildingProgress() {
    const buildings = Array.from({ length: 7 }, (_, i) => `${101 + i}동`); // 101~107동
    const floors = Array.from({ length: 20 }, (_, i) => 20 - i); // 20F to 1F

    // Mock Data Generation
    const getFloorStatus = (building: string, floor: number) => {
        // Simulate different progress for different buildings
        const buildingNum = parseInt(building.replace('동', ''));
        let currentFloor = 0;

        // Generate varied progress based on building number
        if (buildingNum === 101) currentFloor = 6;
        else if (buildingNum === 102) currentFloor = 15;
        else if (buildingNum === 103) currentFloor = 8;
        else if (buildingNum === 104) currentFloor = 10;
        else if (buildingNum === 105) currentFloor = 18;
        else if (buildingNum === 106) currentFloor = 12;
        else if (buildingNum === 107) currentFloor = 4;

        if (floor < currentFloor) return { status: 'completed', label: '완료' };
        if (floor === currentFloor) return { status: 'in-progress', label: '진행중' };
        return { status: 'not-started', label: '미착수' };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-blue-500 hover:bg-blue-600';
            case 'in-progress': return 'bg-emerald-500 hover:bg-emerald-600 animate-pulse';
            default: return 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700';
        }
    };

    return (
        <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">전체 동 상세 진행률</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">전체 동의 층별 공사 현황을 한눈에 확인하세요.</p>
                </div>

                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span className="text-slate-600 dark:text-slate-400">완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span className="text-slate-600 dark:text-slate-400">진행중</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                        <span className="text-slate-600 dark:text-slate-400">미착수</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Header Row */}
                    <div className="flex mb-2">
                        <div className="w-12 shrink-0" /> {/* Y-axis label spacer */}
                        {buildings.map((building) => (
                            <div key={building} className="flex-1 text-center font-medium text-slate-700 dark:text-slate-300 text-sm">
                                {building}
                            </div>
                        ))}
                    </div>

                    {/* Grid Rows */}
                    <div className="space-y-1">
                        {floors.map((floor) => (
                            <div key={floor} className="flex items-center gap-1">
                                {/* Y-axis Label */}
                                <div className="w-12 shrink-0 text-right pr-3 text-xs text-slate-500 font-mono">
                                    {floor}F
                                </div>

                                {/* Cells */}
                                {buildings.map((building) => {
                                    const { status, label } = getFloorStatus(building, floor);
                                    return (
                                        <TooltipProvider key={`${building}-${floor}`}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={`flex-1 h-6 rounded-sm transition-colors cursor-pointer ${getStatusColor(status)}`}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-semibold">{building} {floor}층</p>
                                                    <p className="text-xs">{label}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
