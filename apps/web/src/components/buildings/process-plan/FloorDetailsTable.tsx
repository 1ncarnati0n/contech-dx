'use client';

import { FloorProcessDetails, ProcessCategory } from '@/lib/types';

interface FloorDetailsTableProps {
  category: ProcessCategory;
  floorDetails: Record<string, FloorProcessDetails>;
}

export function FloorDetailsTable({ category, floorDetails }: FloorDetailsTableProps) {
  const floors = Object.values(floorDetails);

  if (floors.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <h4 className="text-sm font-semibold mb-2 text-gray-700">층별 세부 정보</h4>
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              층
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              작업일수
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              공정타입
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              세부항목
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {floors.map((floor) => (
            <tr key={floor.floorLabel} className="hover:bg-gray-50">
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                {floor.floorLabel}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                {floor.workDays}일
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                {floor.processType || '-'}
              </td>
              <td className="px-4 py-2 text-sm text-gray-600">
                {floor.items && floor.items.length > 0 ? (
                  <div className="space-y-1">
                    {floor.items.map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium">{item.workItem}</span>
                        <span className="text-gray-500 ml-2">
                          (수량: {item.quantity.toFixed(1)}, 직영일수: {item.directWorkDays}일,
                          투입인원: {item.dailyInputWorkers}명
                          {item.indirectWorkers ? `, 간접인원: ${item.indirectWorkers}명` : ''}
                          {item.indirectEquipment ? `, 간접장비: ${item.indirectEquipment}대` : ''})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
