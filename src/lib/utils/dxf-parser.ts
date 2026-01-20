/**
 * DXF 파일 파싱 유틸리티
 *
 * dxf-parser 라이브러리를 사용하여 DXF 파일을 파싱하고
 * CastPlan에서 사용할 수 있는 형식으로 변환
 */

import DxfParser from 'dxf-parser';
import type { Point2D, DxfEntity, DxfLayer, ParsedDxfData, DxfEntityType } from '@/lib/types';

/**
 * DXF 파일을 파싱하여 CastPlan 형식으로 변환
 * @param fileContent - DXF 파일 내용 (텍스트)
 * @returns 파싱된 DXF 데이터
 */
export function parseDxfFile(fileContent: string): ParsedDxfData {
  const parser = new DxfParser();

  // DXF 파일 파싱
  const dxf = parser.parseSync(fileContent);

  if (!dxf) {
    throw new Error('DXF 파일을 파싱할 수 없습니다.');
  }

  // 레이어 맵 생성
  const layerMap = new Map<string, DxfLayer>();

  // 기본 레이어 추가
  if (dxf.tables?.layer?.layers) {
    for (const [name, layerData] of Object.entries(dxf.tables.layer.layers)) {
      const layer = layerData as { color?: number };
      layerMap.set(name, {
        name,
        color: layer.color || 7,
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

  // 엔티티 파싱 및 레이어별 분류
  if (dxf.entities) {
    for (const entity of dxf.entities) {
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
      const parsedEntity = parseEntity(entity);

      if (parsedEntity) {
        layer.entities.push(parsedEntity);

        // 바운딩 박스 업데이트
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

  // 기본 바운딩 박스 (엔티티가 없는 경우)
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 1000;
  }

  return {
    layers: Array.from(layerMap.values()),
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * DXF 엔티티를 CastPlan 형식으로 변환
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEntity(entity: any): DxfEntity | null {
  const type = entity.type as DxfEntityType;

  switch (type) {
    case 'LINE':
      return {
        type: 'LINE',
        layer: entity.layer || '0',
        color: entity.color,
        startPoint: { x: entity.start?.x || 0, y: entity.start?.y || 0 },
        endPoint: { x: entity.end?.x || 0, y: entity.end?.y || 0 },
      };

    case 'POLYLINE':
    case 'LWPOLYLINE':
      return {
        type: type,
        layer: entity.layer || '0',
        color: entity.color,
        vertices: (entity.vertices || []).map((v: { x?: number; y?: number }) => ({
          x: v.x || 0,
          y: v.y || 0,
        })),
      };

    case 'CIRCLE':
      return {
        type: 'CIRCLE',
        layer: entity.layer || '0',
        color: entity.color,
        center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
        radius: entity.radius || 0,
      };

    case 'ARC':
      return {
        type: 'ARC',
        layer: entity.layer || '0',
        color: entity.color,
        center: { x: entity.center?.x || 0, y: entity.center?.y || 0 },
        radius: entity.radius || 0,
        startAngle: entity.startAngle || 0,
        endAngle: entity.endAngle || 0,
      };

    case 'TEXT':
    case 'MTEXT':
      return {
        type: type,
        layer: entity.layer || '0',
        color: entity.color,
        text: entity.text || '',
        position: { x: entity.position?.x || 0, y: entity.position?.y || 0 },
      };

    default:
      // 지원하지 않는 엔티티 타입은 무시
      return null;
  }
}

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
        // 원의 바운딩 박스 4개 점
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
        // 아크의 시작점과 끝점
        const startAngle = (entity.startAngle || 0) * Math.PI / 180;
        const endAngle = (entity.endAngle || 0) * Math.PI / 180;
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

    case 'TEXT':
    case 'MTEXT':
      if (entity.position) points.push(entity.position);
      break;
  }

  return points;
}

/**
 * DXF 색상 번호를 CSS 색상으로 변환
 */
export function dxfColorToHex(colorNumber: number): string {
  // AutoCAD 색상 인덱스 (일부 주요 색상)
  const colorMap: Record<number, string> = {
    1: '#FF0000',   // 빨강
    2: '#FFFF00',   // 노랑
    3: '#00FF00',   // 녹색
    4: '#00FFFF',   // 청록
    5: '#0000FF',   // 파랑
    6: '#FF00FF',   // 자홍
    7: '#FFFFFF',   // 흰색 (기본)
    8: '#808080',   // 회색
    9: '#C0C0C0',   // 밝은 회색
    256: '#FFFFFF', // ByLayer
  };

  return colorMap[colorNumber] || '#888888';
}

/**
 * 파일을 읽어서 DXF 데이터로 변환
 */
export async function loadDxfFromFile(file: File): Promise<ParsedDxfData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = parseDxfFile(content);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };

    reader.readAsText(file);
  });
}
