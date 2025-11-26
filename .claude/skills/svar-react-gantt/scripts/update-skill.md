# SVAR React Gantt Skill 업데이트 가이드

이 문서는 SVAR React Gantt 스킬을 최신 공식 문서로 업데이트하는 방법을 설명합니다.

## 🌐 실시간 공식 문서 참조

이 스킬은 다음 공식 문서를 기반으로 합니다:

### 주요 문서 URL

**메인 문서:**
- Overview: https://docs.svar.dev/react/gantt/overview
- Getting Started: https://docs.svar.dev/react/gantt/getting_started
- What's New: https://docs.svar.dev/react/gantt/whats_new

**가이드:**
- Installation: https://docs.svar.dev/react/gantt/guides/installation_initialization
- Loading Data: https://docs.svar.dev/react/gantt/guides/loading_data
- Working with Server: https://docs.svar.dev/react/gantt/guides/working_with_server
- User Interface: https://docs.svar.dev/react/gantt/guides/user-interface
- Styling: https://docs.svar.dev/react/gantt/guides/styling

**Configuration:**
- Scales: https://docs.svar.dev/react/gantt/guides/configuration/configure_scales
- Columns: https://docs.svar.dev/react/gantt/guides/configuration/configure_grid
- Task Types: https://docs.svar.dev/react/gantt/guides/configuration/adding_custom_task_type
- Summary Tasks: https://docs.svar.dev/react/gantt/guides/configuration/configure_summary
- Context Menu: https://docs.svar.dev/react/gantt/guides/configuration/configure_context_menu
- Toolbar: https://docs.svar.dev/react/gantt/guides/configuration/configure_toolbar
- Editor: https://docs.svar.dev/react/gantt/guides/configuration/configure_editor
- Tooltip: https://docs.svar.dev/react/gantt/guides/configuration/adding_tooltip
- Zoom: https://docs.svar.dev/react/gantt/guides/configuration/zooming

**API:**
- API Overview: https://docs.svar.dev/react/gantt/api/overview/api_overview
- Properties: https://docs.svar.dev/react/gantt/api/overview/properties_overview
- Methods: https://docs.svar.dev/react/gantt/api/overview/methods_overview
- Actions: https://docs.svar.dev/react/gantt/api/overview/actions_overview

**Helpers:**
- RestDataProvider: https://docs.svar.dev/react/gantt/helpers/restdataprovider_api
- REST Methods: https://docs.svar.dev/react/gantt/helpers/rest_methods/overview
- REST Routes: https://docs.svar.dev/react/gantt/helpers/rest_routes/overview

---

## 🔄 스킬 업데이트 방법

### 방법 1: Claude에게 직접 요청 (권장)

스킬을 사용하는 중에 다음과 같이 요청하면 자동으로 최신 문서를 참조합니다:

```
"SVAR Gantt 공식 문서에서 최신 v2.3 변경사항 확인해줘"
"공식 문서의 scales 설정 방법 찾아줘"
"RestDataProvider 최신 사용법 알려줘"
```

Claude는 자동으로 웹 검색을 통해 최신 정보를 가져옵니다.

### 방법 2: 수동 업데이트

1. **공식 문서 확인**
   ```bash
   # 브라우저에서 확인
   open https://docs.svar.dev/react/gantt/
   ```

2. **변경사항 파악**
   - What's New 페이지 확인
   - Changelog 확인
   - Breaking Changes 확인

3. **스킬 문서 업데이트**
   - SKILL.md의 Quick Reference 업데이트
   - references/api-reference.md 업데이트
   - examples/ 코드 예제 업데이트

### 방법 3: 자동화 스크립트 (개발 중)

향후 다음 스크립트로 자동 업데이트 가능:

```bash
# 공식 문서 스크래핑 및 스킬 업데이트
python scripts/update-from-docs.py

# 특정 섹션만 업데이트
python scripts/update-from-docs.py --section api
```

---

## 📝 업데이트 체크리스트

새 버전이 릴리스되면 다음을 확인하세요:

### 1. Version 정보
- [ ] SKILL.md의 버전 번호 업데이트
- [ ] README.md의 "Based on" 버전 업데이트
- [ ] LICENSE.txt의 버전 정보 업데이트

### 2. 신규 기능
- [ ] What's New 확인
- [ ] SKILL.md에 신규 기능 추가
- [ ] api-reference.md에 새 API 추가
- [ ] configuration-guide.md에 새 설정 옵션 추가

