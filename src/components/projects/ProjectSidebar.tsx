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
    Layers,
    Calculator,
    PanelLeftClose,
    PanelLeft,
    ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/lib/types';
import { formatDate } from '@/lib/utils/index';

interface ProjectSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    project: Project;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function ProjectSidebar({
    isCollapsed,
    onToggleCollapse,
    project,
    activeTab,
    onTabChange,
}: ProjectSidebarProps) {
    const [isDataInputExpanded, setIsDataInputExpanded] = useState(
        activeTab === 'pouring_section_review' || activeTab === 'data_input' || activeTab === 'quantity_input' || activeTab === 'detailed_quantity_input' || activeTab === 'geological_data'
    );
    const [isProcessPlanExpanded, setIsProcessPlanExpanded] = useState(
        activeTab === 'basement_process_plan' || activeTab === 'building_process_plan' || activeTab === 'gantt_chart'
    );

    const menuItems = [
        { id: 'overview', label: '개요', icon: LayoutDashboard },
        { id: 'process_plan', label: '공정계획', icon: ListTodo },
        { id: 'team', label: '팀', icon: Users },
        { id: 'documents', label: '문서', icon: FileText },
        { id: 'settings', label: '설정', icon: Settings },
    ];

    const dataInputSubItems = [
        { id: 'pouring_section_review', label: '타설구간 개략검토', icon: Calculator },
        { id: 'data_input', label: '동 기본 정보', icon: Database },
        { id: 'quantity_input', label: '물량 입력', icon: Package },
        { id: 'detailed_quantity_input', label: '상세물량입력', icon: Package },
        { id: 'geological_data', label: '지질 데이터 입력', icon: Layers },
    ];

    const processPlanSubItems = [
        { id: 'building_process_plan', label: '동별 공정계획', icon: Building },
        { id: 'basement_process_plan', label: '지하층 공정계획', icon: Building },
        { id: 'gantt_chart', label: '간트차트', icon: BarChart3 },
    ];

    const isDataInputActive = activeTab === 'pouring_section_review' || activeTab === 'data_input' || activeTab === 'quantity_input' || activeTab === 'detailed_quantity_input' || activeTab === 'geological_data';
    const isProcessPlanActive = activeTab === 'building_process_plan' || activeTab === 'basement_process_plan' || activeTab === 'gantt_chart';
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

    // 접힌 상태에서는 서브메뉴 확장 해제
    useEffect(() => {
        if (isCollapsed) {
            setIsDataInputExpanded(false);
            setIsProcessPlanExpanded(false);
        }
    }, [isCollapsed]);

    // 메뉴 버튼 공통 컴포넌트
    const MenuButton = ({
        id,
        label,
        icon: Icon,
        isActive,
        onClick,
        hasSubmenu = false,
        isExpanded = false,
    }: {
        id: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        isActive: boolean;
        onClick: () => void;
        hasSubmenu?: boolean;
        isExpanded?: boolean;
    }) => (
        <button
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`w-full flex items-center ${hasSubmenu ? 'justify-between' : ''} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {hasSubmenu && !isCollapsed && (
                isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                )
            )}
        </button>
    );

    return (
        <div
            className={`fixed inset-y-0 left-0 top-16 z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col ${
                isCollapsed ? 'w-16' : 'w-72'
            }`}
        >
            {/* Header with back button and project name */}
            <div className={`border-b border-slate-200 dark:border-slate-800 ${isCollapsed ? 'p-2' : 'p-4'}`}>
                {isCollapsed ? (
                    <Link
                        href="/projects"
                        title="프로젝트 목록"
                        className="flex items-center justify-center w-full h-10 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link
                            href="/projects"
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {project.name}
                        </h2>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                {/* Overview */}
                <MenuButton
                    id="overview"
                    label="개요"
                    icon={LayoutDashboard}
                    isActive={activeTab === 'overview'}
                    onClick={() => onTabChange('overview')}
                />

                {/* 데이터 입력 확장 메뉴 */}
                <div className="space-y-1">
                    <MenuButton
                        id="data_input_group"
                        label="데이터 입력"
                        icon={Database}
                        isActive={isDataInputActive}
                        onClick={() => {
                            if (isCollapsed) {
                                onTabChange('data_input');
                            } else {
                                setIsDataInputExpanded(!isDataInputExpanded);
                            }
                        }}
                        hasSubmenu={!isCollapsed}
                        isExpanded={isDataInputExpanded}
                    />

                    {/* 서브메뉴 */}
                    {isDataInputExpanded && !isCollapsed && (
                        <div className="ml-4 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                            {dataInputSubItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
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
                    <MenuButton
                        id="process_plan_group"
                        label="공정계획"
                        icon={ListTodo}
                        isActive={isProcessPlanActive}
                        onClick={() => {
                            if (isCollapsed) {
                                onTabChange('building_process_plan');
                            } else {
                                setIsProcessPlanExpanded(!isProcessPlanExpanded);
                            }
                        }}
                        hasSubmenu={!isCollapsed}
                        isExpanded={isProcessPlanExpanded}
                    />

                    {/* 서브메뉴 */}
                    {isProcessPlanExpanded && !isCollapsed && (
                        <div className="ml-4 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                            {processPlanSubItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
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
                <MenuButton
                    id="planned_unit_rate"
                    label="단가 입력"
                    icon={DollarSign}
                    isActive={isUnitRateActive}
                    onClick={() => onTabChange('planned_unit_rate')}
                />

                {/* 나머지 메뉴 아이템들 */}
                {menuItems.slice(2).map((item) => (
                    <MenuButton
                        key={item.id}
                        id={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activeTab === item.id}
                        onClick={() => onTabChange(item.id)}
                    />
                ))}
            </div>

            {/* Project Info Summary - only when expanded */}
            {!isCollapsed && (
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
            )}

            {/* Toggle Button */}
            <div className={`border-t border-slate-200 dark:border-slate-800 ${isCollapsed ? 'p-2' : 'p-3'}`}>
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        isCollapsed ? 'justify-center' : ''
                    }`}
                >
                    {isCollapsed ? (
                        <PanelLeft className="w-5 h-5" />
                    ) : (
                        <>
                            <PanelLeftClose className="w-5 h-5" />
                            <span>사이드바 접기</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
