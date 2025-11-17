import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Contech DX 건축 설계+시공 디지털 전환 플랫폼
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        게시판, 간트차트 공정관리, 프로젝트 관리, 대시보드, 유저관리 등 건설데이터 구축
      </p>

      <Link href="/posts" className="btn">
        게시판
      </Link>

      <div className="mt-12 bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">🎯ToDoList</h2>
        <ol className="text-left space-y-2 text-gray-700">
          <li>1. Gantt 차트 기본공정 mockup앱과 통합</li>
          <li>2. 기획 반영한 UX UI 반영하기</li>
          <li>3. 유저 등급관리 업데이트</li>
          <li>4. WBS, EVMS, PMIS 개념기반 기획</li>
        </ol>
      </div>
    </div>
  );
}
