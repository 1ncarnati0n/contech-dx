# Supabase 마이그레이션 가이드

## 현재 구조

현재 애플리케이션은 `mockStorage`를 통해 데이터를 저장하고 있으며, Supabase로의 마이그레이션을 쉽게 할 수 있도록 구조화되어 있습니다.

## 데이터 구조

### 1. Buildings (동 정보)

```typescript
{
  id: string;
  projectId: string;
  buildingName: string;
  buildingNumber: number;
  meta: BuildingMeta;
  createdAt: string;
  updatedAt: string;
}
```

**Supabase 테이블 구조:**
```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_name TEXT NOT NULL,
  building_number INTEGER NOT NULL,
  meta JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Floors (층 정보)

```typescript
{
  id: string;
  buildingId: string;
  floorLabel: string;
  floorNumber: number;
  levelType: '지하' | '지상';
  floorClass: FloorClass;
  height: number | null;
}
```

**Supabase 테이블 구조:**
```sql
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  floor_label TEXT NOT NULL,
  floor_number INTEGER NOT NULL,
  level_type TEXT NOT NULL CHECK (level_type IN ('지하', '지상')),
  floor_class TEXT NOT NULL CHECK (floor_class IN ('지하층', '일반층', '셋팅층', '기준층', '최상층', 'PH층')),
  height NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Floor Trades (층별 공종 데이터 - 물량 정보)

```typescript
{
  id: string;
  floorId: string;
  buildingId: string;
  tradeGroup: string; // '버림', '기초', '아파트'
  trades: {
    gangForm?: { areaM2: number; productivity: number; workers: number; cost: number };
    alForm?: { areaM2: number; productivity: number; workers: number; cost: number };
    formwork?: { areaM2: number; productivity: number; workers: number; cost: number };
    stripClean?: { areaM2: number; productivityM2: number; workers: number; cost: number };
    rebar?: { ton: number; productivity: number; workers: number; cost: number };
    concrete?: { volumeM3: number; equipmentCount: number; productivityM3: number; workers: number; cost: number };
  };
}
```

**Supabase 테이블 구조:**
```sql
CREATE TABLE floor_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  trade_group TEXT NOT NULL CHECK (trade_group IN ('버림', '기초', '아파트')),
  trades JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(floor_id, trade_group)
);

-- 인덱스 추가
CREATE INDEX idx_floor_trades_building_id ON floor_trades(building_id);
CREATE INDEX idx_floor_trades_floor_id ON floor_trades(floor_id);
```

## 데이터 저장 흐름

### 물량 입력 데이터 저장

1. **사용자 입력** → `FloorTradeTable` 컴포넌트
2. **자동 저장** (500ms 디바운스) → `saveFloorTrade` (buildings.ts)
3. **캐시 업데이트** → 메모리 캐시
4. **스토리지 저장** → `mockStorage.saveFloorTrade`
   - 브라우저: localStorage
   - Node.js: mock.json 파일

### Supabase 마이그레이션 시 변경 사항

`src/lib/services/mockStorage.ts` 파일에서 각 함수를 Supabase 클라이언트로 교체:

```typescript
// 예시: saveFloorTrade
export async function saveFloorTrade(trade: FloorTrade): Promise<void> {
  // 브라우저 환경
  if (isBrowser) {
    const supabase = createClient();
    const { error } = await supabase
      .from('floor_trades')
      .upsert({
        id: trade.id,
        floor_id: trade.floorId,
        building_id: trade.buildingId,
        trade_group: trade.tradeGroup,
        trades: trade.trades,
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      logger.error('Error saving floor trade:', error);
      throw error;
    }
  }
}
```

## Mock 데이터 Export/Import

현재 mockStorage에서 제공하는 기능:

- **Export**: `exportMockDataAsJson()` - 모든 데이터를 JSON 문자열로 반환
- **Import**: `importMockDataFromJson(jsonString)` - JSON 문자열에서 데이터 가져오기

이를 활용하여 Supabase로 데이터를 마이그레이션할 수 있습니다.

## 마이그레이션 스크립트 예시

```typescript
import { loadMockData } from '@/lib/services/mockStorage';
import { createClient } from '@/lib/supabase/client';

async function migrateToSupabase() {
  const data = await loadMockData();
  const supabase = createClient();

  // Buildings 마이그레이션
  for (const building of data.buildings) {
    const { error } = await supabase
      .from('buildings')
      .upsert({
        id: building.id,
        project_id: building.projectId,
        building_name: building.buildingName,
        building_number: building.buildingNumber,
        meta: building.meta,
        created_at: building.createdAt,
        updated_at: building.updatedAt,
      });
    
    if (error) console.error('Error migrating building:', error);
  }

  // Floors 마이그레이션
  for (const floor of data.floors) {
    const { error } = await supabase
      .from('floors')
      .upsert({
        id: floor.id,
        building_id: floor.buildingId,
        floor_label: floor.floorLabel,
        floor_number: floor.floorNumber,
        level_type: floor.levelType,
        floor_class: floor.floorClass,
        height: floor.height,
      });
    
    if (error) console.error('Error migrating floor:', error);
  }

  // Floor Trades 마이그레이션 (물량 데이터)
  for (const trade of data.floorTrades) {
    const { error } = await supabase
      .from('floor_trades')
      .upsert({
        id: trade.id,
        floor_id: trade.floorId,
        building_id: trade.buildingId,
        trade_group: trade.tradeGroup,
        trades: trade.trades,
      });
    
    if (error) console.error('Error migrating floor trade:', error);
  }
}
```

## RLS (Row Level Security) 정책 예시

```sql
-- Buildings RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view buildings in their projects"
  ON buildings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = buildings.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Floors RLS
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view floors in their projects"
  ON floors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM buildings
      JOIN project_members ON project_members.project_id = buildings.project_id
      WHERE buildings.id = floors.building_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Floor Trades RLS
ALTER TABLE floor_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view floor trades in their projects"
  ON floor_trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM floors
      JOIN buildings ON buildings.id = floors.building_id
      JOIN project_members ON project_members.project_id = buildings.project_id
      WHERE floors.id = floor_trades.floor_id
      AND project_members.user_id = auth.uid()
    )
  );
```

## 현재 저장 위치

- **브라우저**: `localStorage`에 다음 키로 저장
  - `contech_buildings`
  - `contech_floors`
  - `contech_floor_trades`

- **Node.js**: `mock.json` 파일 (프로젝트 루트)

## 주의사항

1. 모든 데이터는 자동으로 저장됩니다 (500ms 디바운스)
2. mockStorage는 현재 프로젝트별로 분리되지 않습니다 (추후 개선 필요)
3. Supabase 마이그레이션 시 UUID 형식으로 ID를 변환해야 할 수 있습니다

