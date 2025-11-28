'use client';

import { Card, CardContent, Button } from '@/components/ui';
import {
    LayoutDashboard,
    FolderKanban,
    FileText,
    AlertCircle,
    TrendingUp,
    Clock,
    Plus,
    Search,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
    const stats = [
        {
            label: '진행중인 프로젝트',
            value: '12',
            icon: FolderKanban,
            trend: '+2',
            trendUp: true,
            color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
        },
        {
            label: '이번 주 할 일',
            value: '24',
            icon: LayoutDashboard,
            trend: '-5',
            trendUp: false,
            color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        },
        {
            label: '검토 대기 문서',
            value: '8',
            icon: FileText,
            trend: '+3',
            trendUp: true,
            color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
        },
        {
            label: '안전 이슈',
            value: '3',
            icon: AlertCircle,
            trend: '-1',
            trendUp: true, // 이슈 감소는 좋은 것
            color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
        },
    ];

    const recentActivities = [
        {
            id: 1,
            project: '강남 업무지구 개발',
            action: '주간 공정 보고서 승인',
            user: '김현장 소장',
            time: '2시간 전',
            status: 'success'
        },
        {
            id: 2,
            project: '판교 데이터센터 건립',
            action: '안전 이슈 등록',
            user: '이안전 관리자',
            time: '4시간 전',
            status: 'warning'
        },
        {
            id: 3,
            project: '성수동 지식산업센터',
            action: '설계 변경 요청',
            user: '박설계 팀장',
            time: '5시간 전',
            status: 'info'
        },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary-950 dark:text-primary-50">
                        대시보드
                    </h1>
                    <p className="text-primary-500 dark:text-primary-400 mt-1">
                        프로젝트 현황과 주요 지표를 한눈에 확인하세요.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link href="/file-search">
                            <Search className="w-4 h-4" />
                            문서 검색
                        </Link>
                    </Button>
                    <Button variant="primary" size="sm" className="gap-2" asChild>
                        <Link href="/projects/new">
                            <Plus className="w-4 h-4" />
                            새 프로젝트
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <Card key={index} hover className="border-l-4 border-l-transparent hover:border-l-primary-900 dark:hover:border-l-primary-100 transition-all">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-primary-500 dark:text-primary-400">
                                        {stat.label}
                                    </p>
                                    <h3 className="text-2xl font-bold mt-2 text-primary-950 dark:text-primary-50">
                                        {stat.value}
                                    </h3>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm">
                                <span className={stat.trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary-500'}>
                                    {stat.trend}
                                </span>
                                <span className="text-primary-400 ml-2">지난달 대비</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-primary-950 dark:text-primary-50 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary-500" />
                            최근 활동
                        </h2>
                        <Button variant="ghost" size="sm" className="text-primary-500" asChild>
                            <Link href="/activity">전체보기</Link>
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {recentActivities.map((activity) => (
                            <Card key={activity.id} hover className="group">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-emerald-500' :
                                            activity.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
                                            {activity.action}
                                        </p>
                                        <p className="text-xs text-primary-500 mt-0.5 truncate">
                                            {activity.project} • {activity.user}
                                        </p>
                                    </div>
                                    <span className="text-xs text-primary-400 whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Quick Access */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-primary-950 dark:text-primary-50 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary-500" />
                        빠른 접근
                    </h2>
                    <div className="grid gap-4">
                        <Card hover className="cursor-pointer group">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300">
                                        <FolderKanban className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-primary-900 dark:text-primary-100">내 프로젝트</p>
                                        <p className="text-xs text-primary-500">12개 참여 중</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-600 transition-colors" />
                            </CardContent>
                        </Card>

                        <Card hover className="cursor-pointer group">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-primary-900 dark:text-primary-100">주간 보고서</p>
                                        <p className="text-xs text-primary-500">작성 필요</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-primary-400 group-hover:text-primary-600 transition-colors" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
