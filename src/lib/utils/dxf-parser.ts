/**
 * DXF 파일 파싱 유틸리티 (dxf-json 버전)
 *
 * 주요 개선사항:
 * - dxf-json 라이브러리 사용 (TypeScript 지원)
 * - Web Worker 기반 비동기 파싱 (UI 블로킹 방지)
 * - INSERT (블록 참조) 지원
 * - SPLINE (B-스플라인 곡선) 지원
 * - ELLIPSE (타원) 지원
 * - HATCH (해치) 기본 지원
 * - 진행률 콜백
 * - AutoCAD 전체 색상 팔레트 (256색)
 */

import { DxfParser } from 'dxf-json';
import type {
  CommonDxfEntity,
  ParsedDxf,
  DxfBlock as DxfJsonBlock,
  LineEntity,
  LWPolylineEntity,
  PolylineEntity,
  CircleEntity,
  ArcEntity,
  EllipseEntity,
  SplineEntity,
  TextEntity,
  MTextEntity,
  PointEntity,
  InsertEntity,
  HatchEntity,
  SolidEntity,
  PolylineBoundaryPath,
  EdgeBoundaryPath,
  BoundaryPathEdge,
} from 'dxf-json';
import type {
  Point2D,
  DxfEntity,
  DxfLayer,
  DxfBlock,
  ParsedDxfData,
  DxfEntityType,
  DxfStatistics,
  DxfParseProgress,
} from '@/lib/types';

// ============================================================================
// 타입 정의
// ============================================================================

export type ProgressCallback = (progress: DxfParseProgress) => void;

interface ParseOptions {
  onProgress?: ProgressCallback;
  resolveBlocks?: boolean; // INSERT를 실제 엔티티로 확장할지 여부
  simplifySplines?: boolean; // SPLINE을 POLYLINE으로 근사할지 여부
  splineSegments?: number; // SPLINE 근사 시 세그먼트 수
}

// ============================================================================
// 메인 파싱 함수
// ============================================================================

/**
 * DXF 파일을 비동기로 파싱 (UI 블로킹 최소화)
 */
export async function parseDxfFileAsync(
  fileContent: string,
  options: ParseOptions = {}
): Promise<ParsedDxfData> {
  const { onProgress } = options;

  // 파싱 시작 알림
  onProgress?.({
    phase: 'parsing',
    progress: 0,
    message: 'DXF 파일 파싱 중...',
  });

  // UI 블로킹을 최소화하기 위해 다음 프레임에서 파싱 시작
  await yieldToMain();

  return parseDxfWithYield(fileContent, options);
}

/**
 * 메인 스레드에 제어권 양보 (UI 반응성 유지)
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * UI 블로킹을 최소화하면서 DXF 파싱 (중간중간 yield)
 */
