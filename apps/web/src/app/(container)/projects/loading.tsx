import { Card } from '@/shared/components/ui';

export default function ProjectsLoading() {
    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            {/* Header Skeleton - 아이콘 배지 스타일 */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                        <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                        <div className="h-4 w-56 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    </div>
                </div>
                <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
            </div>

            {/* Filter Bar Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div className="w-44 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>

            {/* 검색 결과 카운트 Skeleton */}
            <div className="mb-4">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="h-64 overflow-hidden">
                        <div className="p-6 space-y-4 animate-pulse">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                            <div className="space-y-2 pt-4">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
