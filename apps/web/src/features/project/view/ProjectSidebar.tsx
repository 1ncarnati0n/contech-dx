'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { getTabHref } from '@/app/(container)/projects/[id]/route-config';

interface ProjectSidebarProps {
    isCollapsed: boolean;
    isPinned: boolean;
    onTogglePin: () => void;
    project: Project;
    activeTab: string;
    projectId: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    canViewProcessLogic?: boolean;
}

interface MenuLinkProps {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    href: string;
    isCollapsed: boolean;
}

function MenuLink({ label, icon: Icon, isActive, href, isCollapsed }: MenuLinkProps) {
    return (
        <Link
            href={href}
            title={isCollapsed ? label : undefined}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? 'bg-[#ffff1d] text-zinc-900 dark:bg-[#ffff1d] dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            }`}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                {!isCollapsed && <span>{label}</span>}
            </div>
        </Link>
    );
}

interface MenuGroupButtonProps {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    onClick: () => void;
    isCollapsed: boolean;
    isExpanded: boolean;
}

function MenuGroupButton({ label, icon: Icon, isActive, onClick, isCollapsed, isExpanded }: MenuGroupButtonProps) {
    return (
        <button
            onClick={onClick}
            title={isCollapsed ? label : undefined}
            className={`relative w-full flex items-center ${!isCollapsed ? 'justify-between' : ''} gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? 'bg-[#ffff1d]/30 text-zinc-900 dark:bg-[#ffff1d]/40 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
            } ${isCollapsed ? 'pb-4' : ''}`}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-zinc-700 dark:text-zinc-100' : 'text-zinc-400'}`} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {isCollapsed ? (
                <MoreHorizontal className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 text-zinc-400" />
            ) : isExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
                <ChevronRight className="w-4 h-4 text-zinc-400" />
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
    projectId,
    onMouseEnter,
    onMouseLeave,
    canViewProcessLogic = false,
}: ProjectSidebarProps) {
    const [isDataInputExpandedByUser, setIsDataInputExpandedByUser] = useState(true);
    const [isProcessPlanExpandedByUser, setIsProcessPlanExpandedByUser] = useState(true);

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

    const isDataInputActive = ['pouring_section_review', 'data_input', 'quantity_input', 'detailed_quantity_input', 'geological_data'].includes(activeTab);
    const isProcessPlanActive = ['process_logic', 'building_process_plan', 'basement_process_plan', 'gantt_chart'].includes(activeTab);
    const isUnitRateActive = ['planned_unit_rate', 'executed_unit_rate'].includes(activeTab);
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
            {/* Pin/Unpin Button */}
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
                        {isPinned ? <><PinOff className="w-5 h-5" /><span>고정 해제</span></> : <><Pin className="w-5 h-5" /><span>사이드바 고정</span></>}
                    </button>
                </div>
            )}

            {/* Navigation */}
            <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
                <MenuLink label="개요" icon={LayoutDashboard} isActive={activeTab === 'overview'} href={getTabHref(projectId, 'overview')} isCollapsed={isCollapsed} />
                <MenuLink label="IFC 뷰어" icon={Box} isActive={activeTab === 'ifc_viewer'} href={getTabHref(projectId, 'ifc_viewer')} isCollapsed={isCollapsed} />

                {/* 데이터 입력 그룹 */}
                <div className="space-y-1">
                    <MenuGroupButton label="데이터 입력" icon={Database} isActive={isDataInputActive} onClick={() => setIsDataInputExpandedByUser(!isDataInputExpanded)} isCollapsed={isCollapsed} isExpanded={isDataInputExpanded} />
                    {isDataInputExpanded && (
                        <div className={`space-y-1 ${isCollapsed ? 'pl-1' : 'ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2'}`}>
                            {dataInputSubItems.map((item) => {
                                const isActive = activeTab === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        href={getTabHref(projectId, item.id)}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-[#ffff1d]/70 text-zinc-900 dark:bg-[#ffff1d]/80 dark:text-zinc-900'
                                                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-900' : 'text-zinc-400'}`} />
                                        {!isCollapsed && item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 공정계획 그룹 */}
                <div className="space-y-1">
                    <MenuGroupButton label="공정계획" icon={ListTodo} isActive={isProcessPlanActive} onClick={() => setIsProcessPlanExpandedByUser(!isProcessPlanExpanded)} isCollapsed={isCollapsed} isExpanded={isProcessPlanExpanded} />
                    {isProcessPlanExpanded && (
                        <div className={`space-y-1 ${isCollapsed ? 'pl-1' : 'ml-4 border-l border-zinc-200 dark:border-zinc-700 pl-2'}`}>
                            {processPlanSubItems
                                .filter(item => !item.adminOnly || canViewProcessLogic)
                                .map((item) => {
                                const isActive = activeTab === item.id;
                                const isRestrictedItem = item.adminOnly;
                                return (
                                    <Link
                                        key={item.id}
                                        href={getTabHref(projectId, item.id)}
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
                                        <item.icon className={`w-4 h-4 shrink-0 ${
                                            isActive
                                                ? isRestrictedItem ? 'text-orange-600 dark:text-orange-300' : 'text-zinc-900 dark:text-zinc-900'
                                                : isRestrictedItem ? 'text-orange-500 dark:text-orange-400' : 'text-zinc-400'
                                        }`} />
                                        {!isCollapsed && item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                <MenuLink label="단가 입력" icon={DollarSign} isActive={isUnitRateActive} href={getTabHref(projectId, 'planned_unit_rate')} isCollapsed={isCollapsed} />

                <MenuLink label="팀" icon={Users} isActive={activeTab === 'team'} href={getTabHref(projectId, 'team')} isCollapsed={isCollapsed} />
                <MenuLink label="문서" icon={FileText} isActive={activeTab === 'documents'} href={getTabHref(projectId, 'documents')} isCollapsed={isCollapsed} />
                <MenuLink label="설정" icon={Settings} isActive={activeTab === 'settings'} href={getTabHref(projectId, 'settings')} isCollapsed={isCollapsed} />
            </div>

            {/* Project Info Summary */}
            {!isCollapsed && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        프로젝트 정보
                    </h3>
                    <div className="space-y-3 text-xs">
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
