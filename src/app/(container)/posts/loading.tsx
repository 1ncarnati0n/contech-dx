import { Card, CardContent, Skeleton } from '@/components/ui';
import { FileText } from 'lucide-react';

export default function PostsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            게시판
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            팀원들과 정보를 공유하고 소통하세요
          </p>
        </div>
        <Skeleton variant="button" className="w-28 h-10" />
      </div>

      {/* Posts List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <Skeleton variant="title" className="w-2/3" />
                <Skeleton className="w-5 h-5 rounded-md" />
              </div>
              <Skeleton variant="text" count={2} />
              <div className="mt-4 flex items-center gap-4">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-32 h-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
