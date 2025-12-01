import { Card } from '@/components/ui';

export default function ProjectsLoading() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>

            {/* Filter Bar Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 p-1">
                <div className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
                <div className="w-40 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="h-64">
                        <div className="p-6 space-y-4 animate-pulse">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                            <div className="space-y-2 pt-4">
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