### 3. Breaking Changes
- [ ] Breaking Changes 문서 확인
- [ ] troubleshooting.md에 마이그레이션 가이드 추가
- [ ] examples/ 코드 업데이트

### 4. 예제 코드
- [ ] 공식 샘플 코드 확인
- [ ] examples/ 폴더의 코드 검증
- [ ] TypeScript 타입 정의 확인

### 5. 문서 링크
- [ ] 모든 공식 문서 링크 유효성 확인
- [ ] 깨진 링크 수정

---

## 🔍 최신 정보 확인 방법

### GitHub에서 확인

```bash
# 최신 릴리스 확인
open https://github.com/svar-widgets/gantt/releases

# Changelog 확인
open https://github.com/svar-widgets/gantt/blob/main/CHANGELOG.md
```

### NPM에서 확인

```bash
# 최신 버전 확인
npm view @svar-ui/react-gantt version

# 모든 버전 보기
npm view @svar-ui/react-gantt versions
```

### 공식 사이트에서 확인

- **What's New**: https://docs.svar.dev/react/gantt/whats_new
- **Migration Guide**: 각 버전별 마이그레이션 가이드 확인

---

## 🤖 Claude를 통한 실시간 정보

이 스킬은 Claude의 웹 검색 기능을 활용합니다:

### 예시 질문

**최신 버전 확인:**
```
"SVAR React Gantt 최신 버전은 뭐야?"
"v2.3.3 이후 새 버전 나왔어?"
```

**특정 기능 검색:**
```
"SVAR Gantt 공식 문서에서 zoom 설정 방법 찾아줘"
"RestDataProvider batch mode 최신 사용법 알려줘"
```

**문제 해결:**
```
"SVAR Gantt TypeScript 타입 에러 해결 방법 공식 문서에서 찾아줘"
"링크가 표시 안 되는 문제 공식 문서 확인해줘"
```

---

## 📦 docSVAR 폴더 정리

이제 로컬 문서 파일(docSVAR)이 필요 없습니다:

```bash
# docSVAR 폴더 삭제 (선택사항)
rm -rf /Users/1ncarnati0n/Desktop/tsxPJT/docSVAR

# 또는 백업 후 삭제
mv /Users/1ncarnati0n/Desktop/tsxPJT/docSVAR ~/Desktop/docSVAR_backup
```

### 이제는:
- ✅ 실시간으로 공식 문서 참조
- ✅ 항상 최신 정보 제공
- ✅ 디스크 공간 절약
- ✅ 수동 업데이트 불필요

---

## 🔔 자동 알림 설정

### GitHub Watch

```bash
# 브라우저에서:
1. https://github.com/svar-widgets/gantt 방문
2. 우측 상단 "Watch" 클릭
3. "Releases only" 선택
```

### NPM 버전 체크 스크립트

```bash
# package.json에 추가
{
  "scripts": {
    "check-svar-version": "npm outdated @svar-ui/react-gantt"
  }
}

# 실행
npm run check-svar-version
```

---

## 📚 추가 리소스

### 공식 채널
- **Documentation**: https://docs.svar.dev/react/gantt/
- **GitHub**: https://github.com/svar-widgets/gantt
- **NPM**: https://www.npmjs.com/package/@svar-ui/react-gantt
- **Forum**: https://forum.svar.dev/
- **Twitter**: Follow @svarui for updates

### 커뮤니티
- **GitHub Discussions**: 질문 및 토론
- **Stack Overflow**: [svar-gantt] 태그
- **Discord**: SVAR 커뮤니티 (링크 확인 필요)

---

## ⚠️ 주의사항

1. **Breaking Changes**: 메이저 업데이트 시 반드시 마이그레이션 가이드 확인
2. **TypeScript**: 타입 정의가 변경될 수 있으므로 주의
3. **라이선스**: GNU GPLv3 라이선스는 유지됨
4. **의존성**: React 버전 호환성 확인

---

## 🆘 문제 발생 시

업데이트 중 문제가 발생하면:

1. **공식 문서 확인**: https://docs.svar.dev/react/gantt/
2. **GitHub Issues**: https://github.com/svar-widgets/gantt/issues
3. **Forum 검색**: https://forum.svar.dev/
4. **Claude에게 질문**: "SVAR Gantt 업데이트 중 [문제] 발생했어"

---

**마지막 업데이트**: 2024-11-24  
**현재 버전**: v2.3.3  
**다음 확인 예정**: 2024-12-24

