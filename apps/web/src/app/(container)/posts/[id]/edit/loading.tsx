import { Card, CardContent } from '@/shared/components/ui';

export default function EditPostLoading() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 뒤로가기 Skeleton */}
      <div className="mb-6">
        <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>

      {/* Header Skeleton */}
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Form Card Skeleton */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* 제목 입력 */}
          <div className="space-y-2">
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-11 w-full bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          </div>

          {/* 내용 입력 */}
          <div className="space-y-2">
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-64 w-full bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end gap-3 pt-4">
            <div className="h-10 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