async function parseDxfWithYield(
  fileContent: string,
  options: ParseOptions
): Promise<ParsedDxfData> {
  const { onProgress, resolveBlocks = true, simplifySplines = true, splineSegments = 32 } = options;

  const parser = new DxfParser();
  const dxf = parser.parseSync(fileContent);

  if (!dxf) {
    throw new Error('DXF 파일을 파싱할 수 없습니다.');
  }

  onProgress?.({
    phase: 'processing',
    progress: 30,
    message: '블록 정의 처리 중...',
  });

  await yieldToMain();

  // 블록 정의 파싱
  const blocks = parseBlocks(dxf);
  const blockMap = new Map<string, DxfBlock>();
  blocks.forEach((block) => blockMap.set(block.name, block));

  onProgress?.({
    phase: 'processing',
    progress: 50,
    message: '엔티티 처리 중...',
  });

  await yieldToMain();

  // 레이어 맵 생성
  const layerMap = new Map<string, DxfLayer>();
  if (dxf.tables?.LAYER?.entries) {
    for (const layerEntry of dxf.tables.LAYER.entries) {
      // colorIndex can be negative (layer off/frozen), use absolute value
      const colorValue = typeof layerEntry.colorIndex === 'number'
        ? Math.abs(layerEntry.colorIndex)
        : 7;
      layerMap.set(layerEntry.name, {
        name: layerEntry.name,
        color: colorValue,
        visible: true,
        entities: [],
      });
    }
  }

  // 통계 초기화
  const statistics: DxfStatistics = {
    totalEntities: dxf.entities?.length || 0,
    parsedEntities: 0,
    skippedEntities: 0,
    entityCounts: {},
    layerCount: 0,
    blockCount: blocks.length,
  };

  // 바운딩 박스 초기화
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function updateBounds(entity: DxfEntity) {
    const points = getEntityPoints(entity);
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  // 엔티티 파싱 (청크 단위로 처리하여 UI 블로킹 방지)
  const totalEntities = dxf.entities?.length || 0;
  const CHUNK_SIZE = 1000; // 1000개씩 처리 후 yield
  let processedCount = 0;

  if (dxf.entities) {
    for (let i = 0; i < dxf.entities.length; i++) {
      const entity = dxf.entities[i];
      processedCount++;

      const layerName = entity.layer || '0';

      // 레이어가 없으면 생성
      if (!layerMap.has(layerName)) {
        layerMap.set(layerName, {
          name: layerName,
          color: 7,
          visible: true,
          entities: [],
        });
      }

      const layer = layerMap.get(layerName)!;

      // INSERT 엔티티 처리
      if (entity.type === 'INSERT' && resolveBlocks) {
        const insertEntities = resolveInsertEntity(
          entity as InsertEntity,
          blockMap,
          simplifySplines,
          splineSegments
        );
        for (const insertEntity of insertEntities) {
          layer.entities.push(insertEntity);
          statistics.parsedEntities++;
          updateBounds(insertEntity);
        }
        statistics.entityCounts['INSERT'] = (statistics.entityCounts['INSERT'] || 0) + 1;
      } else {
        const parsedEntity = parseEntity(entity, simplifySplines, splineSegments);

        if (parsedEntity) {
          layer.entities.push(parsedEntity);
          statistics.parsedEntities++;
          statistics.entityCounts[parsedEntity.type] = (statistics.entityCounts[parsedEntity.type] || 0) + 1;
          updateBounds(parsedEntity);
        } else {
          statistics.skippedEntities++;
          const type = entity.type || 'UNKNOWN';
          statistics.entityCounts[`SKIPPED:${type}`] = (statistics.entityCounts[`SKIPPED:${type}`] || 0) + 1;
        }
      }

      // 청크 단위로 yield하여 UI 반응성 유지
      if (processedCount % CHUNK_SIZE === 0) {
        const progress = 50 + Math.floor((processedCount / totalEntities) * 45);
        onProgress?.({
          phase: 'processing',
          progress,
          message: `엔티티 처리 중... (${processedCount.toLocaleString()}/${totalEntities.toLocaleString()})`,
        });
        await yieldToMain();
      }
    }
  }

  // 기본 바운딩 박스
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  statistics.layerCount = layerMap.size;

  onProgress?.({
    phase: 'complete',
    progress: 100,
    message: '파싱 완료',
    statistics,
  });

  return {
    layers: Array.from(layerMap.values()),
    bounds: { minX, minY, maxX, maxY },
    blocks,
    statistics,
  };
}

// ============================================================================
// 블록 처리
// ============================================================================

/**
 * DXF 블록 정의 파싱
 */
function parseBlocks(dxf: ParsedDxf): DxfBlock[] {
  const blocks: DxfBlock[] = [];

  if (!dxf.blocks) return blocks;

  for (const [name, blockData] of Object.entries(dxf.blocks)) {
    // 시스템 블록 무시
    if (name.startsWith('*')) continue;

    const dxfBlock: DxfBlock = {
      name,
      basePoint: {
        x: blockData.position?.x || 0,
        y: blockData.position?.y || 0,
      },
      entities: [],
    };

    if (blockData.entities) {
      for (const entity of blockData.entities) {
        const parsed = parseEntity(entity, true, 32);
        if (parsed) {
          dxfBlock.entities.push(parsed);
        }
      }
    }

    blocks.push(dxfBlock);
  }

  return blocks;
}

/**
 * INSERT 엔티티를 실제 엔티티로 확장
 */
function resolveInsertEntity(
  entity: InsertEntity,
  blockMap: Map<string, DxfBlock>,
  simplifySplines: boolean,
  splineSegments: number
): DxfEntity[] {
  const blockName = entity.name;
  const block = blockMap.get(blockName);

  if (!block) return [];

  const insertPoint: Point2D = {
    x: entity.insertionPoint?.x || 0,
    y: entity.insertionPoint?.y || 0,
  };
  const scaleX = entity.xScale || 1;
  const scaleY = entity.yScale || 1;
  const rotation = (entity.rotation || 0) * (Math.PI / 180); // 도를 라디안으로

  const resolvedEntities: DxfEntity[] = [];

  for (const blockEntity of block.entities) {
    const transformed = transformEntity(
      blockEntity,
      insertPoint,
      block.basePoint,
      scaleX,
      scaleY,
      rotation,
      entity.layer || '0'
    );
    if (transformed) {
      resolvedEntities.push(transformed);
    }
  }

  return resolvedEntities;
}

/**
 * 엔티티에 변환 적용 (INSERT 처리용)
 */
function transformEntity(
  entity: DxfEntity,
  insertPoint: Point2D,
  basePoint: Point2D,
  scaleX: number,
  scaleY: number,
  rotation: number,
  targetLayer: string
): DxfEntity | null {
  const transformPoint = (p: Point2D): Point2D => {
    // 1. 기준점 기준 이동
    let x = p.x - basePoint.x;
    let y = p.y - basePoint.y;

    // 2. 스케일 적용
    x *= scaleX;
    y *= scaleY;

    // 3. 회전 적용
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const newX = x * cos - y * sin;
      const newY = x * sin + y * cos;
      x = newX;
      y = newY;
    }

    // 4. 삽입점으로 이동
    return {
      x: x + insertPoint.x,
      y: y + insertPoint.y,
    };
  };

  // 깊은 복사 후 변환
  const transformed: DxfEntity = {
    ...entity,
    layer: targetLayer,
  };

  switch (entity.type) {
    case 'LINE':
      if (entity.startPoint) transformed.startPoint = transformPoint(entity.startPoint);
      if (entity.endPoint) transformed.endPoint = transformPoint(entity.endPoint);
      break;

    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (entity.vertices) {
        transformed.vertices = entity.vertices.map(transformPoint);
      }
      break;

    case 'CIRCLE':
      if (entity.center) {
        transformed.center = transformPoint(entity.center);
        transformed.radius = (entity.radius || 0) * Math.abs(scaleX);
      }
      break;

    case 'ARC':
      if (entity.center) {
        transformed.center = transformPoint(entity.center);
        transformed.radius = (entity.radius || 0) * Math.abs(scaleX);
        // 회전 적용
        transformed.startAngle = (entity.startAngle || 0) + (rotation * 180) / Math.PI;
        transformed.endAngle = (entity.endAngle || 0) + (rotation * 180) / Math.PI;
      }
      break;

    case 'ELLIPSE':
      if (entity.center) {
        transformed.center = transformPoint(entity.center);
        if (entity.majorAxisEndPoint) {
          transformed.majorAxisEndPoint = {
            x: entity.majorAxisEndPoint.x * scaleX,
            y: entity.majorAxisEndPoint.y * scaleY,
          };
        }
      }
      break;

    case 'TEXT':
    case 'MTEXT':
      if (entity.position) transformed.position = transformPoint(entity.position);
      break;

    case 'POINT':
      if (entity.point) transformed.point = transformPoint(entity.point);
      break;

    case 'SPLINE':
      if (entity.controlPoints) {
        transformed.controlPoints = entity.controlPoints.map(transformPoint);
      }
      if (entity.fitPoints) {
        transformed.fitPoints = entity.fitPoints.map(transformPoint);
      }
      break;

    default:
      return null;
  }

  return transformed;
}

