/**
 * Backend Integration Example
 * 
 * RestDataProvider를 사용한 백엔드 연동 예제입니다.
 * 서버와의 자동 동기화, lazy loading, batch mode를 포함합니다.
 */

import { useState, useEffect, useCallback } from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import { RestDataProvider } from "@svar-ui/gantt-data-provider";
import "@svar-ui/react-gantt/all.css";

// RestDataProvider 인스턴스 생성
const server = new RestDataProvider(
  "https://api.example.com",
  { 
    batchURL: "batch",  // 배치 모드 활성화
    debounce: 300       // 300ms 디바운스
  }
);

export default function BackendIntegration() {
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 초기 데이터 로딩
  useEffect(() => {
    setLoading(true);
    server.getData()
      .then(data => {
        setTasks(data.tasks);
        setLinks(data.links);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // API 초기화
  const init = useCallback((api) => {
    // RestDataProvider를 Event Bus에 연결
    // 모든 CRUD 작업이 자동으로 서버에 전송됨
    api.setNext(server);

    // Lazy loading 구현
    api.on("request-data", (ev) => {
      console.log("Requesting data for task:", ev.id);
      
      server.getData(ev.id)
        .then(({ tasks: childTasks, links: childLinks }) => {
          api.exec("provide-data", {
            id: ev.id,
            data: {
              tasks: childTasks,
              links: childLinks
            }
          });
        })
        .catch(err => {
          console.error("Failed to load child tasks:", err);
        });
    });

    // 작업 업데이트 시 로컬 상태도 업데이트
    api.on("update-task", (ev) => {
      setTasks(prevTasks => 
        prevTasks.map(t => 
          t.id === ev.id ? { ...t, ...ev.task } : t
        )
      );
    });

    // 작업 추가 시 로컬 상태 업데이트
    api.on("add-task", (ev) => {
      setTasks(prevTasks => [...prevTasks, ev.task]);
    });

    // 작업 삭제 시 로컬 상태 업데이트
    api.on("delete-task", (ev) => {
      setTasks(prevTasks => 
        prevTasks.filter(t => t.id !== ev.id)
      );
    });

    // 링크 업데이트 시 로컬 상태 업데이트
    api.on("add-link", (ev) => {
      setLinks(prevLinks => [...prevLinks, ev.link]);
    });

    api.on("delete-link", (ev) => {
      setLinks(prevLinks => 
        prevLinks.filter(l => l.id !== ev.id)
      );
    });

    // 에러 핸들링
    api.intercept("*", (data) => {
      // 검증 로직
      if (data.action === "delete-task") {
        const task = api.getTask(data.id);
        if (task?.type === "summary" && hasChildren(task.id)) {
          alert("하위 작업이 있는 요약 작업은 삭제할 수 없습니다.");
          return false;
        }
      }
    });
  }, []);

  // 하위 작업 확인 헬퍼
  const hasChildren = (parentId) => {
    return tasks.some(t => t.parent === parentId);
  };

  const scales = [
    { unit: "month", step: 1, format: "MMMM yyyy" },
    { unit: "day", step: 1, format: "d" }
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ height: "600px" }}>
      <Willow>
        <Gantt 
          tasks={tasks}
          links={links}
          scales={scales}
          init={init}
        />
      </Willow>
    </div>
  );
}

/**
 * 백엔드 예상 엔드포인트:
 * 
 * GET  /tasks           - 모든 작업 조회
 * GET  /tasks/:id       - 하위 작업 조회 (lazy loading)
 * POST /tasks           - 작업 생성
 * PUT  /tasks/:id       - 작업 수정
 * DELETE /tasks/:id     - 작업 삭제
 * 
 * GET  /links           - 모든 링크 조회
 * POST /links           - 링크 생성
 * PUT  /links/:id       - 링크 수정
 * DELETE /links/:id     - 링크 삭제
 * 
 * POST /batch           - 배치 요청 (선택사항)
 */

