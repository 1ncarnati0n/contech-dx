# 탭 전환 최적화 검증 체크리스트

## 목표
프로젝트 상세 페이지에서 탭 클릭 시 **500ms 지연을 0-50ms로 단축** (95% 개선)

---

## 변경 사항 요약

### 핵심 변경
**파일**: `apps/web/src/components/projects/ProjectDetailClient.tsx`

1. **`handleTabChange` 함수** (Line 169-211)
   - Before: `router.replace(newUrl, { scroll: false })` ← 서버 요청 트리거
   - After: `window.history.replaceState({}, '', newUrl)` ← 순수 클라이언트

2. **의존성 배열**
   - Before: `[searchParams, router]`
   - After: `[]` (순수 함수)

3. **브라우저 뒤로가기/앞으로가기 처리** (Line 213-224)
   - Before: `useEffect([searchParams, activeTab])` ← searchParams 변경 감시
   - After: `popstate` 이벤트 리스닝 ← 브라우저 네비게이션 이벤트 직접 처리

---

## 검증 항목

### 1. 기본 기능 테스트 ✅

#### 1.1 탭 전환
- [ ] 사이드바에서 탭 클릭 시 **즉시 반응**하는가?
- [ ] 탭 콘텐츠가 **즉시 변경**되는가?
- [ ] 콘솔에서 성능 로그 확인 (`⚡ [Perf] Tab ...`)
  - [ ] 탭 전환 시간 < 100ms ✅
  - [ ] heavy tab도 < 200ms ✅

#### 1.2 URL 업데이트
- [ ] 탭 클릭 시 URL이 올바르게 변경되는가?
  - [ ] Overview: `/projects/123` (쿼리 없음)
  - [ ] 기타 탭: `/projects/123?tab=data_input`

#### 1.3 URL 공유
- [ ] URL을 복사하여 새 탭에서 열면 올바른 탭이 표시되는가?
- [ ] 다른 사용자에게 URL 공유 시 정상 작동하는가?

#### 1.4 브라우저 히스토리
- [ ] 뒤로가기 버튼 클릭 시 이전 탭으로 돌아가는가?
- [ ] 앞으로가기 버튼 클릭 시 다음 탭으로 이동하는가?

#### 1.5 페이지 새로고침
- [ ] 특정 탭에서 새로고침 시 같은 탭이 유지되는가?

---

### 2. 성능 검증 ⚡

#### 2.1 Chrome DevTools Performance 프로파일링
```
1. Chrome DevTools 열기 (F12)
2. Performance 탭 선택
3. Record 시작
4. 사이드바 탭 클릭
5. Record 중지
6. 타임라인 분석
```

**기대 결과**:
- [ ] `setState` 호출 시간: < 10ms
- [ ] 서버 요청 없음 (네트워크 탭 비어있음)
- [ ] Idle time 제거 (이전 500ms 대기 시간 사라짐)

#### 2.2 Network 탭 확인
```
1. Chrome DevTools → Network 탭
2. 탭 클릭
3. 새로운 요청 발생 확인
```

**기대 결과**:
- [ ] **새로운 네트워크 요청 없음** ✅
- [ ] RSC payload 요청 없음 ✅

---

### 3. Edge Case 테스트

#### 3.1 빈 프로젝트
- [ ] 데이터가 없는 신규 프로젝트에서도 탭 전환이 즉시 반응하는가?

#### 3.2 대용량 데이터
- [ ] 동/층/물량 데이터가 많은 프로젝트에서도 탭 전환이 빠른가?

#### 3.3 권한이 없는 탭
- [ ] 비관리자가 "공정로직" 탭 클릭 시 overview로 리다이렉트되는가?

#### 3.4 빠른 연속 클릭
- [ ] 탭을 빠르게 연속 클릭해도 정상 작동하는가?
- [ ] 상태가 꼬이지 않는가?

---

### 4. 크로스 브라우저 테스트

#### 4.1 Chrome
- [ ] 탭 전환 정상
- [ ] 브라우저 히스토리 정상

#### 4.2 Safari
- [ ] 탭 전환 정상
- [ ] 브라우저 히스토리 정상

#### 4.3 Firefox
- [ ] 탭 전환 정상
- [ ] 브라우저 히스토리 정상

---

## 성능 측정 방법

### 콘솔 로그 확인
```javascript
// 콘솔에 자동 출력되는 성능 로그
⚡ [Perf] Tab "프로젝트 개요" (overview): 12.34ms
✅ Excellent performance (< 100ms)
```

### 기대 성능
| 탭 유형 | 기대 시간 | 임계값 |
|---------|-----------|--------|
| Light tabs (overview, data_input) | < 50ms | < 100ms |
| Heavy tabs (building_process_plan) | < 100ms | < 200ms |

---

## 롤백 방법

### Level 1: 코드 복원
```typescript
// ProjectDetailClient.tsx의 handleTabChange를 원래대로
const handleTabChange = useCallback((tab: string) => {
  setActiveTab(tab);

  const params = new URLSearchParams(searchParams.toString());
  if (tab === 'overview') {
    params.delete('tab');
  } else {
    params.set('tab', tab);
  }

  const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
  router.replace(newUrl, { scroll: false });
}, [searchParams, router]);
```

### Level 2: Git Revert
```bash
git log --oneline  # 커밋 해시 확인
git revert <commit-hash>
```

---

## 검증 완료 기준

### 필수 조건 (모두 ✅)
- [ ] 탭 전환 시간 < 100ms (heavy tabs < 200ms)
- [ ] 서버 요청 없음 (Network 탭 비어있음)
- [ ] URL 공유 기능 정상
- [ ] 브라우저 히스토리 정상
- [ ] 페이지 새로고침 시 탭 상태 유지

### 권장 사항
- [ ] 3개 이상의 브라우저에서 테스트 완료
- [ ] 빈 프로젝트 및 대용량 프로젝트 모두 테스트
- [ ] 최소 5번의 탭 전환 테스트

---

## 추가 확인 사항

### TypeScript 컴파일
```bash
cd apps/web
npm run build
# ✅ 빌드 성공 확인됨
```

### 콘솔 에러 확인
- [ ] 브라우저 콘솔에 에러 없음
- [ ] React DevTools에 경고 없음

---

## 결과 기록

### 측정 결과
| 탭 | Before | After | 개선율 |
|-----|--------|-------|--------|
| overview | 500ms | __ms | __% |
| data_input | 500ms | __ms | __% |
| building_process_plan | 500ms | __ms | __% |

### 발견된 문제
(여기에 문제 기록)

### 개선 제안
(여기에 추가 개선 사항 기록)

---

## 참고 문서
- 계획 문서: `/Users/1ncarnati0n/.claude/projects/.../01054c98-cd0c-4533-b505-0d01157a5d99.jsonl`
- README 업데이트: `README.md` (Line 438-477)
- 변경 파일: `ProjectDetailClient.tsx` (Line 169-224)