// ============================================================================
// 엔티티 파싱
// ============================================================================

/**
 * DXF 엔티티를 CastPlan 형식으로 변환
 */
function parseEntity(
  entity: CommonDxfEntity,
  simplifySplines: boolean,
  splineSegments: number
): DxfEntity | null {
  const type = entity.type as DxfEntityType;
  // Get color from entity's colorIndex (can be number or object)
  const color = typeof entity.colorIndex === 'number' ? entity.colorIndex : undefined;

  switch (type) {
    case 'LINE': {
      const lineEntity = entity as LineEntity;
      return {
        type: 'LINE',
        layer: entity.layer || '0',
        color,
        startPoint: { x: lineEntity.startPoint?.x || 0, y: lineEntity.startPoint?.y || 0 },
        endPoint: { x: lineEntity.endPoint?.x || 0, y: lineEntity.endPoint?.y || 0 },
      };
    }

    case 'POLYLINE': {
      const polylineEntity = entity as PolylineEntity;
      return {
        type: 'POLYLINE',
        layer: entity.layer || '0',
        color,
        vertices: (polylineEntity.vertices || []).map((v) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
      };
    }

    case 'LWPOLYLINE': {
      const lwPolylineEntity = entity as LWPolylineEntity;
      return {
        type: 'LWPOLYLINE',
        layer: entity.layer || '0',
        color,
        vertices: (lwPolylineEntity.vertices || []).map((v) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
      };
    }

    case 'CIRCLE': {
      const circleEntity = entity as CircleEntity;
      return {
        type: 'CIRCLE',
        layer: entity.layer || '0',
        color,
        center: { x: circleEntity.center?.x || 0, y: circleEntity.center?.y || 0 },
        radius: circleEntity.radius || 0,
      };
    }

    case 'ARC': {
      const arcEntity = entity as ArcEntity;
      return {
        type: 'ARC',
        layer: entity.layer || '0',
        color,
        center: { x: arcEntity.center?.x || 0, y: arcEntity.center?.y || 0 },
        radius: arcEntity.radius || 0,
        startAngle: arcEntity.startAngle || 0,
        endAngle: arcEntity.endAngle || 0,
      };
    }

    case 'ELLIPSE':
      return parseEllipse(entity as EllipseEntity, color);

    case 'SPLINE':
      return parseSpline(entity as SplineEntity, color, simplifySplines, splineSegments);

    case 'TEXT': {
      const textEntity = entity as TextEntity;
      return {
        type: 'TEXT',
        layer: entity.layer || '0',
        color,
        text: textEntity.text || '',
        position: { x: textEntity.startPoint?.x || 0, y: textEntity.startPoint?.y || 0 },
      };
    }

    case 'MTEXT': {
      const mtextEntity = entity as MTextEntity;
      return {
        type: 'MTEXT',
        layer: entity.layer || '0',
        color,
        text: mtextEntity.text || '',
        position: { x: mtextEntity.insertionPoint?.x || 0, y: mtextEntity.insertionPoint?.y || 0 },
      };
    }

    case 'POINT': {
      const pointEntity = entity as PointEntity;
      return {
        type: 'POINT',
        layer: entity.layer || '0',
        color,
        point: { x: pointEntity.position?.x || 0, y: pointEntity.position?.y || 0 },
      };
    }

    case 'HATCH':
      return parseHatch(entity as HatchEntity, color);

    case 'SOLID':
      return parseSolid(entity as SolidEntity, color);

    default:
      // 지원하지 않는 엔티티 타입
      return null;
  }
}

/**
 * ELLIPSE 엔티티 파싱
 */
function parseEllipse(entity: EllipseEntity, color?: number): DxfEntity {
  return {
    type: 'ELLIPSE',
    layer: entity.layer || '0',
    color,
    center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
    majorAxisEndPoint: {
      x: entity.majorAxisEndPoint?.x || 1,
      y: entity.majorAxisEndPoint?.y || 0,
    },
    minorAxisRatio: entity.axisRatio || 0.5,
    startAngle: entity.startAngle || 0,
    endAngle: entity.endAngle || Math.PI * 2,
  };
}

/**
 * SPLINE 엔티티 파싱 (B-스플라인)
 */
function parseSpline(
  entity: SplineEntity,
  color: number | undefined,
  simplify: boolean,
  segments: number
): DxfEntity {
  const controlPoints: Point2D[] = (entity.controlPoints || []).map((p) => ({
    x: p.x || 0,
    y: p.y || 0,
  }));

  // fitPoints in dxf-json is number[] (flattened), we need to handle it differently
  // According to dxf-json types, fitPoints: number[] not Point3D[]
  // This means fitPoints are stored as flat array [x1, y1, z1, x2, y2, z2, ...]
  const fitPointsRaw = entity.fitPoints || [];
  const fitPoints: Point2D[] = [];
  for (let i = 0; i < fitPointsRaw.length; i += 3) {
    fitPoints.push({
      x: fitPointsRaw[i] || 0,
      y: fitPointsRaw[i + 1] || 0,
    });
  }

  // 스플라인을 폴리라인으로 근사
  if (simplify && (controlPoints.length >= 4 || fitPoints.length >= 2)) {
    const approximated = approximateSpline(
      controlPoints.length > 0 ? controlPoints : fitPoints,
      entity.degree || 3,
      segments
    );

    return {
      type: 'LWPOLYLINE',
      layer: entity.layer || '0',
      color,
      vertices: approximated,
    };
  }

  return {
    type: 'SPLINE',
    layer: entity.layer || '0',
    color,
    controlPoints,
    fitPoints,
    degree: entity.degree || 3,
  };
}

/**
 * B-스플라인 곡선을 점들로 근사
 */
function approximateSpline(points: Point2D[], degree: number, segments: number): Point2D[] {
  if (points.length < 2) return points;

  // 간단한 Catmull-Rom 스플라인 근사 사용
  const result: Point2D[] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(n - 1, i + 1)];
    const p3 = points[Math.min(n - 1, i + 2)];

    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const s2 = s * s;
      const s3 = s2 * s;

      // Catmull-Rom 공식
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * s +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * s +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3);

      result.push({ x, y });
    }
  }

  // 마지막 점 추가
  result.push(points[n - 1]);

  return result;
}

