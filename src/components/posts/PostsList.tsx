'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { User, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
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
  return (
    <motion.div variants={staggerItem}>
      <Link href={`/posts/${post.id}`}>
        <Card hover className="group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors line-clamp-1">
                {post.title}
              </h2>
              <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400 group-hover:translate-x-1 transition-all shrink-0" />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              {post.content}
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-500">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{post.author?.email || '익명'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
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
