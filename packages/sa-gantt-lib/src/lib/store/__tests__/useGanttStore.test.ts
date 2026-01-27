import { describe, it, expect, beforeEach } from 'vitest';
import { useGanttStore } from '../useGanttStore';
import type { ConstructionTask } from '../../types';
import { GANTT_LAYOUT } from '../../types';

// ============================================
// 테스트 헬퍼 및 픽스처
// ============================================

const createMockTask = (id: string, name: string): ConstructionTask => ({
    id,
    name,
    type: 'TASK',
    wbsLevel: 2,
    startDate: new Date('2024-05-01'),
    endDate: new Date('2024-05-10'),
});

const mockVisibleTasks: ConstructionTask[] = [
    createMockTask('1', 'Task 1'),
    createMockTask('2', 'Task 2'),
    createMockTask('3', 'Task 3'),
    createMockTask('4', 'Task 4'),
    createMockTask('5', 'Task 5'),
];

// 각 테스트 전에 store 초기화
beforeEach(() => {
    useGanttStore.setState({
        viewMode: 'MASTER',
        activeCPId: null,
        zoomLevel: 'MONTH',
        selectedTaskIds: new Set(),
        focusedTaskId: null,
        lastClickedIndex: null,
        hoveredTaskId: null,
        expandedTaskIds: new Set(),
        sidebarWidth: GANTT_LAYOUT.SIDEBAR_WIDTH,
        isDragging: false,
        dragType: null,
        dragTaskId: null,
        isCompactMode: false,
    });
});

// ============================================
// setViewMode 테스트
// ============================================

describe('setViewMode', () => {
    it('MASTER 모드로 전환 시 상태 자동 조정', () => {
        const { setViewMode } = useGanttStore.getState();
        setViewMode('MASTER');

        const state = useGanttStore.getState();
        expect(state.viewMode).toBe('MASTER');
        expect(state.zoomLevel).toBe('MONTH');
        expect(state.sidebarWidth).toBe(GANTT_LAYOUT.SIDEBAR_MASTER_WIDTH);
        expect(state.activeCPId).toBeNull();
    });

    it('DETAIL 모드로 전환 시 cpId 설정', () => {
        const { setViewMode } = useGanttStore.getState();
        setViewMode('DETAIL', 'cp-001');

        const state = useGanttStore.getState();
        expect(state.viewMode).toBe('DETAIL');
        expect(state.zoomLevel).toBe('DAY');
        expect(state.sidebarWidth).toBe(GANTT_LAYOUT.SIDEBAR_DETAIL_WIDTH);
        expect(state.activeCPId).toBe('cp-001');
    });

    it('UNIFIED 모드로 전환 시 중간 줌 레벨', () => {
        const { setViewMode } = useGanttStore.getState();
        setViewMode('UNIFIED');

        const state = useGanttStore.getState();
        expect(state.viewMode).toBe('UNIFIED');
        expect(state.zoomLevel).toBe('WEEK');
        expect(state.sidebarWidth).toBe(GANTT_LAYOUT.SIDEBAR_UNIFIED_WIDTH);
    });
});

// ============================================
// selectTask 테스트
// ============================================

describe('selectTask', () => {
    it('단순 클릭: 단일 선택', () => {
        const { selectTask } = useGanttStore.getState();
        selectTask('2', { visibleTasks: mockVisibleTasks });

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(1);
        expect(state.selectedTaskIds.has('2')).toBe(true);
        expect(state.focusedTaskId).toBe('2');
        expect(state.lastClickedIndex).toBe(1);
    });

    it('단순 클릭 후 다른 Task 클릭: 선택 교체', () => {
        const { selectTask } = useGanttStore.getState();
        selectTask('2', { visibleTasks: mockVisibleTasks });
        selectTask('4', { visibleTasks: mockVisibleTasks });

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(1);
        expect(state.selectedTaskIds.has('4')).toBe(true);
        expect(state.selectedTaskIds.has('2')).toBe(false);
    });

    it('Ctrl + 클릭: 토글 선택 (추가)', () => {
        const { selectTask } = useGanttStore.getState();
        selectTask('2', { visibleTasks: mockVisibleTasks });
        selectTask('4', { ctrlKey: true, visibleTasks: mockVisibleTasks });

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(2);
        expect(state.selectedTaskIds.has('2')).toBe(true);
        expect(state.selectedTaskIds.has('4')).toBe(true);
    });

    it('Ctrl + 클릭: 토글 선택 (제거)', () => {
        const { selectTask } = useGanttStore.getState();
        selectTask('2', { visibleTasks: mockVisibleTasks });
        selectTask('4', { ctrlKey: true, visibleTasks: mockVisibleTasks });
        selectTask('2', { ctrlKey: true, visibleTasks: mockVisibleTasks });

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(1);
        expect(state.selectedTaskIds.has('2')).toBe(false);
        expect(state.selectedTaskIds.has('4')).toBe(true);
    });

    it('Shift + 클릭: 범위 선택', () => {
        const { selectTask } = useGanttStore.getState();
        // 먼저 첫 번째 클릭으로 lastClickedIndex 설정
        selectTask('2', { visibleTasks: mockVisibleTasks }); // index 1

        // Shift + 클릭으로 범위 선택
        selectTask('4', { shiftKey: true, visibleTasks: mockVisibleTasks }); // index 3

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(3);
        expect(state.selectedTaskIds.has('2')).toBe(true); // index 1
        expect(state.selectedTaskIds.has('3')).toBe(true); // index 2
        expect(state.selectedTaskIds.has('4')).toBe(true); // index 3
    });

    it('Shift + 클릭: 역방향 범위 선택', () => {
        const { selectTask } = useGanttStore.getState();
        selectTask('4', { visibleTasks: mockVisibleTasks }); // index 3
        selectTask('2', { shiftKey: true, visibleTasks: mockVisibleTasks }); // index 1

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(3);
        expect(state.selectedTaskIds.has('2')).toBe(true);
        expect(state.selectedTaskIds.has('3')).toBe(true);
        expect(state.selectedTaskIds.has('4')).toBe(true);
    });
});

