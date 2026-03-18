import type { ConstructionTask } from 'sa-gantt-lib';

/**
 * CP(공정패키지) 단위로 하위 TASK들의 공기를 집계하여
 * CP 노드의 startDate/endDate/cp 필드를 재계산한다.
 */
export function recalculateCPData(taskList: ConstructionTask[]): ConstructionTask[] {
  const taskMap = new Map<string, ConstructionTask>();
  taskList.forEach(t => taskMap.set(t.id, t));

  const findRootCPId = (taskId: string | null): string | null => {
    if (!taskId) return null;
    const task = taskMap.get(taskId);
    if (!task) return null;
    if (task.type === 'CP') return task.id;
    return findRootCPId(task.parentId);
  };

  const cpMap = new Map<string, {
    work: number;
    nonWork: number;
    minStart: Date;
    maxEnd: Date;
  }>();

  taskList.forEach(t => {
    if (t.wbsLevel === 2 && t.type === 'TASK' && t.task) {
      const rootCPId = findRootCPId(t.parentId);
      if (!rootCPId) return;

      const current = cpMap.get(rootCPId) || {
        work: 0,
        nonWork: 0,
        minStart: new Date(8640000000000000),
        maxEnd: new Date(-8640000000000000),
      };

      current.work += t.task.netWorkDays;
      current.nonWork += t.task.indirectWorkDaysPre + t.task.indirectWorkDaysPost;
      if (t.startDate < current.minStart) current.minStart = t.startDate;
      if (t.endDate > current.maxEnd) current.maxEnd = t.endDate;

      cpMap.set(rootCPId, current);
    }
  });

  return taskList.map(t => {
    if (t.wbsLevel === 1 && cpMap.has(t.id)) {
      const agg = cpMap.get(t.id)!;
      return {
        ...t,
        startDate: agg.minStart,
        endDate: agg.maxEnd,
        cp: {
          workDaysTotal: agg.work,
          nonWorkDaysTotal: agg.nonWork,
        },
      };
    }
    return t;
  });
}
