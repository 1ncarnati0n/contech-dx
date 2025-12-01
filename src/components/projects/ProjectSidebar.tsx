'use client';

import {
    LayoutDashboard,
    ListTodo,
    Users,
    FileText,
    Settings,
    MapPin,
    Building2,
    Calendar,
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
    const menuItems = [
        { id: 'overview', label: '개요', icon: LayoutDashboard },
        { id: 'tasks', label: '작업', icon: ListTodo },
        { id: 'team', label: '팀', icon: Users },
        { id: 'documents', label: '문서', icon: FileText },
        { id: 'settings', label: '설정', icon: Settings },
    ];

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
                className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col pt-16`} // pt-16 to account for top navbar
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
                    {menuItems.map((item) => {
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
