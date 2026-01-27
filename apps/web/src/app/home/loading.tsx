import { Card, CardContent } from '@/components/ui';

export default function HomeLoading() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                </div>
                <div className="flex gap-3">
                    <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                    <div className="h-9 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-l-4 border-l-zinc-200 dark:border-l-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                    <div className="h-8 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                </div>
                                <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="h-4 w-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Skeleton */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>

                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                        <div className="h-3 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                    </div>
                                    <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Quick Access Skeleton */}
                <div className="space-y-6">
                    <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="grid gap-4">
                        {[1, 2].map((i) => (
                            <Card key={i}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                        </div>
                                    </div>
                                    <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-800" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
