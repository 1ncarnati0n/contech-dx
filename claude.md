## 일반사항

- pnpm 말고 npm 사용
- npm run dev 는 유저가 기본적으로 실행하도록, build 만 agent가 실행
- Code Review 완료시 꼭 README.md 업데이트

## 모노레포 빌드 순서

라이브러리 패키지 수정 시 반드시 **순서대로** 빌드해야 변경사항이 반영됨:

```bash
# 1. 라이브러리 먼저 빌드
cd packages/sa-gantt-lib && npm run build

# 2. 그 다음 web 빌드
cd apps/web && npm run build
```

> ⚠️ 라이브러리를 빌드하지 않으면 web이 이전 버전의 dist/를 참조함

