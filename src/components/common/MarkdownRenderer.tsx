'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 헤딩 텍스트에서 ID 생성
 */
const generateId = (children: React.ReactNode): string => {
  const text = React.Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('');
  return text.trim();
};

/**
 * 마크다운 렌더러 컴포넌트
 * - GFM(GitHub Flavored Markdown) 지원
 * - 다크모드 지원
 * - 테이블, 코드블록, 리스트 등 커스텀 스타일링
 * - 목차 앵커 링크 지원
 */
export default function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ node: _node, children }) => <>{children}</>,
          a: ({ node: _node, href, ...props }) => {
            if (href?.startsWith('#')) {
              return (
                <a
                  href={href}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.getElementById(href.slice(1));
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  {...props}
                />
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline break-all"
                {...props}
              />
            );
          },
          table: ({ node: _node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table
                className="w-full text-sm text-left text-zinc-700 dark:text-zinc-300"
                {...props}
              />
            </div>
          ),
          thead: ({ node: _node, ...props }) => (
            <thead
              className="text-xs text-zinc-700 dark:text-zinc-300 uppercase bg-zinc-50 dark:bg-zinc-800/50"
              {...props}
            />
          ),
          tbody: ({ node: _node, ...props }) => (
            <tbody
              className="divide-y divide-zinc-100 dark:divide-zinc-800"
              {...props}
            />
          ),
          th: ({ node: _node, ...props }) => (
            <th className="px-4 py-3 font-semibold whitespace-nowrap" {...props} />
          ),
          td: ({ node: _node, ...props }) => (
            <td className="px-4 py-3" {...props} />
          ),
          tr: ({ node: _node, ...props }) => (
            <tr
              className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              {...props}
            />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul className="list-disc list-outside ml-5 space-y-1 my-3" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol
              className="list-decimal list-outside ml-5 space-y-1 my-3"
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => <li className="pl-1" {...props} />,
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-400 my-4"
              {...props}
            />
          ),
          h1: ({ node: _node, children, ...props }) => (
            <h1
              id={generateId(children)}
              className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-white"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ node: _node, children, ...props }) => (
            <h2
              id={generateId(children)}
              className="text-xl font-bold mt-5 mb-3 text-zinc-900 dark:text-white"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ node: _node, children, ...props }) => (
            <h3
              id={generateId(children)}
              className="text-lg font-bold mt-4 mb-2 text-zinc-800 dark:text-zinc-200"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ node: _node, children, ...props }) => (
            <h4
              id={generateId(children)}
              className="text-base font-bold mt-3 mb-2 text-zinc-800 dark:text-zinc-200"
              {...props}
            >
              {children}
            </h4>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ node: _node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');

            return isInline ? (
              <code
                className="bg-zinc-100 dark:bg-zinc-800 text-pink-500 dark:text-pink-400 rounded px-1.5 py-0.5 font-mono text-xs font-medium border border-zinc-200 dark:border-zinc-700"
                {...props}
              >
                {children}
              </code>
            ) : (
              <div className="not-prose relative my-2 rounded-md overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs">
                  <span>{match ? match[1] : 'Code'}</span>
                </div>
                <pre className="p-3 overflow-x-auto bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent leading-none">
                  <code className="font-mono text-xs leading-none" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          p: ({ node: _node, ...props }) => (
            <p className="mb-3 last:mb-0 leading-relaxed" {...props} />
          ),
          hr: ({ node: _node, ...props }) => (
            <hr className="my-6 border-zinc-200 dark:border-zinc-700" {...props} />
          ),
          strong: ({ node: _node, ...props }) => (
            <strong className="font-semibold text-zinc-900 dark:text-white" {...props} />
          ),
          em: ({ node: _node, ...props }) => (
            <em className="italic" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
