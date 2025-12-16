'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui';
import { Users } from 'lucide-react';
import type { Building } from '@/lib/types';
import { getBuildings } from '@/lib/services/buildings';
import { getQuantityFromFloor } from '@/lib/utils/quantity-reference';
import { 
  calculateTotalWorkers, 
  calculateDailyInputWorkers,
  calculateEquipmentCount,
  calculateDailyInputWorkersByEquipment,
} from '@/lib/utils/process-calculation';

interface Props {
  projectId: string;
}

interface DailyWorkerCounts {
  gangForm: number; // 갱폼
  alForm: number; // 알폼
  formwork: number; // 형틀
  rebar: number; // 철근
  concrete: number; // 타설
}

export function DailyWorkerInputDashboard({ projectId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workerCounts, setWorkerCounts] = useState<DailyWorkerCounts>({
    gangForm: 0,
    alForm: 0,
    formwork: 0,
    rebar: 0,
    concrete: 0,
  });

  // 모든 동의 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getBuildings(projectId);
        setBuildings(data);
      } catch (error) {
        console.error('Failed to load buildings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  // 금일 인원투입 계산
  const calculatedWorkerCounts = useMemo(() => {
    if (buildings.length === 0) {
      return {
        gangForm: 0,
        alForm: 0,
        formwork: 0,
        rebar: 0,
        concrete: 0,
      };
    }

    const counts: DailyWorkerCounts = {
      gangForm: 0,
      alForm: 0,
      formwork: 0,
      rebar: 0,
      concrete: 0,
    };

    // 각 동별로 계산
    buildings.forEach(building => {
      // 갱폼 (gangForm) - C열 (areaM2)
      let totalGangFormArea = 0;
      
      // 버림, 기초는 tradeGroup으로 가져오기
      const blindingTrades = building.floorTrades.filter(ft => ft.tradeGroup === '버림');
      const foundationTrades = building.floorTrades.filter(ft => ft.tradeGroup === '기초');
      
      blindingTrades.forEach(trade => {
        totalGangFormArea += trade.trades.gangForm?.areaM2 || 0;
      });
      foundationTrades.forEach(trade => {
        totalGangFormArea += trade.trades.gangForm?.areaM2 || 0;
      });
      
      // 각 층의 갱폼 수량 합산
      building.floors.forEach(floor => {
        if (floor.levelType === '지상' || floor.levelType === '지하') {
          const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
          totalGangFormArea += getQuantityFromFloor(building, floorLabel, 'gangForm', 'areaM2') || 0;
        }
      });
      
      if (totalGangFormArea > 0) {
        // 갱폼 생산성: 일일 10㎡/명 (process-modules.ts 기준)
        const dailyProductivity = 10;
        const totalWorkers = calculateTotalWorkers(totalGangFormArea, dailyProductivity);
        counts.gangForm += Math.ceil(totalWorkers);
      }

      // 알폼 (alForm) - C열 (areaM2)
      let totalAlFormArea = 0;
      
      blindingTrades.forEach(trade => {
        totalAlFormArea += trade.trades.alForm?.areaM2 || 0;
      });
      foundationTrades.forEach(trade => {
        totalAlFormArea += trade.trades.alForm?.areaM2 || 0;
      });
      
      building.floors.forEach(floor => {
        if (floor.levelType === '지상' || floor.levelType === '지하') {
          const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
          totalAlFormArea += getQuantityFromFloor(building, floorLabel, 'alForm', 'areaM2') || 0;
        }
      });
      
      if (totalAlFormArea > 0) {
        const dailyProductivity = 10; // process-modules.ts 기준
        const totalWorkers = calculateTotalWorkers(totalAlFormArea, dailyProductivity);
        counts.alForm += Math.ceil(totalWorkers);
      }

      // 형틀 (formwork) - D열 (areaM2) = 갱폼 + 알폼 + 형틀
      let totalFormworkArea = totalGangFormArea + totalAlFormArea;
      
      blindingTrades.forEach(trade => {
        totalFormworkArea += trade.trades.formwork?.areaM2 || 0;
      });
      foundationTrades.forEach(trade => {
        totalFormworkArea += trade.trades.formwork?.areaM2 || 0;
      });
      
      building.floors.forEach(floor => {
        if (floor.levelType === '지상' || floor.levelType === '지하') {
          const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
          totalFormworkArea += getQuantityFromFloor(building, floorLabel, 'formwork', 'areaM2') || 0;
        }
      });
      
      if (totalFormworkArea > 0) {
        const dailyProductivity = 11; // process-modules.ts 기준
        const totalWorkers = calculateTotalWorkers(totalFormworkArea, dailyProductivity);
        counts.formwork += Math.ceil(totalWorkers);
      }

      // 철근 (rebar) - F열 (ton)
      let totalRebarTon = 0;
      
      blindingTrades.forEach(trade => {
        totalRebarTon += trade.trades.rebar?.ton || 0;
      });
      foundationTrades.forEach(trade => {
        totalRebarTon += trade.trades.rebar?.ton || 0;
      });
      
      building.floors.forEach(floor => {
        if (floor.levelType === '지상' || floor.levelType === '지하') {
          const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
          totalRebarTon += getQuantityFromFloor(building, floorLabel, 'rebar', 'ton') || 0;
        }
      });
      
      if (totalRebarTon > 0) {
        const dailyProductivity = 0.8; // process-modules.ts 기준 (옹벽철근조립)
        const totalWorkers = calculateTotalWorkers(totalRebarTon, dailyProductivity);
        counts.rebar += Math.ceil(totalWorkers);
      }

      // 타설 (concrete) - G열 (volumeM3)
      let totalConcreteVolume = 0;
      
      blindingTrades.forEach(trade => {
        totalConcreteVolume += trade.trades.concrete?.volumeM3 || 0;
      });
      foundationTrades.forEach(trade => {
        totalConcreteVolume += trade.trades.concrete?.volumeM3 || 0;
      });
      
      building.floors.forEach(floor => {
        if (floor.levelType === '지상' || floor.levelType === '지하') {
          const floorLabel = floor.floorLabel.replace(/코어\d+-/, '');
          totalConcreteVolume += getQuantityFromFloor(building, floorLabel, 'concrete', 'volumeM3') || 0;
        }
      });
      
      if (totalConcreteVolume > 0) {
        // 타설은 장비 기반 계산 (펌프카)
        const maxPumpCarCount = building.meta?.pumpCarCount || 2;
        const equipmentCalculationBase = 400; // 셋팅층 기준값 (평균)
        const equipmentWorkersPerUnit = 6; // 장비당 인원수 (기준층/셋팅층 기준)
        const calculatedEquipmentCount = calculateEquipmentCount(totalConcreteVolume, equipmentCalculationBase, maxPumpCarCount);
        const dailyInputWorkers = calculateDailyInputWorkersByEquipment(calculatedEquipmentCount, equipmentWorkersPerUnit);
        counts.concrete += Math.ceil(dailyInputWorkers);
      }
    });

    return counts;
  }, [buildings]);

  useEffect(() => {
    // TODO: 계산 로직 개선 필요 - 현재는 고정값 사용
    setWorkerCounts({
      gangForm: 20,
      alForm: 50,
      formwork: 60,
      rebar: 60,
      concrete: 24,
    });
  }, [calculatedWorkerCounts]);

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">금일 인원투입현황</h3>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400">
          <p>데이터 로딩 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>갱폼</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts.gangForm}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>알폼</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts.alForm}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>형틀</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts.formwork}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>철근</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts.rebar}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
            </div>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2" style={{ fontSize: '1.05em' }}>타설</div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{workerCounts.concrete}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">명</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