// ============================================
// selectMultipleTasks 테스트
// ============================================

describe('selectMultipleTasks', () => {
    it('여러 Task 한 번에 선택', () => {
        const { selectMultipleTasks } = useGanttStore.getState();
        selectMultipleTasks(['1', '3', '5']);

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(3);
        expect(state.selectedTaskIds.has('1')).toBe(true);
        expect(state.selectedTaskIds.has('3')).toBe(true);
        expect(state.selectedTaskIds.has('5')).toBe(true);
        expect(state.focusedTaskId).toBe('1'); // 첫 번째가 포커스
    });

    it('빈 배열로 호출 시 선택 해제', () => {
        const { selectMultipleTasks } = useGanttStore.getState();
        selectMultipleTasks(['1', '2']);
        selectMultipleTasks([]);

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(0);
        expect(state.focusedTaskId).toBeNull();
    });
});

// ============================================
// clearSelection 테스트
// ============================================

describe('clearSelection', () => {
    it('모든 선택 상태 초기화', () => {
        const store = useGanttStore.getState();
        store.selectTask('2', { visibleTasks: mockVisibleTasks });

        store.clearSelection();

        const state = useGanttStore.getState();
        expect(state.selectedTaskIds.size).toBe(0);
        expect(state.focusedTaskId).toBeNull();
        expect(state.lastClickedIndex).toBeNull();
    });
});

// ============================================
// moveFocus 테스트
// ============================================

describe('moveFocus', () => {
    it('아무것도 선택되지 않은 상태에서 down: 첫 번째 선택', () => {
        const { moveFocus } = useGanttStore.getState();
        moveFocus('down', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('1');
        expect(state.selectedTaskIds.has('1')).toBe(true);
    });

    it('아무것도 선택되지 않은 상태에서 up: 첫 번째 선택', () => {
        const { moveFocus } = useGanttStore.getState();
        moveFocus('up', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('1');
    });

    it('포커스 아래로 이동', () => {
        const store = useGanttStore.getState();
        store.selectTask('2', { visibleTasks: mockVisibleTasks });
        store.moveFocus('down', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('3');
        expect(state.selectedTaskIds.has('3')).toBe(true);
        expect(state.selectedTaskIds.size).toBe(1); // 이전 선택은 해제
    });

    it('포커스 위로 이동', () => {
        const store = useGanttStore.getState();
        store.selectTask('3', { visibleTasks: mockVisibleTasks });
        store.moveFocus('up', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('2');
    });

    it('첫 번째에서 up: 첫 번째 유지', () => {
        const store = useGanttStore.getState();
        store.selectTask('1', { visibleTasks: mockVisibleTasks });
        store.moveFocus('up', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('1');
    });

    it('마지막에서 down: 마지막 유지', () => {
        const store = useGanttStore.getState();
        store.selectTask('5', { visibleTasks: mockVisibleTasks });
        store.moveFocus('down', mockVisibleTasks);

        const state = useGanttStore.getState();
        expect(state.focusedTaskId).toBe('5');
    });
});

// ============================================
// toggleTask (확장/접기) 테스트
// ============================================

describe('toggleTask', () => {
    it('펼치기: expandedTaskIds에 추가', () => {
        const { toggleTask } = useGanttStore.getState();
        toggleTask('group-1');

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.has('group-1')).toBe(true);
    });

    it('접기: expandedTaskIds에서 제거', () => {
        const { toggleTask } = useGanttStore.getState();
        toggleTask('group-1'); // 펼침
        toggleTask('group-1'); // 접음

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.has('group-1')).toBe(false);
    });

    it('여러 그룹 독립적으로 토글', () => {
        const { toggleTask } = useGanttStore.getState();
        toggleTask('group-1');
        toggleTask('group-2');
        toggleTask('group-1'); // group-1만 접음

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.has('group-1')).toBe(false);
        expect(state.expandedTaskIds.has('group-2')).toBe(true);
    });
});

// ============================================
// expandAll / collapseAll 테스트
// ============================================

describe('expandAll / collapseAll', () => {
    it('expandAll: 여러 Task 한 번에 펼침', () => {
        const { expandAll } = useGanttStore.getState();
        expandAll(['g1', 'g2', 'g3']);

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.size).toBe(3);
        expect(state.expandedTaskIds.has('g1')).toBe(true);
        expect(state.expandedTaskIds.has('g2')).toBe(true);
        expect(state.expandedTaskIds.has('g3')).toBe(true);
    });

    it('expandAll: 기존 펼침 상태 유지하며 추가', () => {
        const store = useGanttStore.getState();
        store.toggleTask('existing');
        store.expandAll(['g1', 'g2']);

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.has('existing')).toBe(true);
        expect(state.expandedTaskIds.has('g1')).toBe(true);
    });

    it('collapseAll: 모든 펼침 해제', () => {
        const store = useGanttStore.getState();
        store.expandAll(['g1', 'g2', 'g3']);
        store.collapseAll();

        const state = useGanttStore.getState();
        expect(state.expandedTaskIds.size).toBe(0);
    });
});

