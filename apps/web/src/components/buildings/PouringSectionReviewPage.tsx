'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@/components/ui';
import { Calculator, Construction, Loader2 } from 'lucide-react';
import { calculatePouringSectionDetailed } from '@/lib/utils/pouring-section-calculation';
import type { PouringSectionCalculationResult } from '@/lib/types';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// IFC 뷰어 컴포넌트 동적 import (SSR 비활성화)
const IfcViewer = dynamic(
  () => import('@/components/ifc-viewer').then((mod) => mod.IfcViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-slate-900 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-white text-sm font-medium">3D 뷰어 로딩 중...</span>
        </div>
      </div>
    )
  }
);

interface Props {
  projectId: string;
  viewMode?: 'simple' | 'visual';
  onViewModeChange?: (mode: 'simple' | 'visual') => void;
}

export function PouringSectionReviewPage({
  projectId,
  viewMode = 'visual',
  onViewModeChange
}: Props) {

  // ============================================
  // Simple 모드 상태
  // ============================================
  const [concreteVolume, setConcreteVolume] = useState<string>('');
  const [buildingCount, setBuildingCount] = useState<string>('');

  const calculationResult = useMemo<PouringSectionCalculationResult | null>(() => {
    const volume = parseFloat(concreteVolume);
    const count = parseInt(buildingCount, 10);

    if (isNaN(volume) || isNaN(count) || volume <= 0 || count <= 0) {
      return null;
    }

    return calculatePouringSectionDetailed(volume, count, projectId);
  }, [concreteVolume, buildingCount, projectId]);

  const handleCalculate = () => {
    if (!calculationResult) {
      toast.error('올바른 값을 입력해주세요.');
      return;
    }
    toast.success(`${calculationResult.finalSectionCount}개의 타설구간이 산정되었습니다.`);
  };

  return (
    <div className="space-y-6">
      {/* Simple 모드 */}
      {viewMode === 'simple' && (
        <>
          {/* 입력 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>입력 정보</CardTitle>
            </CardHeader>
            {/* 준비중 안내 */}
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-b border-amber-100 dark:border-amber-800">
              <Construction className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">🚧 이 기능은 현재 준비 중입니다. 곧 업데이트될 예정입니다.</span>
            </div>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">
                    동 기초 타설량 (㎥)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={concreteVolume}
                    onChange={(e) => setConcreteVolume(e.target.value)}
                    placeholder="예: 9000"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900 dark:text-white">
                    동 개수
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={buildingCount}
                    onChange={(e) => setBuildingCount(e.target.value)}
                    placeholder="예: 7"
                    className="w-full"
                  />
                </div>
              </div>
              <Button onClick={handleCalculate} disabled={!calculationResult}>
                계산하기
              </Button>
            </CardContent>
          </Card>

          {/* 계산 결과 */}
          {calculationResult && (
            <Card>
              <CardHeader>
                <CardTitle>산정 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      최종 타설구간 개수
                    </div>
                    <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {calculationResult.finalSectionCount}개
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                      최소 구간 개수 (동 개수 + 통로)
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {calculationResult.minSectionCount}개
                    </div>
                  </div>
                </div>

                {/* 계산 과정 */}
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">계산 과정</h4>
                  <div className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                    <div>• 총 기초 타설량: {calculationResult.totalConcreteVolume.toLocaleString()} ㎥</div>
                    <div>• 기본 구간 개수: {calculationResult.baseSectionCount}개 (FLOOR({calculationResult.totalConcreteVolume.toLocaleString()} / 1,600))</div>
                    {calculationResult.remainder > 0 && (
                      <div>• 남은 물량: {calculationResult.remainder.toLocaleString()} ㎥ → 추가 구간 1개 (장비 1대)</div>
                    )}
                    <div>• 계산된 구간 개수: {calculationResult.calculatedCount}개</div>
                    <div>• 최소 구간 개수: {calculationResult.minSectionCount}개 (동 {calculationResult.buildingCount}개 + 통로 1개)</div>
                    <div>• 최종 타설구간 개수: {calculationResult.finalSectionCount}개</div>
                  </div>
                </div>

                {/* 타설구간별 상세 정보 */}
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">타설구간별 상세 정보</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800">
                          <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-left text-sm font-semibold text-slate-900 dark:text-white">
                            구간
                          </th>
                          <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-white">
                            분배 물량 (㎥)
                          </th>
                          <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right text-sm font-semibold text-slate-900 dark:text-white">
                            장비 대수
                          </th>
                          <th className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-900 dark:text-white">
                            비고
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculationResult.sections.map((section) => (
                          <tr
                            key={section.id}
                            className={section.isPassage ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-slate-900'}
                          >
                            <td className="border border-slate-200 dark:border-slate-700 px-4 py-2">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {section.label}구간
                              </div>
                            </td>
                            <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right">
                              <div className="text-slate-900 dark:text-white">
                                {section.concreteVolume?.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </div>
                            </td>
                            <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right">
                              <div className="font-semibold text-primary-600 dark:text-primary-400">
                                {section.equipmentCount || 0}대
                              </div>
                            </td>
                            <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-center">
                              {section.isPassage && (
                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
                                  통로
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-semibold">
                          <td className="border border-slate-200 dark:border-slate-700 px-4 py-2">
                            합계
                          </td>
                          <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right">
                            {calculationResult.sections.reduce((sum, s) => sum + (s.concreteVolume || 0), 0).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-slate-200 dark:border-slate-700 px-4 py-2 text-right">
                            {calculationResult.sections.reduce((sum, s) => sum + (s.equipmentCount || 0), 0)}대
                          </td>
                          <td className="border border-slate-200 dark:border-slate-700 px-4 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Visual 모드 - IFC 3D 뷰어 */}
      {viewMode === 'visual' && (
        <div className="h-[calc(100vh-250px)] min-h-[600px]">
          <IfcViewer className="h-full" />
        </div>
      )}
    </div>
  );
}
