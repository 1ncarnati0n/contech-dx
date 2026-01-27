/**
 * LocalStorageService
 *
 * DataService 인터페이스의 localStorage 구현
 * 브라우저 localStorage를 사용한 데이터 영속화
 *
 * 향후 Supabase 전환 시 SupabaseService로 교체 가능
 */

import type { ConstructionTask, Milestone, AnchorDependency } from '../types';
import type { DataService, GanttData, DataServiceOptions } from './DataService';
import {
    serializeTasks,
    deserializeTasks,
    serializeMilestones,
    deserializeMilestones,
    serializeAnchorDependencies,
    deserializeAnchorDependencies,
    serializeGanttDataForExport,
    parseImportedData,
} from './serializers';

// ============================================
// Storage Keys
// ============================================
const DEFAULT_STORAGE_PREFIX = 'sa-gantt';

const getStorageKeys = (prefix: string) => ({
    TASKS: `${prefix}-tasks`,
    MILESTONES: `${prefix}-milestones`,
    ANCHOR_DEPENDENCIES: `${prefix}-anchor-dependencies`,
});

// ============================================
// LocalStorageService Class
// ============================================

/**
 * LocalStorage 할당량 초과 에러
 */
export class StorageQuotaExceededError extends Error {
    constructor(
        message: string,
        public readonly currentSize: number,
        public readonly attemptedKey: string
    ) {
        super(message);
        this.name = 'StorageQuotaExceededError';
    }
}

export class LocalStorageService implements DataService {
    private storageKeys: ReturnType<typeof getStorageKeys>;
    private debug: boolean;

    constructor(options?: DataServiceOptions) {
        const prefix = options?.storagePrefix || DEFAULT_STORAGE_PREFIX;
        this.storageKeys = getStorageKeys(prefix);
        this.debug = options?.debug ?? false;
    }

    private log(...args: unknown[]): void {
        if (this.debug) {
            console.log('[LocalStorageService]', ...args);
        }
    }