// ============================================
// setSidebarWidth 테스트
// ============================================

describe('setSidebarWidth', () => {
    it('정상 범위 내 값 설정', () => {
        const { setSidebarWidth } = useGanttStore.getState();
        setSidebarWidth(300);

        const state = useGanttStore.getState();
        expect(state.sidebarWidth).toBe(300);
    });

    it('최소값 미만이면 최소값으로 클램핑', () => {
        const { setSidebarWidth } = useGanttStore.getState();
        setSidebarWidth(50); // MIN_WIDTH보다 작음

        const state = useGanttStore.getState();
        expect(state.sidebarWidth).toBe(GANTT_LAYOUT.SIDEBAR_MIN_WIDTH);
    });

    it('최대값 초과면 최대값으로 클램핑', () => {
        const { setSidebarWidth } = useGanttStore.getState();
        setSidebarWidth(2000); // MAX_WIDTH보다 큼

        const state = useGanttStore.getState();
        expect(state.sidebarWidth).toBe(GANTT_LAYOUT.SIDEBAR_MAX_WIDTH);
    });
});

// ============================================
// Drag State 테스트
// ============================================

describe('Drag State', () => {
    it('startDrag: 드래그 상태 설정', () => {
        const { startDrag } = useGanttStore.getState();
        startDrag('move', 'task-1');

        const state = useGanttStore.getState();
        expect(state.isDragging).toBe(true);
        expect(state.dragType).toBe('move');
        expect(state.dragTaskId).toBe('task-1');
    });

    it('endDrag: 드래그 상태 초기화', () => {
        const store = useGanttStore.getState();
        store.startDrag('resize-pre', 'task-2');
        store.endDrag();

        const state = useGanttStore.getState();
        expect(state.isDragging).toBe(false);
        expect(state.dragType).toBeNull();
        expect(state.dragTaskId).toBeNull();
    });
});

// ============================================
// Compact Mode 테스트
// ============================================

describe('Compact Mode', () => {
    it('toggleCompactMode: 토글', () => {
        const { toggleCompactMode } = useGanttStore.getState();

        expect(useGanttStore.getState().isCompactMode).toBe(false);

        toggleCompactMode();
        expect(useGanttStore.getState().isCompactMode).toBe(true);

        toggleCompactMode();
        expect(useGanttStore.getState().isCompactMode).toBe(false);
    });

    it('setCompactMode: 직접 설정', () => {
        const { setCompactMode } = useGanttStore.getState();

        setCompactMode(true);
        expect(useGanttStore.getState().isCompactMode).toBe(true);

        setCompactMode(false);
        expect(useGanttStore.getState().isCompactMode).toBe(false);
    });
});

// ============================================
// setZoomLevel 테스트
// ============================================

describe('setZoomLevel', () => {
    it('줌 레벨 변경', () => {
        const { setZoomLevel } = useGanttStore.getState();

        setZoomLevel('DAY');
        expect(useGanttStore.getState().zoomLevel).toBe('DAY');

        setZoomLevel('WEEK');
        expect(useGanttStore.getState().zoomLevel).toBe('WEEK');

        setZoomLevel('MONTH');
        expect(useGanttStore.getState().zoomLevel).toBe('MONTH');
    });
});
