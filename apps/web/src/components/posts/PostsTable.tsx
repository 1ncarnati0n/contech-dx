'use client';

import { memo, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Post } from '@/lib/types';

interface PostsTableProps {
  posts: (Post & { author: { email: string; display_name: string | null } | null })[];
}

interface PostRowProps {
  post: Post & { author: { email: string; display_name: string | null } | null };
}

/**
 * 개별 게시글 행 (메모이제이션 적용)
 */
const PostRow = memo(function PostRow({ post }: PostRowProps) {
  const authorName = post.author?.display_name || '익명';

  return (
    <tr
      id={`post-${post.id}`}
      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge variant="secondary" className="capitalize">
          일반
        </Badge>
      </td>
      <td className="px-6 py-4">
        <Link
          href={`/posts/${post.id}`}
          className="flex items-center gap-2 group"
        >
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
            {post.title}
          </span>
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
            {authorName[0]?.toUpperCase() || 'A'}
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {authorName}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4 text-slate-400" />
          {formatDistanceToNow(new Date(post.created_at), {
            addSuffix: true,
            locale: ko,
          })}
        </div>
      </td>
    </tr>
  );
});

/**
 * 게시글 테이블 컴포넌트
 */
export default function PostsTable({ posts }: PostsTableProps) {
  // URL hash로 해당 게시글로 스크롤
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const timer = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">
                분류
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40">
                작성자
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-36">
                작성일
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  게시글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
