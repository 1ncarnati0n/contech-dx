'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SpinnerDemoPage() {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const showFullScreenLoader = () => {
    setShowFullScreen(true);
    setTimeout(() => {
      setShowFullScreen(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-800">Spinner 컴포넌트</h1>
          <p className="text-slate-600">다양한 로딩 스피너 스타일</p>
        </div>

        {/* 크기 variants */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">크기 옵션</h2>
          <div className="flex flex-wrap items-center gap-8">
            <div className="text-center">
              <Spinner size="sm" />
              <p className="mt-2 text-sm text-slate-600">Small</p>
            </div>
            <div className="text-center">
              <Spinner size="md" />
              <p className="mt-2 text-sm text-slate-600">Medium</p>
            </div>
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-2 text-sm text-slate-600">Large</p>
            </div>
            <div className="text-center">
              <Spinner size="xl" />
              <p className="mt-2 text-sm text-slate-600">Extra Large</p>
            </div>
          </div>
        </Card>

        {/* 색상 variants */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">색상 옵션</h2>
          <div className="flex flex-wrap items-center gap-8">
            <div className="text-center">
              <Spinner variant="primary" size="lg" />
              <p className="mt-2 text-sm text-slate-600">Primary</p>
            </div>
            <div className="text-center">
              <Spinner variant="secondary" size="lg" />
              <p className="mt-2 text-sm text-slate-600">Secondary</p>
            </div>
            <div className="text-center">
              <Spinner variant="accent" size="lg" />
              <p className="mt-2 text-sm text-slate-600">Accent</p>
            </div>
            <div className="text-center bg-slate-800 p-4 rounded-lg">
              <Spinner variant="white" size="lg" />
              <p className="mt-2 text-sm text-white">White</p>
            </div>
          </div>
        </Card>

        {/* 텍스트와 함께 */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">텍스트와 함께</h2>
          <div className="flex flex-wrap items-center gap-8">
            <Spinner size="md" text="로딩 중..." variant="primary" />
            <Spinner size="md" text="데이터 가져오는 중..." variant="secondary" />
            <Spinner size="lg" text="처리 중..." variant="accent" />
          </div>
        </Card>

        {/* 버튼 통합 */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">버튼 통합 예제</h2>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              onClick={simulateLoading}
              loading={isLoading}
            >
              {isLoading ? '처리 중...' : '데이터 로드'}
            </Button>
            <Button
              variant="secondary"
              onClick={showFullScreenLoader}
            >
              전체 화면 로더 보기
            </Button>
          </div>

          {isLoading && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <Spinner size="md" text="작업을 처리하고 있습니다..." variant="primary" />
            </div>
          )}
        </Card>

        {/* 사용 예제 코드 */}
        <Card className="p-6 bg-slate-800">
          <h2 className="text-2xl font-semibold text-white mb-4">사용 예제</h2>
          <div className="space-y-4">
            <pre className="text-cyan-400 text-sm overflow-x-auto">
{`// 기본 스피너
<Spinner />

// 크기와 색상 지정
<Spinner size="lg" variant="secondary" />

// 텍스트와 함께
<Spinner text="로딩 중..." variant="accent" />

// 전체 화면 로더
<Spinner fullScreen text="페이지 로딩 중..." />

// 버튼에서 사용
<Button loading={isLoading}>
  클릭하기
</Button>`}
            </pre>
          </div>
        </Card>
      </div>

      {/* 전체 화면 로더 */}
      {showFullScreen && (
        <Spinner
          fullScreen
          size="xl"
          text="전체 화면 로딩 중..."
          variant="primary"
        />
      )}
    </div>
  );
}