import { useState, useEffect, useMemo } from 'react';
import type { Building } from '@/shared/types';
import { loadBuildingsForDashboard } from './dashboard.service';
import { calculateDailyWorkerCounts, type DailyWorkerCounts } from './calculateDailyWorkerCounts';
import { logger } from '@/shared/utils/logger';

export function useDailyWorkerInput(projectId: string) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await loadBuildingsForDashboard(projectId);
        setBuildings(data);
      } catch (error) {
        logger.error('Failed to load buildings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const workerCounts: DailyWorkerCounts = useMemo(
    () => calculateDailyWorkerCounts(buildings),
    [buildings],
  );

  return { isLoading, workerCounts };
}
