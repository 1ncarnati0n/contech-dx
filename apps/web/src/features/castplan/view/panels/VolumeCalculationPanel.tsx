'use client';

import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/components/ui';
import { FileSpreadsheet, Download } from 'lucide-react';
import type { CastBlock } from '@/shared/types';
import { calculateBlockTotals } from '@/features/castplan/service/castplan-helpers';
import { exportVolumeExcel } from '@/features/castplan/service/exportVolumeExcel';

interface VolumeCalculationPanelProps {
  blocks: CastBlock[];
}

export function VolumeCalculationPanel({ blocks }: VolumeCalculationPanelProps) {
  const totals = calculateBlockTotals(blocks);

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
            onClick={() => exportVolumeExcel(blocks)}
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
