import { Card } from '@/components/ui';

export default function PostsLoading() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      </div>

      {/* Table Skeleton */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left w-24">
                  <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </th>
                <th className="px-6 py-4 text-left w-40">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </th>
                <th className="px-6 py-4 text-left w-36">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="h-6 w-14 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
