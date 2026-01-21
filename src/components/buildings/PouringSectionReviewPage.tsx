'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@/components/ui';
import { Calculator, Map, LayoutGrid } from 'lucide-react';
import { calculatePouringSectionDetailed } from '@/lib/utils/pouring-section-calculation';
import { calculateFlatPolygonArea, calculateConcreteVolume } from '@/lib/utils/geometry';
import type {
  PouringSectionCalculationResult,
  CastPlanState,
  CastBlock,
  ParsedDxfData,
  CastPlanTool,
} from '@/lib/types';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// 캔버스 컴포넌트 동적 import (SSR 비활성화)
const CastPlanCanvas = dynamic(
  () => import('@/components/castplan/CastPlanCanvas').then((mod) => mod.CastPlanCanvas),
  { ssr: false }
);
import { CastPlanToolbar } from '@/components/castplan/CastPlanToolbar';
import { CastPlanSidebar } from '@/components/castplan/CastPlanSidebar';
import { DxfUploader } from '@/components/castplan/DxfUploader';

interface Props {
  projectId: string;
}

type ViewMode = 'simple' | 'visual';

// CastPlan 상태 초기값
const initialCastPlanState: CastPlanState = {
  dxfData: null,
  dxfFileName: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  activeTool: 'select',
  blocks: [],
  gates: [],
  pumpCars: [],
  selectedBlockId: null,
  selectedGateId: null,
  selectedPumpCarId: null,
  showReachCircles: true,
  showLabels: true,
  showGrid: false,
  snapEnabled: true,
};

