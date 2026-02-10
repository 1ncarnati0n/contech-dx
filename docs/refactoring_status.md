# apps/web 리팩토링 상태 (2026-02-10)

## 요약
- 대상: `apps/web`
- 최종 상태: `npx eslint src` 기준 `errors: 0`, `warnings: 0`
- 목표 달성: 데드 코드/미사용 모듈 정리, hooks 의존성 정합성 보정, 타입 안정성 강화
- 참고 문서: `README.md`, `Architecture.md`

## 검증
- 실행 명령:

```bash
cd apps/web
npx eslint src
```

- 최종 결과:

```text
errors: 0
warnings: 0
```

## 단계별 이력
1. 초기 정리 시작: 파싱 오류 복구 + 미사용 코드 제거 시작
2. 1차 개선: `224 (49/175) -> 214 (40/174)`
3. 2차 개선: `214 (40/174) -> 185 (14/171)`
4. 에러 0 달성: `185 (14/171) -> 171 (0/171)`
5. 미사용 변수/모듈 대량 정리: `171 -> 133 -> 102 -> 74 -> 48`
6. 훅 의존성/패턴 정리 마무리: `48 -> 5 -> 0`

## 핵심 변경 범주
- `Unused imports/variables` 정리
- `Dead code` 제거
- `react-hooks/exhaustive-deps` 보정
- `react-hooks/set-state-in-effect` 패턴 정리
- `@next/next/no-img-element` 대응 (`next/image` 전환)
- 타입 안정성 정리 (`no-explicit-any`, 빈 타입 선언 정리)

## 대표 변경 파일
- `apps/web/src/components/buildings/BuildingProcessPlanPage.tsx`
- `apps/web/src/components/buildings/BasementProcessPlanPage.tsx`
- `apps/web/src/components/buildings/DataInputPage.tsx`
- `apps/web/src/components/buildings/PlannedUnitRatePage.tsx`
- `apps/web/src/components/buildings/TradeInputCell.tsx`
- `apps/web/src/components/common/MarkdownRenderer.tsx`
- `apps/web/src/components/file-search/ChatArea.tsx`
- `apps/web/src/components/projects/AddMemberModal.tsx`
- `apps/web/src/components/projects/ProjectTeamPage.tsx`
- `apps/web/src/lib/hooks/useAsyncData.ts`
- `apps/web/src/lib/hooks/useResizableSidebar.ts`
- `apps/web/src/lib/utils/logger.ts`

## 운영 기준
- `apps/web` 변경 시 기본 검증:

```bash
cd apps/web
npx eslint src
```

- 리팩토링 상태 갱신 시 이 문서의 `요약`, `검증`, `단계별 이력`만 갱신하고, 중복 섹션은 추가하지 않습니다.
