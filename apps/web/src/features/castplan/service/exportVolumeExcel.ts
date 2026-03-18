import { logger } from '@/shared/utils/logger';
import type { CastBlock, VolumeExportRow } from '@/shared/types';
import { calculateBlockTotals } from './castplan-helpers';

/** 타설 물량표를 Excel 파일로 내보내기 */
export async function exportVolumeExcel(blocks: CastBlock[]): Promise<void> {
  try {
    const XLSX = await import('xlsx');

    const totals = calculateBlockTotals(blocks);

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

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 5 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 15 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '타설구역물량표');

    XLSX.writeFile(wb, `타설물량표_${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    logger.error('Excel 내보내기 오류:', error);
  }
}
