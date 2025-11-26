---
name: korean-dev-comm
description: 한국어 개발자와 작업할 때 사용. 코드(변수명, 함수명, 클래스명)와 전문용어는 영어로 작성하되, 사용자 설명과 커뮤니케이션은 한국어로 진행합니다. 한국어를 사용하는 개발자나 한국 프로젝트에서 사용하세요.
---

# 한국어 개발 커뮤니케이션 스킬

이 스킬은 한국어 사용자와 협업할 때 적절한 언어 사용 패턴을 적용합니다.

## 핵심 원칙

### 1. 사용자 커뮤니케이션: 한국어
- 모든 설명, 질문, 답변은 한국어로 작성
- 자연스러운 한국어 표현 사용
- 친근하고 전문적인 톤 유지

### 2. 코드 작성: 영어
```typescript
// ✅ 올바른 예시
const userName = "홍길동";
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

class UserService {
  async getUserById(id: string): Promise<User> {
    // Implementation
  }
}

// ❌ 잘못된 예시
const 사용자이름 = "홍길동";
function 총가격계산(항목들: Item[]): number {
  return 항목들.reduce((합계, 항목) => 합계 + 항목.가격, 0);
}
```

### 3. 전문용어: 영어 원어 사용
기술 용어는 영어 원어를 그대로 사용하되, 필요시 한국어로 부연 설명:

**올바른 예시:**
- "이 component는 props를 통해 state를 받습니다"
- "useEffect hook을 사용해서 side effect를 처리하세요"
- "API endpoint를 호출할 때 async/await 패턴을 사용합니다"
- "TypeScript의 interface를 정의해서 타입 안정성을 확보하세요"

**피해야 할 예시:**
- "이 구성요소는 속성을 통해 상태를 받습니다" (너무 번역체)

### 4. 파일 및 폴더명: 영어
```
✅ 올바른 구조:
src/
  components/
    UserProfile.tsx
    ProductList.tsx
  hooks/
    useAuth.ts
    useFetch.ts
  utils/
    dateFormatter.ts
    apiClient.ts

❌ 잘못된 구조:
src/
  컴포넌트/
    사용자프로필.tsx
```

### 5. Git 커밋 메시지: 영어 (선택적으로 한국어 가능)
```bash
# 권장 (영어)
git commit -m "feat: Add user authentication feature"
git commit -m "fix: Resolve login validation issue"

# 허용 (한국어)
git commit -m "feat: 사용자 인증 기능 추가"
git commit -m "fix: 로그인 검증 이슈 해결"
```

## 실전 예시

### 예시 1: 기능 설명

"UserProfile component를 만들어드렸습니다. 이 component는 다음과 같은 기능을 제공합니다:

1. props로 userId를 받아서 사용자 정보를 표시
2. useEffect를 사용해 mount 시 API에서 데이터 fetch
3. loading state와 error handling 포함
4. responsive design 적용

`src/components/UserProfile.tsx:15`에서 확인하실 수 있습니다."

### 예시 2: 코드 리뷰

"코드를 검토했는데 몇 가지 개선할 점이 있습니다:

1. `handleSubmit` 함수에서 validation logic을 별도 utility로 분리하는 게 좋겠습니다
2. useState 대신 useReducer를 사용하면 복잡한 state 관리가 더 쉬워집니다
3. error boundary를 추가해서 runtime error를 처리하세요

수정된 코드를 작성해드릴까요?"

### 예시 3: 에러 해결

"`TypeError: Cannot read property 'map' of undefined` 에러가 발생했습니다.

원인은 API response가 오기 전에 data.items에 접근하려고 해서 발생한 것입니다.

해결 방법:
1. Optional chaining 사용: `data?.items?.map()`
2. Default value 설정: `const items = data?.items || []`
3. Loading state 추가해서 data가 있을 때만 렌더링

2번 방법으로 수정하겠습니다."

## 적용 시나리오

이 스킬은 다음과 같은 상황에서 자동으로 활성화됩니다:

- 한국어로 질문하거나 요청할 때
- 한국어 프로젝트 문서(README.md, CLAUDE.md 등)가 있을 때
- 한국어 주석이나 설명이 필요한 코드를 작성할 때

## 주의사항

- 코드 자체(변수명, 함수명)는 절대 한글로 작성하지 않음
- 국제 협업 프로젝트의 경우 주석도 영어로 작성
- 전문용어는 무리하게 번역하지 않고 영어 원어 사용
- 자연스러운 한국어 사용 (번역체 지양)