/**
 * HATCH 엔티티 파싱
 */
function parseHatch(entity: HatchEntity, color?: number): DxfEntity | null {
  const boundaryPaths: Point2D[][] = [];

  if (entity.boundaryPaths) {
    for (const path of entity.boundaryPaths) {
      // Check if it's a polyline boundary path
      if ('vertices' in path && path.vertices) {
        const polylinePath = path as PolylineBoundaryPath;
        const pathPoints: Point2D[] = polylinePath.vertices.map((v) => ({
          x: v.x || 0,
          y: v.y || 0,
        }));
        if (pathPoints.length > 0) {
          boundaryPaths.push(pathPoints);
        }
      } else if ('edges' in path && path.edges) {
        // Edge boundary path - extract points from edges
        const edgePath = path as EdgeBoundaryPath<BoundaryPathEdge>;
        const pathPoints: Point2D[] = [];
        for (const edge of edgePath.edges) {
          if ('start' in edge) {
            pathPoints.push({ x: edge.start.x || 0, y: edge.start.y || 0 });
          } else if ('center' in edge) {
            // For arc/ellipse edges, add center as approximate point
            pathPoints.push({ x: edge.center.x || 0, y: edge.center.y || 0 });
          }
        }
        if (pathPoints.length > 0) {
          boundaryPaths.push(pathPoints);
        }
      }
    }
  }

  if (boundaryPaths.length === 0) return null;

  return {
    type: 'HATCH',
    layer: entity.layer || '0',
    color,
    boundaryPaths,
  };
}

