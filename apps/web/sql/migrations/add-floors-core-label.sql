-- ============================================
-- floors 테이블에 core_label 컬럼 추가
-- 기존 floor_label에서 '코어N-' prefix를 분리
-- ============================================

-- 1. core_label 컬럼 추가 (1~4, NOT NULL, 기본값 1)
ALTER TABLE floors
  ADD COLUMN IF NOT EXISTS core_label INTEGER NOT NULL DEFAULT 1
  CHECK (core_label >= 1 AND core_label <= 4);

-- 2. 기존 데이터 마이그레이션: '코어N-' prefix에서 N 추출 → core_label에 저장
UPDATE floors
SET core_label = CAST(substring(floor_label FROM '코어(\d+)-') AS INTEGER)
WHERE floor_label ~ '^코어\d+-';

-- 3. floor_label에서 '코어N-' prefix 제거
UPDATE floors
SET floor_label = regexp_replace(floor_label, '^코어\d+-', '')
WHERE floor_label ~ '^코어\d+-';

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_floors_core_label ON floors(core_label);

-- 5. 코멘트
COMMENT ON COLUMN floors.core_label IS '코어 번호 (1~4, 단일 코어는 1)';
