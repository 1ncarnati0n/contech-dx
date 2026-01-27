import { Card, CardContent } from '@/components/ui';

export default function PostDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* 뒤로가기 Skeleton */}
      <div className="mb-6">
        <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>

      {/* 메인 카드 Skeleton */}
      <Card className="overflow-hidden border-0 shadow-md mb-6">
        {/* 게시글 헤더 */}
        <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800">
          {/* 배지 + 액션 버튼 */}
          <div className="flex items-start justify-between mb-4">
            <div className="h-6 w-14 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          </div>

          {/* 제목 */}
          <div className="h-9 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />

          {/* 작성자 정보 영역 */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* 본문 */}
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-3">
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
        </CardContent>

        {/* 하단 액션 바 */}
        <div className="px-6 sm:px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
        </div>
      </Card>

      {/* 댓글 섹션 Skeleton */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardContent className="p-6 sm:p-8">
          <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />

          {/* 댓글 입력 폼 */}
          <div className="mb-8">
            <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse mb-3" />
            <div className="h-10 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 py-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
