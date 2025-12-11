'use client';

import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    ListTodo,
    Users,
    FileText,
    Settings,
    MapPin,
    Building2,
    Calendar,
    Database,
    ChevronDown,
    ChevronRight,
    Package,
    DollarSign,
    Building,
    BarChart3,
} from 'lucide-react';
import type { Project } from '@/lib/types';
import { formatDate, getStatusLabel, getStatusColors } from '@/lib/utils/index';

interface ProjectSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function ProjectSidebar({
    isOpen,
    onClose,
    project,
    activeTab,
    onTabChange,
}: ProjectSidebarProps) {
    const [isDataInputExpanded, setIsDataInputExpanded] = useState(
        activeTab === 'data_input' || activeTab === 'quantity_input'
    );
    const [isProcessPlanExpanded, setIsProcessPlanExpanded] = useState(
        activeTab === 'building_process_plan' || activeTab === 'gantt_chart'
    );

    const menuItems = [
        { id: 'overview', label: '개요', icon: LayoutDashboard },
        { id: 'process_plan', label: '공정계획', icon: ListTodo },
        { id: 'team', label: '팀', icon: Users },
        { id: 'documents', label: '문서', icon: FileText },
        { id: 'settings', label: '설정', icon: Settings },
    ];

    const dataInputSubItems = [
        { id: 'data_input', label: '동 기본 정보', icon: Database },
        { id: 'quantity_input', label: '물량 입력', icon: Package },
    ];

    const processPlanSubItems = [
        { id: 'building_process_plan', label: '동별 공정계획', icon: Building },
        { id: 'gantt_chart', label: '간트차트', icon: BarChart3 },
    ];

    const isDataInputActive = activeTab === 'data_input' || activeTab === 'quantity_input';
    const isProcessPlanActive = activeTab === 'building_process_plan' || activeTab === 'gantt_chart';
    const isUnitRateActive = activeTab === 'planned_unit_rate' || activeTab === 'executed_unit_rate';

    // activeTab이 변경될 때 확장 상태 업데이트
    useEffect(() => {
        if (isDataInputActive && !isDataInputExpanded) {
            setIsDataInputExpanded(true);
        }
        if (isProcessPlanActive && !isProcessPlanExpanded) {
            setIsProcessPlanExpanded(true);
        }
    }, [activeTab, isDataInputActive, isDataInputExpanded, isProcessPlanActive, isProcessPlanExpanded]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/20 z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`absolute inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col`}
            >
                {/* Project Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2">
                        {project.name}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColors(project.status)}`}>
                            {getStatusLabel(project.status)}
                        </span>
                        <span>#{project.project_number}</span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {/* Overview */}
                    <button
                        onClick={() => onTabChange('overview')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview'
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                        개요
                    </button>

                    {/* 데이터 입력 확장 메뉴 */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsDataInputExpanded(!isDataInputExpanded)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDataInputActive
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Database className={`w-4 h-4 ${isDataInputActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                데이터 입력
                            </div>
                            {isDataInputExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {/* 서브메뉴 */}
                        {isDataInputExpanded && (
                            <div className="ml-4 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                {dataInputSubItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onTabChange(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 공정계획 확장 메뉴 */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsProcessPlanExpanded(!isProcessPlanExpanded)}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isProcessPlanActive
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <ListTodo className={`w-4 h-4 ${isProcessPlanActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                공정계획
                            </div>
                            {isProcessPlanExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                        </button>

                        {/* 서브메뉴 */}
                        {isProcessPlanExpanded && (
                            <div className="ml-4 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                                {processPlanSubItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onTabChange(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 단가 입력 메뉴 */}
                    <button
                        onClick={() => onTabChange('planned_unit_rate')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isUnitRateActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        <DollarSign className={`w-4 h-4 ${isUnitRateActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                        단가 입력
                    </button>

                    {/* 나머지 메뉴 아이템들 */}
                    {menuItems.slice(2).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Project Info Summary */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        프로젝트 정보
                    </h3>
                    <div className="space-y-3 text-xs">
                        {project.location && (
                            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="break-words">{project.location}</span>
                            </div>
                        )}
                        {project.client && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{project.client}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatDate(project.start_date, 'long')} 시작</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
