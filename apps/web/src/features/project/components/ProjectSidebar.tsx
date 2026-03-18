'use client';

import { useState } from 'react';
import {
    LayoutDashboard,
    Box,
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
    MoreHorizontal,
    Package,
    DollarSign,
    Building,
    BarChart3,
    Layers,
    Calculator,
    Pin,
    PinOff,
} from 'lucide-react';
import type { Project } from '@/shared/types';
import { formatDate } from '@/shared/utils/index';

interface ProjectSidebarProps {
    isCollapsed: boolean;
    isPinned: boolean;
    onTogglePin: () => void;
    project: Project;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    canViewProcessLogic?: boolean;  // 시스템 관리자 또는 프로젝트 PM
}

interface MenuButtonProps {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
    isCollapsed: boolean;
    hasSubmenu?: boolean;
    isExpanded?: boolean;
}

function MenuButton({
    label,
    icon: Icon,
    isActive,
    onClick,
    isCollapsed,
    hasSubmenu = false,
    isExpanded = false,
}: MenuButtonProps) {
    return (
        <button
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`relative w-full flex items-center ${hasSubmenu && !isCollapsed ? 'justify-between' : ''} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? hasSubmenu
                        ? 'bg-[#ffff1d]/30 text-zinc-900 dark:bg-[#ffff1d]/40 dark:text-zinc-100'
                        : 'bg-[#ffff1d] text-zinc-900 dark:bg-[#ffff1d] dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            } ${isCollapsed && hasSubmenu ? 'pb-4' : ''}`}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? (hasSubmenu ? 'text-zinc-700 dark:text-zinc-100' : 'text-zinc-900') : 'text-zinc-400'}`} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {hasSubmenu && (
                isCollapsed ? (
                    <MoreHorizontal className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 text-zinc-400" />
                ) : isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                )
            )}
        </button>
    );
}

export function ProjectSidebar({
    isCollapsed,
    isPinned,
    onTogglePin,
    project,
    activeTab,
    onTabChange,
    onMouseEnter,
    onMouseLeave,
    canViewProcessLogic = false,
}: ProjectSidebarProps) {
    // 모든 서브메뉴를 디폴트로 펼친 상태로 설정
    const [isDataInputExpandedByUser, setIsDataInputExpandedByUser] = useState(true);
    const [isProcessPlanExpandedByUser, setIsProcessPlanExpandedByUser] = useState(true);

    const menuItems = [
        { id: 'overview', label: '개요', icon: LayoutDashboard },
        { id: 'process_plan', label: '공정계획', icon: ListTodo },
        { id: 'team', label: '팀', icon: Users },
        { id: 'documents', label: '문서', icon: FileText },
        { id: 'settings', label: '설정', icon: Settings },
    ];

    const dataInputSubItems = [
        { id: 'pouring_section_review', label: '타설구간검토', icon: Calculator },
        { id: 'data_input', label: '동 기본 정보', icon: Database },
        { id: 'quantity_input', label: '물량 입력', icon: Package },
        { id: 'detailed_quantity_input', label: '상세물량입력', icon: Package },
        { id: 'geological_data', label: '지질 데이터 입력', icon: Layers },
    ];

    const processPlanSubItems = [
        { id: 'process_logic', label: '공정로직', icon: Calculator, adminOnly: true },
        { id: 'basement_process_plan', label: '지하층 공정계획', icon: Building, adminOnly: false },
        { id: 'building_process_plan', label: '지상층 공정계획', icon: Building, adminOnly: false },
        { id: 'gantt_chart', label: '간트차트', icon: BarChart3, adminOnly: false },
    ];

    const isDataInputActive = activeTab === 'pouring_section_review' || activeTab === 'data_input' || activeTab === 'quantity_input' || activeTab === 'detailed_quantity_input' || activeTab === 'geological_data';
    const isProcessPlanActive = activeTab === 'process_logic' || activeTab === 'building_process_plan' || activeTab === 'basement_process_plan' || activeTab === 'gantt_chart';
    const isUnitRateActive = activeTab === 'planned_unit_rate' || activeTab === 'executed_unit_rate';
    const isDataInputExpanded = isDataInputActive || isDataInputExpandedByUser;
    const isProcessPlanExpanded = isProcessPlanActive || isProcessPlanExpandedByUser;

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`fixed inset-y-0 left-0 top-16 z-30 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out flex flex-col ${
                isCollapsed ? 'w-16' : 'w-54 shadow-xl'
            }`}
        >
            {/* Pin/Unpin Button - 상단 (펼쳐진 상태에서만 표시) */}
            {!isCollapsed && (
                <div className="p-3">
                    <button
                        onClick={onTogglePin}
                        title={isPinned ? '사이드바 고정 해제' : '사이드바 고정'}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isPinned
                                ? 'text-zinc-700 dark:text-zinc-200'
                                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                    >
                        {isPinned ? (
                            <>
                                <PinOff className="w-5 h-5" />
                                <span>고정 해제</span>
                            </>
                        ) : (
                            <>
                                <Pin className="w-5 h-5" />
                                <span>사이드바 고정</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                {/* Overview */}
                <MenuButton
                    label="개요"
                    icon={LayoutDashboard}
                    isActive={activeTab === 'overview'}
                    onClick={() => onTabChange('overview')}
                    isCollapsed={isCollapsed}
                />

                <MenuButton
                    label="IFC 뷰어"
                    icon={Box}
                    isActive={activeTab === 'ifc_viewer'}
                    onClick={() => onTabChange('ifc_viewer')}
                    isCollapsed={isCollapsed}
                />

                {/* 데이터 입력 확장 메뉴 */}
                <div className="space-y-1">
                    <MenuButton
                        label="데이터 입력"
                        icon={Database}
                        isActive={isDataInputActive}
                        onClick={() => setIsDataInputExpandedByUser(!isDataInputExpanded)}
                        isCollapsed={isCollapsed}
                        hasSubmenu={true}
                        isExpanded={isDataInputExpanded}
                    />

                    {/* 서브메뉴 - 접힌/펼친 상태 모두 아래로 펼쳐짐 */}
                    {isDataInputExpanded && (
                        <div className={`space-y-1 ${isCollapsed ? 'pl-1' : 'ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2'}`}>
                            {dataInputSubItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-[#ffff1d]/70 text-zinc-900 dark:bg-[#ffff1d]/80 dark:text-zinc-900'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-900' : 'text-zinc-400'}`} />
                                        {!isCollapsed && item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 공정계획 확장 메뉴 */}
                <div className="space-y-1">
                    <MenuButton
                        label="공정계획"
                        icon={ListTodo}
                        isActive={isProcessPlanActive}
                        onClick={() => setIsProcessPlanExpandedByUser(!isProcessPlanExpanded)}
                        isCollapsed={isCollapsed}
                        hasSubmenu={true}
                        isExpanded={isProcessPlanExpanded}
                    />

                    {/* 서브메뉴 - 접힌/펼친 상태 모두 아래로 펼쳐짐 */}
                    {isProcessPlanExpanded && (
                        <div className={`space-y-1 ${isCollapsed ? 'pl-1' : 'ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2'}`}>
                            {processPlanSubItems
                                .filter(item => !item.adminOnly || canViewProcessLogic)
                                .map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                const isRestrictedItem = item.adminOnly;  // PM/관리자 전용 메뉴
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onTabChange(item.id)}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? isRestrictedItem
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                                    : 'bg-[#ffff1d]/70 text-zinc-900 dark:bg-[#ffff1d]/80 dark:text-zinc-900'
                                                : isRestrictedItem
                                                    ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-700 dark:hover:text-orange-300'
                                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${
                                            isActive
                                                ? isRestrictedItem
                                                    ? 'text-orange-600 dark:text-orange-300'
                                                    : 'text-zinc-900 dark:text-zinc-900'
                                                : isRestrictedItem
                                                    ? 'text-orange-500 dark:text-orange-400'
                                                    : 'text-zinc-400'
                                        }`} />
                                        {!isCollapsed && item.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 단가 입력 메뉴 */}
                <MenuButton
                    label="단가 입력"
                    icon={DollarSign}
                    isActive={isUnitRateActive}
                    onClick={() => onTabChange('planned_unit_rate')}
                    isCollapsed={isCollapsed}
                />

                {/* 나머지 메뉴 아이템들 */}
                {menuItems.slice(2).map((item) => (
                    <MenuButton
                        key={item.id}
                        label={item.label}
                        icon={item.icon}
                        isActive={activeTab === item.id}
                        onClick={() => onTabChange(item.id)}
                        isCollapsed={isCollapsed}
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
