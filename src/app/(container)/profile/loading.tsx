import { Skeleton } from '@/components/ui';

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Skeleton variant="title" className="mb-2" />
        <Skeleton className="w-48 h-5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 프로필 정보 카드 Skeleton */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
            {/* 프로필 이미지 */}
            <div className="flex justify-center mb-4">
              <Skeleton variant="avatar" className="w-24 h-24" />
            </div>

            {/* 기본 정보 */}
            <div className="text-center mb-4 space-y-2">
              <Skeleton className="w-32 h-6 mx-auto" />
              <Skeleton className="w-40 h-4 mx-auto" />
              <Skeleton className="w-20 h-6 mx-auto rounded-full" />
            </div>

            {/* 통계 */}
            <div className="border-t pt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="w-16 h-4" />
                  <Skeleton className="w-12 h-6" />
                </div>
              ))}
            </div>
          </div>

          {/* 계정 정보 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <Skeleton className="w-24 h-4 mb-2" />
            <div className="space-y-2">
              <Skeleton className="w-full h-4" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
        </div>

        {/* 오른쪽: 프로필 편집 폼 Skeleton */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
            <Skeleton variant="title" className="mb-6" />
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-full h-10" />
                </div>
              ))}
              <Skeleton variant="button" className="w-32 h-10" />
            </div>
          </div>
        </div>
      </div>

      {/* 빠른 링크 Skeleton */}
      <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <Skeleton variant="title" className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