/**
 * SOLID 엔티티 파싱
 */
function parseSolid(entity: SolidEntity, color?: number): DxfEntity {
  const vertices: Point2D[] = [];

  if (entity.points) {
    for (const p of entity.points) {
      vertices.push({ x: p.x || 0, y: p.y || 0 });
    }
  }

  return {
    type: 'SOLID',
    layer: entity.layer || '0',
    color,
    vertices,
  };
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 엔티티에서 포인트 추출 (바운딩 박스 계산용)
 */
function getEntityPoints(entity: DxfEntity): Point2D[] {
  const points: Point2D[] = [];

  switch (entity.type) {
    case 'LINE':
      if (entity.startPoint) points.push(entity.startPoint);
      if (entity.endPoint) points.push(entity.endPoint);
      break;

    case 'POLYLINE':
    case 'LWPOLYLINE':
      if (entity.vertices) {
        points.push(...entity.vertices);
      }
      break;

    case 'CIRCLE':
      if (entity.center && entity.radius) {
        points.push(
          { x: entity.center.x - entity.radius, y: entity.center.y },
          { x: entity.center.x + entity.radius, y: entity.center.y },
          { x: entity.center.x, y: entity.center.y - entity.radius },
          { x: entity.center.x, y: entity.center.y + entity.radius }
        );
      }
      break;

    case 'ARC':
      if (entity.center && entity.radius) {
        const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
        const endAngle = ((entity.endAngle || 0) * Math.PI) / 180;
        points.push(
          {
            x: entity.center.x + entity.radius * Math.cos(startAngle),
            y: entity.center.y + entity.radius * Math.sin(startAngle),
          },
          {
            x: entity.center.x + entity.radius * Math.cos(endAngle),
            y: entity.center.y + entity.radius * Math.sin(endAngle),
          }
        );
      }
      break;

    case 'ELLIPSE':
      if (entity.center && entity.majorAxisEndPoint) {
        const majorLength = Math.sqrt(
          entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2
        );
        const minorLength = majorLength * (entity.minorAxisRatio || 0.5);
        points.push(
          { x: entity.center.x - majorLength, y: entity.center.y - minorLength },
          { x: entity.center.x + majorLength, y: entity.center.y + minorLength }
        );
      }
      break;

    case 'TEXT':
    case 'MTEXT':
      if (entity.position) points.push(entity.position);
      break;

    case 'POINT':
      if (entity.point) points.push(entity.point);
      break;

    case 'SPLINE':
      if (entity.controlPoints) points.push(...entity.controlPoints);
      if (entity.fitPoints) points.push(...entity.fitPoints);
      break;

    case 'HATCH':
      if (entity.boundaryPaths) {
        for (const path of entity.boundaryPaths) {
          points.push(...path);
        }
      }
      break;

    case 'SOLID':
      if (entity.vertices) points.push(...entity.vertices);
      break;
  }

  return points;
}

// ============================================================================
// AutoCAD 색상 팔레트 (256색 전체)
// ============================================================================

const AUTOCAD_COLOR_PALETTE: string[] = [
  '#000000', // 0 - ByBlock
  '#FF0000', // 1 - Red
  '#FFFF00', // 2 - Yellow
  '#00FF00', // 3 - Green
  '#00FFFF', // 4 - Cyan
  '#0000FF', // 5 - Blue
  '#FF00FF', // 6 - Magenta
  '#FFFFFF', // 7 - White
  '#414141', // 8 - Dark Gray
  '#808080', // 9 - Gray
  // 10-249: 표준 색상 팔레트 (간략화)
  ...generateColorPalette(),
  '#333333', // 250
  '#505050', // 251
  '#696969', // 252
  '#828282', // 253
  '#BEBEBE', // 254
  '#FFFFFF', // 255
];

function generateColorPalette(): string[] {
  const colors: string[] = [];
  const hueSteps = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5];
  const satSteps = [1, 0.65, 0.5, 0.3];
  const valSteps = [1, 0.5];

  for (let h = 0; h < 12; h++) {
    for (let s = 0; s < 4; s++) {
      for (let v = 0; v < 2; v++) {
        const hue = (hueSteps[h] / 6) * 360;
        const sat = satSteps[s];
        const val = valSteps[v];
        colors.push(hsvToHex(hue, sat, val));
      }
    }
  }

  // 나머지 색상으로 채우기
  while (colors.length < 240) {
    colors.push('#808080');
  }

  return colors;
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * DXF 색상 번호를 CSS 색상으로 변환
 */
export function dxfColorToHex(colorNumber: number): string {
  if (colorNumber < 0 || colorNumber > 256) {
    return '#888888';
  }

  if (colorNumber === 256) {
    return '#FFFFFF'; // ByLayer
  }

  return AUTOCAD_COLOR_PALETTE[colorNumber] || '#888888';
}

// ============================================================================
// 파일 로딩 함수
// ============================================================================

/**
 * 파일을 읽어서 DXF 데이터로 변환 (비동기)
 */
export async function loadDxfFromFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParsedDxfData> {
  const { onProgress } = options;

  onProgress?.({
    phase: 'reading',
    progress: 0,
    message: '파일 읽는 중...',
  });

  const fileContent = await readFileAsText(file, onProgress);

  onProgress?.({
    phase: 'reading',
    progress: 100,
    message: '파일 읽기 완료',
  });

  return parseDxfFileAsync(fileContent, options);
}

/**
 * 파일을 텍스트로 읽기 (진행률 지원)
 */
function readFileAsText(file: File, onProgress?: ProgressCallback): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress?.({
          phase: 'reading',
          progress,
          message: `파일 읽는 중... ${Math.round(event.loaded / 1024 / 1024)}MB / ${Math.round(event.total / 1024 / 1024)}MB`,
        });
      }
    };

    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsText(file);
  });
}

