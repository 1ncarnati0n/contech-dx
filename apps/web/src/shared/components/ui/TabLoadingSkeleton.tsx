interface TabLoadingSkeletonProps {
  title?: string;
}

export function TabLoadingSkeleton({ title = "로딩 중..." }: TabLoadingSkeletonProps) {
  return (
    <div className="space-y-4 p-6 animate-in fade-in duration-300">
      <div className="text-sm text-muted-foreground mb-4">{title}</div>

      {/* 헤더 skeleton */}
      <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />

      {/* 메인 컨텐츠 skeleton */}
      <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />

      {/* 그리드 skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