    /**
     * localStorage에 안전하게 저장 (할당량 초과 처리 포함)
     */
    private safeSetItem(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                const currentSize = this.getStorageSize();
                throw new StorageQuotaExceededError(
                    `저장 공간이 부족합니다. 현재 사용량: ${(currentSize / 1024).toFixed(1)}KB. ` +
                    `일부 데이터를 삭제하거나 내보내기 후 초기화하세요.`,
                    currentSize,
                    key
                );
            }
            throw error;
        }
    }

    // ============================================
    // Tasks CRUD
    // ============================================

    async loadTasks(): Promise<ConstructionTask[]> {
        try {
            const stored = localStorage.getItem(this.storageKeys.TASKS);
            if (!stored) {
                this.log('No tasks found in storage');
                return [];
            }

            const tasks = deserializeTasks(stored);
            if (!tasks) {
                this.log('Failed to deserialize tasks');
                return [];
            }

            this.log('Loaded', tasks.length, 'tasks');
            return tasks;
        } catch (error) {
            console.error('Failed to load tasks from localStorage:', error);
            return [];
        }
    }

    async saveTasks(tasks: ConstructionTask[]): Promise<void> {
        this.safeSetItem(this.storageKeys.TASKS, serializeTasks(tasks));
        this.log('Saved', tasks.length, 'tasks');
    }

    async updateTask(id: string, updates: Partial<ConstructionTask>): Promise<ConstructionTask | null> {
        const tasks = await this.loadTasks();
        const index = tasks.findIndex(t => t.id === id);

        if (index === -1) {
            this.log('Task not found:', id);
            return null;
        }

        const updatedTask = { ...tasks[index], ...updates };
        tasks[index] = updatedTask;
        await this.saveTasks(tasks);

        this.log('Updated task:', id);
        return updatedTask;
    }

    async createTask(task: Omit<ConstructionTask, 'id'>): Promise<ConstructionTask> {
        const tasks = await this.loadTasks();
        const newTask: ConstructionTask = {
            ...task,
            id: `task-${Date.now()}`,
        } as ConstructionTask;

        tasks.push(newTask);
        await this.saveTasks(tasks);

        this.log('Created task:', newTask.id);
        return newTask;
    }

    async deleteTask(id: string): Promise<boolean> {
        const tasks = await this.loadTasks();
        const filtered = tasks.filter(t => t.id !== id);

        if (filtered.length === tasks.length) {
            this.log('Task not found for deletion:', id);
            return false;
        }

        await this.saveTasks(filtered);
        this.log('Deleted task:', id);
        return true;
    }

    // ============================================
    // Milestones CRUD
    // ============================================

    async loadMilestones(): Promise<Milestone[]> {
        try {
            const stored = localStorage.getItem(this.storageKeys.MILESTONES);
            if (!stored) {
                this.log('No milestones found in storage');
                return [];
            }

            const milestones = deserializeMilestones(stored);
            if (!milestones) {
                this.log('Failed to deserialize milestones');
                return [];
            }

            this.log('Loaded', milestones.length, 'milestones');
            return milestones;
        } catch (error) {
            console.error('Failed to load milestones from localStorage:', error);
            return [];
        }
    }

    async saveMilestones(milestones: Milestone[]): Promise<void> {
        this.safeSetItem(this.storageKeys.MILESTONES, serializeMilestones(milestones));
        this.log('Saved', milestones.length, 'milestones');
    }

    async updateMilestone(id: string, updates: Partial<Milestone>): Promise<Milestone | null> {
        const milestones = await this.loadMilestones();
        const index = milestones.findIndex(m => m.id === id);

        if (index === -1) {
            this.log('Milestone not found:', id);
            return null;
        }

        const updatedMilestone = { ...milestones[index], ...updates };
        milestones[index] = updatedMilestone;
        await this.saveMilestones(milestones);

        this.log('Updated milestone:', id);
        return updatedMilestone;
    }

    async createMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
        const milestones = await this.loadMilestones();
        const newMilestone: Milestone = {
            ...milestone,
            id: `milestone-${Date.now()}`,
        } as Milestone;

        milestones.push(newMilestone);
        await this.saveMilestones(milestones);

        this.log('Created milestone:', newMilestone.id);
        return newMilestone;
    }

    async deleteMilestone(id: string): Promise<boolean> {
        const milestones = await this.loadMilestones();
        const filtered = milestones.filter(m => m.id !== id);

        if (filtered.length === milestones.length) {
            this.log('Milestone not found for deletion:', id);
            return false;
        }

        await this.saveMilestones(filtered);
        this.log('Deleted milestone:', id);
        return true;
    }

    // ============================================
    // Dependencies CRUD
    // ============================================

    async loadDependencies(): Promise<AnchorDependency[]> {
        try {
            const stored = localStorage.getItem(this.storageKeys.ANCHOR_DEPENDENCIES);
            if (!stored) {
                this.log('No dependencies found in storage');
                return [];
            }

            const dependencies = deserializeAnchorDependencies(stored);
            if (!dependencies) {
                this.log('Failed to deserialize dependencies');
                return [];
            }

            this.log('Loaded', dependencies.length, 'dependencies');
            return dependencies;
        } catch (error) {
            console.error('Failed to load dependencies from localStorage:', error);
            return [];
        }
    }

    async saveDependencies(dependencies: AnchorDependency[]): Promise<void> {
        this.safeSetItem(
            this.storageKeys.ANCHOR_DEPENDENCIES,
            serializeAnchorDependencies(dependencies)
        );
        this.log('Saved', dependencies.length, 'dependencies');
    }

    async createDependency(dependency: AnchorDependency): Promise<AnchorDependency> {
        const dependencies = await this.loadDependencies();
        dependencies.push(dependency);
        await this.saveDependencies(dependencies);

        this.log('Created dependency:', dependency.id);
        return dependency;
    }

    async deleteDependency(id: string): Promise<boolean> {
        const dependencies = await this.loadDependencies();
        const filtered = dependencies.filter(d => d.id !== id);

        if (filtered.length === dependencies.length) {
            this.log('Dependency not found for deletion:', id);
            return false;
        }

        await this.saveDependencies(filtered);
        this.log('Deleted dependency:', id);
        return true;
    }

    // ============================================
    // Bulk Operations
    // ============================================

    async loadAll(): Promise<GanttData> {
        const [tasks, milestones, dependencies] = await Promise.all([
            this.loadTasks(),
            this.loadMilestones(),
            this.loadDependencies(),
        ]);

        this.log('Loaded all data:', {
            tasks: tasks.length,
            milestones: milestones.length,
            dependencies: dependencies.length,
        });

        return { tasks, milestones, dependencies };
    }

    async saveAll(data: GanttData): Promise<void> {
        await Promise.all([
            this.saveTasks(data.tasks),
            this.saveMilestones(data.milestones),
            this.saveDependencies(data.dependencies),
        ]);

        this.log('Saved all data');
    }

    // ============================================
    // Import/Export
    // ============================================

    async exportToJSON(): Promise<string> {
        const data = await this.loadAll();
        return serializeGanttDataForExport(data);
    }

    async importFromJSON(json: string): Promise<GanttData> {
        const data = parseImportedData(json);
        if (!data) {
            throw new Error('Failed to parse imported JSON data');
        }

        await this.saveAll(data);
        this.log('Imported data from JSON');
        return data;
    }

    async reset(): Promise<void> {
        localStorage.removeItem(this.storageKeys.TASKS);
        localStorage.removeItem(this.storageKeys.MILESTONES);
        localStorage.removeItem(this.storageKeys.ANCHOR_DEPENDENCIES);
        this.log('Storage reset');
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * 데이터 존재 여부 확인
     */
    hasData(): boolean {
        return localStorage.getItem(this.storageKeys.TASKS) !== null;
    }

    /**
     * 스토리지 사용량 확인 (바이트)
     */
    getStorageSize(): number {
        let size = 0;
        Object.values(this.storageKeys).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                size += item.length * 2; // UTF-16
            }
        });
        return size;
    }
}

// ============================================
// Factory Function
// ============================================

/**
 * LocalStorageService 인스턴스 생성
 */
export const createLocalStorageService = (options?: DataServiceOptions): DataService => {
    return new LocalStorageService(options);
};
