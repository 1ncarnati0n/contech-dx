/**
 * Mock Gantt Chart Initializer
 * 브라우저 콘솔에서 실행하여 테스트용 Gantt Chart 생성
 */

// 1. Mock Gantt Chart 생성
const mockGanttChart = {
    id: 'mock-chart-1',
    project_id: 'mock-project-1',
    name: '서울 강남 오피스 빌딩 공정표',
    description: '신축 공사 전체 공정 관리',
    start_date: '2024-01-01',
    end_date: '2025-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

// 2. LocalStorage에 저장
const existingCharts = localStorage.getItem('contech_dx_gantt_charts');
const charts = existingCharts ? JSON.parse(existingCharts) : [];

// 이미 존재하는지 확인
const exists = charts.some(c => c.id === mockGanttChart.id);

if (!exists) {
    charts.push(mockGanttChart);
    localStorage.setItem('contech_dx_gantt_charts', JSON.stringify(charts));
    console.log('✅ Mock Gantt Chart 생성 완료:', mockGanttChart.id);
} else {
    console.log('ℹ️  Mock Gantt Chart가 이미 존재합니다:', mockGanttChart.id);
}

// 3. 결과 출력
console.log('📊 현재 Gantt Charts:', charts);
console.log('🔗 테스트 URL:', `http://localhost:3000/projects/mock-project-1/gantt/mock-chart-1`);
