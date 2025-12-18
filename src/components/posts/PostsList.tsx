'use client';

import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { Post } from '@/lib/types';

interface PostsListProps {
  posts: (Post & { author: { email: string; display_name: string | null } | null })[];
}

interface PostItemProps {
  post: Post & { author: { email: string; display_name: string | null } | null };
}

/**
 * 개별 게시글 아이템 (메모이제이션 적용)
 */
const PostItem = memo(function PostItem({ post }: PostItemProps) {
  const authorName = post.author?.display_name || '익명';
  const authorInitial = authorName[0]?.toUpperCase() || 'A';

  return (
    <motion.div id={`post-${post.id}`} variants={staggerItem}>
      <Link href={`/posts/${post.id}`}>
        <Card hover className="group">
          <CardContent className="p-4">
            {/* 제목 행 */}
            <div className="flex items-center gap-4">
              {/* 배지 */}
              <Badge variant="secondary" className="shrink-0">일반</Badge>

              {/* 제목 */}
              <h2 className="flex-1 text-base font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                {post.title}
              </h2>

              {/* 작성자 */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  {authorInitial}
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                  {authorName}
                </span>
              </div>

              {/* 날짜 */}
              <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 hidden md:inline">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>

              {/* 화살표 */}
              <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
});

/**
 * 게시글 목록 컴포넌트
 */
export default function PostsList({ posts }: PostsListProps) {
  // URL hash로 해당 게시글로 스크롤
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // 애니메이션이 완료된 후 스크롤 (stagger 애니메이션 대기)
      const timer = setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </motion.div>
  );
}
