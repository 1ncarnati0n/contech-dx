# SVAR React Gantt Expert Skill

SVAR React Gantt v2.3.3 전문 스킬입니다. 프로덕션급 간트 차트 구현을 위한 포괄적인 가이드, API 레퍼런스, 예제 코드를 제공합니다.

## 📋 스킬 개요

이 스킬은 다음과 같은 경우에 자동으로 활성화됩니다:

- 프로젝트 관리 또는 스케줄링 애플리케이션 구축
- 간트 차트 구현 및 커스터마이징
- 작업 의존성 및 타임라인 시각화
- SVAR React Gantt 관련 질문 및 문제 해결

## 🚀 빠른 시작

### 설치

```bash
npm install @svar-ui/react-gantt
```

### 기본 구현

```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

const tasks = [
  {
    id: 1,
    text: "프로젝트 시작",
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 15),
    type: "task",
    progress: 50
  }
];

export default function App() {
  return (
    <Willow>
      <Gantt tasks={tasks} />
    </Willow>
  );
}
```

## 📁 스킬 구조

```
svar-react-gantt/
├── SKILL.md                    # 메인 스킬 문서
├── README.md                   # 이 파일
├── LICENSE.txt                 # 라이선스 정보
├── references/                 # 상세 레퍼런스
│   ├── api-reference.md        # API 전체 레퍼런스
│   ├── configuration-guide.md  # 설정 가이드
│   └── troubleshooting.md      # 문제 해결 가이드
└── examples/                   # 코드 예제
    ├── README.md               # 예제 가이드
    ├── basic-gantt.tsx         # 기본 간트 차트
    ├── backend-integration.tsx # 백엔드 연동
    ├── custom-ui.tsx           # UI 커스터마이징
    └── advanced-features.tsx   # 고급 기능
```

## 📚 문서

### SKILL.md
메인 스킬 문서로, 다음 내용을 포함합니다:
- Quick Start Guide
- Core Architecture
- API Methods
- Configuration Options
- Best Practices
- v2.3.3 신규 기능

### references/

#### api-reference.md
SVAR React Gantt의 전체 API 레퍼런스:
- API 메서드 (exec, on, intercept, getState 등)
- Actions (add-task, update-task 등)
- Properties (tasks, links, scales 등)
- Helper Components
- TypeScript Types

#### configuration-guide.md
상세한 설정 가이드:
- Scales 설정
- Columns 설정
- Task Types 설정
- Context Menu 커스터마이징
- Editor 설정
- Zoom 설정
- Styling 가이드

#### troubleshooting.md
자주 발생하는 문제와 해결 방법:
- 설치 및 초기화 문제
- 데이터 렌더링 문제
- API 및 이벤트 문제
- 백엔드 연동 문제
- 성능 문제
- TypeScript 문제
- 마이그레이션 가이드

### examples/

#### basic-gantt.tsx
가장 기본적인 간트 차트 구현:
- Tasks, Links, Scales 정의
- 테마 적용
- 기본 설정

#### backend-integration.tsx
RestDataProvider를 사용한 서버 연동:
- 자동 CRUD 동기화
- Lazy loading
- Batch mode
- 에러 핸들링

#### custom-ui.tsx
고급 UI 커스터마이징:
- 커스텀 컬럼
- 커스텀 에디터 필드
- 커스텀 컨텍스트 메뉴
- 커스텀 툴팁
- 작업 바 템플릿

#### advanced-features.tsx
고급 기능 시연:
- 동적 데이터 로딩
- 다중 정렬
- 커스텀 단축키
- 커스텀 작업 타입
- 줌 레벨
- AutoScale

## 🆕 v2.3.3 주요 기능

- ✅ TypeScript 타입 정의 내장
- ✅ Hour duration unit 지원
- ✅ Minute length unit 지원
- ✅ AutoScale property
- ✅ Hotkeys (단축키)
- ✅ Multi-sorting
- ✅ Inline editors
- ✅ Custom scale units
- ✅ Header menu

## 🔗 유용한 링크

- **Official Docs**: https://docs.svar.dev/react/gantt/
- **GitHub**: https://github.com/svar-widgets/gantt
- **NPM**: https://www.npmjs.com/package/@svar-ui/react-gantt
- **Demos**: https://docs.svar.dev/react/gantt/samples
- **Backend Example**: https://github.com/svar-widgets/gantt-backend-go

## 🌐 실시간 업데이트

이 스킬은 이제 로컬 문서 파일(docSVAR) 없이 실시간으로 공식 문서를 참조합니다:

- ✅ **자동 최신화**: Claude가 웹 검색으로 항상 최신 정보 제공
- ✅ **버전 추적**: 새 버전 릴리스 자동 감지
- ✅ **Breaking Changes 확인**: 업데이트 시 주의사항 자동 안내
- ✅ **디스크 공간 절약**: 로컬 문서 파일 불필요

### 사용 방법

```bash
# 최신 정보 확인
"SVAR Gantt 최신 버전 확인해줘"
"공식 문서에서 scales 설정 방법 찾아줘"

# 로컬 문서 정리 (선택사항)
bash .claude/skills/svar-react-gantt/scripts/cleanup-local-docs.sh
```

자세한 내용은 `scripts/update-skill.md` 참조

## 📄 라이선스

SVAR React Gantt는 GNU GPLv3 라이선스로 배포됩니다.
상용 프로젝트에서 사용하려면 별도 라이선스가 필요합니다.

Contact: support@svar.dev

이 스킬은 SVAR React Gantt v2.3.3 공식 문서를 기반으로 작성되었습니다.

## 💡 사용 팁

1. **한국어로 질문하세요**: 이 스킬은 한국어 개발자를 위해 최적화되어 있습니다.
2. **구체적으로 질문하세요**: "간트 차트에서 작업 추가하는 방법" 같이 명확하게 질문하세요.
3. **예제를 참조하세요**: examples 폴더의 코드를 직접 프로젝트에 사용할 수 있습니다.
4. **문제 해결 가이드를 확인하세요**: 막히는 부분이 있으면 troubleshooting.md를 먼저 확인하세요.

## 🤝 기여

이 스킬에 개선사항이나 추가 예제가 있다면 제안해 주세요!

---

**Version**: 1.0.0  
**Based on**: SVAR React Gantt v2.3.3  
**Last Updated**: 2024

