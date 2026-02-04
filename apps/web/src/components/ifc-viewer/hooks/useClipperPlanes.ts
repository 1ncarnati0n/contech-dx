'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useIfcViewerContext } from '../context/IfcViewerContext';
import { useIfcViewerStore } from '../stores/useIfcViewerStore';
import type { ClippingAxis } from '../types';

/**
 * 클리핑 플레인 ID 참조
 * createFromNormalAndCoplanarPoint()는 string ID를 반환합니다.
 */
interface ClipperPlaneRef {
  x: string | null;
  y: string | null;
  z: string | null;
}

/**
 * 클리핑 플레인 훅
 *
 * X, Y, Z축 단면도 기능을 제공합니다.
 * @thatopen/components의 Clipper를 사용합니다.
 */
export function useClipperPlanes() {
  const { worldRef, componentsRef, threeRef, boundingBoxerRef } = useIfcViewerContext();
  const { clippingPlanes, setClippingPlane, resetClippingPlanes } = useIfcViewerStore();

  const clipperRef = useRef<ClipperPlaneRef>({ x: null, y: null, z: null });
  const boundsRef = useRef<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null>(null);

  // 모델 경계 가져오기
  const getBounds = useCallback(() => {
    if (boundsRef.current) return boundsRef.current;

    if (!boundingBoxerRef.current) {
      // 기본값
      return {
        min: { x: -50, y: -50, z: -50 },
        max: { x: 50, y: 50, z: 50 },
      };
    }

    try {
      // BoundingBoxer에서 경계 가져오기
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boxer = boundingBoxerRef.current as any;
      if (boxer.getBounds) {
        const box = boxer.getBounds();
        boundsRef.current = {
          min: { x: box.min.x, y: box.min.y, z: box.min.z },
          max: { x: box.max.x, y: box.max.y, z: box.max.z },
        };
        return boundsRef.current;
      }
    } catch (error) {
      console.warn('Failed to get bounds:', error);
    }

    return {
      min: { x: -50, y: -50, z: -50 },
      max: { x: 50, y: 50, z: 50 },
    };
  }, [boundingBoxerRef]);

  // 클리핑 플레인 생성
  const createClipperPlane = useCallback(async (axis: ClippingAxis) => {
    if (!componentsRef.current || !worldRef.current || !threeRef.current) return;

    try {
      const OBC = await import('@thatopen/components');
      const THREE = threeRef.current;

      // Clipper 컴포넌트 가져오기
      const clipper = componentsRef.current.get(OBC.Clipper);
      clipper.enabled = true;

      const bounds = getBounds();

      // 축에 따른 법선 벡터 및 초기 위치 설정
      let normal: { x: number; y: number; z: number };
      let position: { x: number; y: number; z: number };

      switch (axis) {
        case 'x':
          normal = { x: 1, y: 0, z: 0 };
          position = { x: bounds.max.x, y: 0, z: 0 };
          break;
        case 'y':
          normal = { x: 0, y: 1, z: 0 };
          position = { x: 0, y: bounds.max.y, z: 0 };
          break;
        case 'z':
          normal = { x: 0, y: 0, z: 1 };
          position = { x: 0, y: 0, z: bounds.max.z };
          break;
      }

      // 클리핑 플레인 생성
      const normalVec = new THREE.Vector3(normal.x, normal.y, normal.z);
      const pointVec = new THREE.Vector3(position.x, position.y, position.z);

      // createFromNormalAndCoplanarPoint()는 string ID를 반환
      const planeId = clipper.createFromNormalAndCoplanarPoint(
        worldRef.current,
        normalVec,
        pointVec
      );

      // 플레인 ID 저장
      clipperRef.current[axis] = planeId;

      // 플레인 helper 숨기기 (선택적)
      const plane = clipper.list.get(planeId);
      if (plane) {
        plane.visible = false;
      }

      setClippingPlane(axis, { enabled: true, value: 100 });

      return planeId;
    } catch (error) {
      console.error('Failed to create clipper plane:', error);
    }
  }, [componentsRef, worldRef, threeRef, getBounds, setClippingPlane]);

  // 클리핑 플레인 제거
  const removeClipperPlane = useCallback(async (axis: ClippingAxis) => {
    if (!componentsRef.current || !worldRef.current) return;

    try {
      const OBC = await import('@thatopen/components');
      const clipper = componentsRef.current.get(OBC.Clipper);

      const planeId = clipperRef.current[axis];
      if (planeId) {
        // 올바른 API: clipper.delete(world, planeId)
        clipper.delete(worldRef.current, planeId);
        clipperRef.current[axis] = null;
      }

      setClippingPlane(axis, { enabled: false, value: 0 });
    } catch (error) {
      console.error('Failed to remove clipper plane:', error);
    }
  }, [componentsRef, worldRef, setClippingPlane]);

  // 클리핑 플레인 위치 업데이트
  const updateClipperPlane = useCallback(async (axis: ClippingAxis, value: number) => {
    const planeId = clipperRef.current[axis];
    if (!planeId || !componentsRef.current || !threeRef.current) return;

    try {
      const OBC = await import('@thatopen/components');
      const THREE = threeRef.current;
      const clipper = componentsRef.current.get(OBC.Clipper);

      // clipper.list에서 plane 객체 가져오기
      const plane = clipper.list.get(planeId);
      if (!plane) return;

      const bounds = getBounds();
      const range = axis === 'x'
        ? bounds.max.x - bounds.min.x
        : axis === 'y'
        ? bounds.max.y - bounds.min.y
        : bounds.max.z - bounds.min.z;

      const min = axis === 'x' ? bounds.min.x : axis === 'y' ? bounds.min.y : bounds.min.z;

      // value는 0-100 퍼센트
      const position = min + (range * value / 100);

      // 축에 따른 법선 벡터 결정
      const normal = axis === 'x'
        ? new THREE.Vector3(1, 0, 0)
        : axis === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);

      const point = axis === 'x'
        ? new THREE.Vector3(position, 0, 0)
        : axis === 'y'
        ? new THREE.Vector3(0, position, 0)
        : new THREE.Vector3(0, 0, position);

      // 플레인 위치 업데이트 (setFromNormalAndCoplanarPoint 사용)
      if (plane.setFromNormalAndCoplanarPoint) {
        plane.setFromNormalAndCoplanarPoint(normal, point);
        plane.update?.();
      }

      setClippingPlane(axis, { value });
    } catch (error) {
      console.warn('Failed to update clipper plane:', error);
    }
  }, [componentsRef, threeRef, getBounds, setClippingPlane]);

  // 클리핑 토글
  const toggleClipperPlane = useCallback(async (axis: ClippingAxis) => {
    const isEnabled = clippingPlanes[axis].enabled;

    if (isEnabled) {
      await removeClipperPlane(axis);
    } else {
      await createClipperPlane(axis);
    }
  }, [clippingPlanes, createClipperPlane, removeClipperPlane]);

  // 방향 뒤집기
  const flipClipperPlane = useCallback(async (axis: ClippingAxis) => {
    const planeId = clipperRef.current[axis];
    if (!planeId || !componentsRef.current) return;

    try {
      const OBC = await import('@thatopen/components');
      const clipper = componentsRef.current.get(OBC.Clipper);

      // clipper.list에서 plane 객체 가져오기
      const plane = clipper.list.get(planeId);
      if (!plane) return;

      // SimplePlane의 three.js Plane 객체에 접근하여 방향 뒤집기
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const simplePlane = plane as any;
      if (simplePlane.three?.normal) {
        simplePlane.three.normal.negate();
        simplePlane.three.constant = -simplePlane.three.constant;
        plane.update?.();
      }

      setClippingPlane(axis, { flipped: !clippingPlanes[axis].flipped });
    } catch (error) {
      console.warn('Failed to flip clipper plane:', error);
    }
  }, [componentsRef, clippingPlanes, setClippingPlane]);

  // 모든 클리핑 플레인 제거
  const clearAllClipperPlanes = useCallback(async () => {
    await Promise.all([
      removeClipperPlane('x'),
      removeClipperPlane('y'),
      removeClipperPlane('z'),
    ]);
    resetClippingPlanes();
  }, [removeClipperPlane, resetClippingPlanes]);

  // 정리
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 클리핑 플레인 정리
      clearAllClipperPlanes();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    clippingPlanes,
    toggleClipperPlane,
    updateClipperPlane,
    flipClipperPlane,
    clearAllClipperPlanes,
  };
}