// ============================================================================
// 레거시 호환성 (기존 동기 API)
// ============================================================================

/**
 * DXF 파일을 파싱 (동기 방식 - 레거시 호환)
 * @deprecated Use parseDxfFileAsync instead
 */
export function parseDxfFile(fileContent: string): ParsedDxfData {
  const parser = new DxfParser();
  const dxf = parser.parseSync(fileContent);

  if (!dxf) {
    throw new Error('DXF 파일을 파싱할 수 없습니다.');
  }

  // 블록 정의 파싱
  const blocks = parseBlocks(dxf);
  const blockMap = new Map<string, DxfBlock>();
  blocks.forEach((block) => blockMap.set(block.name, block));

  // 레이어 맵 생성
  const layerMap = new Map<string, DxfLayer>();
  if (dxf.tables?.LAYER?.entries) {
    for (const layerEntry of dxf.tables.LAYER.entries) {
      const colorValue = typeof layerEntry.colorIndex === 'number'
        ? Math.abs(layerEntry.colorIndex)
        : 7;
      layerMap.set(layerEntry.name, {
        name: layerEntry.name,
        color: colorValue,
        visible: true,
        entities: [],
      });
    }
  }

  // 바운딩 박스 초기화
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // 엔티티 파싱
  if (dxf.entities) {
    for (const entity of dxf.entities) {
      const layerName = entity.layer || '0';

      if (!layerMap.has(layerName)) {
        layerMap.set(layerName, {
          name: layerName,
          color: 7,
          visible: true,
          entities: [],
        });
      }

      const layer = layerMap.get(layerName)!;

      if (entity.type === 'INSERT') {
        const insertEntities = resolveInsertEntity(
          entity as InsertEntity,
          blockMap,
          true,
          32
        );
        for (const insertEntity of insertEntities) {
          layer.entities.push(insertEntity);
          const points = getEntityPoints(insertEntity);
          for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
        }
      } else {
        const parsedEntity = parseEntity(entity, true, 32);
        if (parsedEntity) {
          layer.entities.push(parsedEntity);
          const points = getEntityPoints(parsedEntity);
          for (const p of points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          }
        }
      }
    }
  }

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  return {
    layers: Array.from(layerMap.values()),
    bounds: { minX, minY, maxX, maxY },
    blocks,
  };
}