export function PouringSectionReviewPage({ projectId }: Props) {
  // 모드 상태
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

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

  // ============================================
  // Visual 모드 상태
  // ============================================
  const [castPlanState, setCastPlanState] = useState<CastPlanState>(initialCastPlanState);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // 캔버스 크기 조정
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: Math.max(500, rect.height),
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [viewMode]);

  // 상태 업데이트 핸들러
  const handleStateChange = useCallback((updates: Partial<CastPlanState>) => {
    setCastPlanState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 블록 선택 핸들러
  const handleBlockSelect = useCallback((blockId: string | null) => {
    setCastPlanState((prev) => ({ ...prev, selectedBlockId: blockId }));
  }, []);

  // 게이트 선택 핸들러
  const handleGateSelect = useCallback((gateId: string | null) => {
    setCastPlanState((prev) => ({ ...prev, selectedGateId: gateId }));
  }, []);

  // 펌프카 선택 핸들러
  const handlePumpCarSelect = useCallback((pumpCarId: string | null) => {
    setCastPlanState((prev) => ({ ...prev, selectedPumpCarId: pumpCarId }));
  }, []);

  // 블록 업데이트 핸들러 (물량 자동 계산 포함)
  const handleBlockUpdate = useCallback((blockId: string, updates: Partial<CastBlock>) => {
    setCastPlanState((prev) => {
      const updatedBlocks = prev.blocks.map((block) => {
        if (block.id !== blockId) return block;

        const updatedBlock = { ...block, ...updates };

        // 면적 및 물량 재계산
        const area = calculateFlatPolygonArea(updatedBlock.points);
        const { volume, orderVolume } = calculateConcreteVolume(
          area,
          updatedBlock.thickness,
          updatedBlock.surchargeRate
        );

        return { ...updatedBlock, area, volume, orderVolume };
      });

      return { ...prev, blocks: updatedBlocks };
    });
  }, []);

  // DXF 로드 핸들러
  const handleDxfLoaded = useCallback((data: ParsedDxfData, fileName: string) => {
    // 바운드 기반 초기 스케일 및 오프셋 계산
    const { bounds } = data;
    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const dxfWidth = bounds.maxX - bounds.minX;
    const dxfHeight = bounds.maxY - bounds.minY;

    const scaleX = canvasWidth / dxfWidth * 0.8;
    const scaleY = canvasHeight / dxfHeight * 0.8;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (canvasWidth - dxfWidth * scale) / 2 - bounds.minX * scale;
    const offsetY = (canvasHeight - dxfHeight * scale) / 2 - bounds.minY * scale;

    setCastPlanState((prev) => ({
      ...prev,
      dxfData: data,
      dxfFileName: fileName,
      scale,
      offsetX,
      offsetY,
    }));

    toast.success(`DXF 파일 "${fileName}" 로드 완료`);
  }, [canvasSize]);

  // DXF 클리어 핸들러
  const handleDxfClear = useCallback(() => {
    setCastPlanState((prev) => ({
      ...prev,
      dxfData: null,
      dxfFileName: null,
    }));
  }, []);

  // 줌 핸들러
  const handleZoomIn = useCallback(() => {
    setCastPlanState((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 10),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCastPlanState((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.01),
    }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!castPlanState.dxfData) return;

    const { bounds } = castPlanState.dxfData;
    const dxfWidth = bounds.maxX - bounds.minX;
    const dxfHeight = bounds.maxY - bounds.minY;

    const scaleX = canvasSize.width / dxfWidth * 0.9;
    const scaleY = canvasSize.height / dxfHeight * 0.9;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvasSize.width - dxfWidth * scale) / 2 - bounds.minX * scale;
    const offsetY = (canvasSize.height - dxfHeight * scale) / 2 - bounds.minY * scale;

    setCastPlanState((prev) => ({
      ...prev,
      scale,
      offsetX,
      offsetY,
    }));
  }, [castPlanState.dxfData, canvasSize]);

  // 도구 변경 핸들러
  const handleToolChange = useCallback((tool: CastPlanTool) => {
    setCastPlanState((prev) => ({ ...prev, activeTool: tool }));
  }, []);

  return (
    <div className="space-y-6 w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">타설구간 개략검토</h2>
          </div>

          {/* 모드 전환 버튼 */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('simple')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'simple'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Simple
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'visual'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Map className="w-4 h-4" />
              Visual
            </button>
          </div>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          {viewMode === 'simple'
            ? '동 기초 타설량과 동 개수를 입력하여 타설구간을 산정합니다.'
            : 'DXF 도면 위에 타설 구역을 분할하고, 장비 배치를 계획합니다.'}
        </p>
      </div>

      {/* Simple 모드 */}
      {viewMode === 'simple' && (
        <>
          {/* 입력 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>입력 정보</CardTitle>
            </CardHeader>
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

      {/* Visual 모드 */}
      {viewMode === 'visual' && (
        <div className="flex gap-4 h-[calc(100vh-250px)] min-h-[600px]">
          {/* 왼쪽 사이드 영역 */}
          <div className="w-80 shrink-0 flex flex-col gap-3">
            {/* 사이드바 */}
            <div className="flex-1 min-h-0">
              <CastPlanSidebar
                state={castPlanState}
                onStateChange={handleStateChange}
                onBlockUpdate={handleBlockUpdate}
                onBlockSelect={handleBlockSelect}
                onGateSelect={handleGateSelect}
                onPumpCarSelect={handlePumpCarSelect}
              />
            </div>

            {/* DXF 업로더 (사이드바 하단) */}
            <DxfUploader
              onDxfLoaded={handleDxfLoaded}
              currentFileName={castPlanState.dxfFileName}
              onClear={handleDxfClear}
            />
          </div>

          {/* 메인 영역 */}
          <div className="flex-1 flex flex-col gap-4">
            {/* 툴바 */}
            <CastPlanToolbar
              activeTool={castPlanState.activeTool}
              onToolChange={handleToolChange}
              state={castPlanState}
              onStateChange={handleStateChange}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitToScreen={handleFitToScreen}
            />

            {/* 캔버스 */}
            <div
              ref={canvasContainerRef}
              className="flex-1 bg-slate-900 rounded-lg overflow-hidden"
            >
              {castPlanState.dxfData ? (
                <CastPlanCanvas
                  state={castPlanState}
                  onStateChange={handleStateChange}
                  onBlockSelect={handleBlockSelect}
                  onGateSelect={handleGateSelect}
                  onPumpCarSelect={handlePumpCarSelect}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">DXF 파일을 업로드하세요</p>
                    <p className="text-sm mt-1">기초 또는 슬래브 평면도를 로드하여 타설 계획을 수립합니다</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
