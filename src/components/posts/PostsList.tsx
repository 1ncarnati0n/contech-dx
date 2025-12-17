'use client';

import { memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, Badge } from '@/components/ui';
import { staggerContainer, staggerItem } from '@/lib/animations';
import type { Post } from '@/lib/types';

interface PostsListProps {
  posts: (Post & { author: { email: string } | null })[];
}

interface PostItemProps {
  post: Post & { author: { email: string } | null };
}

/**
 * 개별 게시글 아이템 (메모이제이션 적용)
 */
const PostItem = memo(function PostItem({ post }: PostItemProps) {
  const authorInitial = post.author?.email?.[0]?.toUpperCase() || 'A';

  return (
    <motion.div id={`post-${post.id}`} variants={staggerItem}>
      <Link href={`/posts/${post.id}`}>
        <Card hover className="group">
          <CardContent className="p-6">
            {/* 상단: 배지 + 날짜 */}
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">일반</Badge>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>

            {/* 제목 */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                {post.title}
              </h2>
              <ArrowRight className="w-5 h-5 text-zinc-400 dark:text-zinc-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </div>

            {/* 본문 미리보기 */}
            <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2 text-sm">
              {post.content}
            </p>

            {/* 하단: 작성자 + 통계 */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {/* 아바타 */}
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {authorInitial}
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {post.author?.email || '익명'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  0
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
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
