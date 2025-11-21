import { Card, CardContent, Skeleton } from '@/components/ui';

export default function PostDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton variant="title" className="w-3/4 mb-4" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-40 h-5" />
        </div>
      </div>

      {/* Content Skeleton */}
      <Card>
        <CardContent className="p-8">
          <Skeleton variant="text" count={8} />
        </CardContent>
      </Card>

      {/* Action Buttons Skeleton */}
      <div className="flex justify-between items-center mt-6">
        <Skeleton variant="button" className="w-24" />
        <div className="flex gap-2">
          <Skeleton variant="button" className="w-20" />
          <Skeleton variant="button" className="w-20" />
        </div>
      </div>

      {/* Comments Section Skeleton */}
      <div className="mt-12">
        <Skeleton variant="title" className="mb-6 w-32" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="w-full h-24 mb-4" />
            <Skeleton variant="button" className="w-32" />
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-2">
                  <Skeleton variant="avatar" className="w-8 h-8" />
                  <div className="flex-1">
                    <Skeleton className="w-32 h-4 mb-2" />
                    <Skeleton variant="text" count={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
