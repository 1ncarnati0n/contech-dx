'use client';

import { logger } from '@/shared/utils/logger';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components/ui';
import { FileSpreadsheet, Download } from 'lucide-react';
import type { CastBlock, VolumeExportRow } from '@/shared/types';

interface VolumeCalculationPanelProps {
  blocks: CastBlock[];
}

export function VolumeCalculationPanel({ blocks }: VolumeCalculationPanelProps) {
  // 총계 계산
  const totals = blocks.reduce(
    (acc, block) => ({
      area: acc.area + (block.area || 0),
      volume: acc.volume + (block.volume || 0),
      orderVolume: acc.orderVolume + (block.orderVolume || 0),
    }),
    { area: 0, volume: 0, orderVolume: 0 }
  );

  // Excel 내보내기
  const handleExportExcel = async () => {
    try {
      // xlsx 라이브러리 동적 import
      const XLSX = await import('xlsx');

      // 데이터 준비
      const exportData: VolumeExportRow[] = blocks.map((block, idx) => ({
        no: idx + 1,
        blockName: block.name,
        area: block.area || 0,
        thickness: block.thickness,
        volume: block.volume || 0,
        surchargeRate: block.surchargeRate,
        orderVolume: block.orderVolume || 0,
        concreteGrade: block.concreteGrade,
      }));

      // 워크시트 데이터 생성
      const wsData = [
        ['No.', '구역명', '면적(㎡)', '두께(m)', '체적(㎥)', '할증(%)', '발주량(㎥)', '콘크리트강도'],
        ...exportData.map((row) => [
          row.no,
          row.blockName,
          row.area.toFixed(2),
          row.thickness.toFixed(2),
          row.volume.toFixed(2),
          row.surchargeRate,
          row.orderVolume.toFixed(2),
          row.concreteGrade,
        ]),
        // 합계 행
        [
          '합계',
          '',
          totals.area.toFixed(2),
          '-',
          totals.volume.toFixed(2),
          '-',
          totals.orderVolume.toFixed(2),
          '',
        ],
      ];

      // 워크시트 생성
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // 열 너비 설정
      ws['!cols'] = [
        { wch: 5 },  // No.
        { wch: 15 }, // 구역명
        { wch: 12 }, // 면적
        { wch: 10 }, // 두께
        { wch: 12 }, // 체적
        { wch: 8 },  // 할증
        { wch: 12 }, // 발주량
        { wch: 15 }, // 강도
      ];

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '타설구역물량표');

      // 파일 다운로드
      XLSX.writeFile(wb, `타설물량표_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      logger.error('Excel 내보내기 오류:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            물량 계산
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            disabled={blocks.length === 0}
            className="h-7 px-2 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {blocks.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
            블록을 추가하면 물량이 자동 계산됩니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-1 font-medium">구역</th>
                  <th className="text-right py-1 font-medium">면적</th>
                  <th className="text-right py-1 font-medium">발주량</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr
                    key={block.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="py-1">
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded"
                          style={{ backgroundColor: block.color }}
                        />
                        {block.name}
                      </div>
                    </td>
                    <td className="text-right py-1">
                      {(block.area || 0).toFixed(1)}㎡
                    </td>
                    <td className="text-right py-1 font-medium">
                      {(block.orderVolume || 0).toFixed(1)}㎥
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-slate-50 dark:bg-slate-800">
                  <td className="py-1">합계</td>
                  <td className="text-right py-1">{totals.area.toFixed(1)}㎡</td>
                  <td className="text-right py-1 text-primary-600 dark:text-primary-400">
                    {totals.orderVolume.toFixed(1)}㎥
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
