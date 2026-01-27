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
    Briefcase,
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
} from 'lucide-react';
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
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {hasSubmenu && !isCollapsed && (
                isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                )
            )}
        </button>
    );

    return (
        <div
            className={`fixed inset-y-0 left-0 top-16 z-30 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out flex flex-col ${
                isCollapsed ? 'w-16' : 'w-72 shadow-xl'
            }`}
        >
            {/* Toggle Button - 상단 */}
            <div className={`${isCollapsed ? 'p-2' : 'p-3'}`}>
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
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
                        <div className="ml-4 space-y-1 border-l border-zinc-200 dark:border-zinc-700 pl-2">
                            {dataInputSubItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
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
                        <div className="ml-4 space-y-1 border-l border-zinc-200 dark:border-zinc-700 pl-2">
                            {processPlanSubItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
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
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        프로젝트 정보
                    </h3>
                    <div className="space-y-3 text-xs">
                        {/* 프로젝트 이름 */}
                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-400" />
                            <span className="font-medium truncate">{project.name}</span>
                        </div>
                        {project.location && (
                            <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
                                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span className="break-words">{project.location}</span>
                            </div>
                        )}
                        {project.client && (
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{project.client}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatDate(project.start_date, 'long')} 시작</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
