/**
 * Basic Gantt Chart Example
 * 
 * 기본적인 SVAR React Gantt 구현 예제입니다.
 * 작업, 링크, 스케일을 포함한 최소한의 설정으로 간트 차트를 생성합니다.
 */

import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

export default function BasicGantt() {
  // 작업 데이터
  const tasks = [
    {
      id: 1,
      text: "프로젝트 계획",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 15),
      duration: 14,
      progress: 100,
      type: "summary",
      open: true
    },
    {
      id: 2,
      text: "요구사항 분석",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 5),
      duration: 4,
      progress: 100,
      parent: 1,
      type: "task"
    },
    {
      id: 3,
      text: "설계",
      start: new Date(2024, 0, 6),
      end: new Date(2024, 0, 12),
      duration: 6,
      progress: 80,
      parent: 1,
      type: "task"
    },
    {
      id: 4,
      text: "개발",
      start: new Date(2024, 0, 16),
      end: new Date(2024, 1, 15),
      duration: 30,
      progress: 45,
      type: "summary",
      open: true
    },
    {
      id: 5,
      text: "프론트엔드 개발",
      start: new Date(2024, 0, 16),
      end: new Date(2024, 1, 5),
      duration: 20,
      progress: 60,
      parent: 4,
      type: "task"
    },
    {
      id: 6,
      text: "백엔드 개발",
      start: new Date(2024, 0, 16),
      end: new Date(2024, 1, 10),
      duration: 25,
      progress: 40,
      parent: 4,
      type: "task"
    },
    {
      id: 7,
      text: "테스트",
      start: new Date(2024, 1, 11),
      end: new Date(2024, 1, 20),
      duration: 9,
      progress: 20,
      type: "task"
    },
    {
      id: 8,
      text: "배포",
      start: new Date(2024, 1, 21),
      end: new Date(2024, 1, 21),
      type: "milestone"
    }
  ];

  // 링크 데이터 (의존성)
  const links = [
    { id: 1, source: 2, target: 3, type: "e2s" },  // 요구사항 → 설계
    { id: 2, source: 3, target: 4, type: "e2s" },  // 설계 → 개발
    { id: 3, source: 5, target: 7, type: "e2s" },  // 프론트엔드 → 테스트
    { id: 4, source: 6, target: 7, type: "e2s" },  // 백엔드 → 테스트
    { id: 5, source: 7, target: 8, type: "e2s" }   // 테스트 → 배포
  ];

  // 타임스케일 설정
  const scales = [
    { 
      unit: "month", 
      step: 1, 
      format: "MMMM yyyy" 
    },
    { 
      unit: "day", 
      step: 1, 
      format: "d" 
    }
  ];

  return (
    <div style={{ height: "600px" }}>
      <Willow>
        <Gantt 
          tasks={tasks} 
          links={links} 
          scales={scales}
        />
      </Willow>
    </div>
  );
}

