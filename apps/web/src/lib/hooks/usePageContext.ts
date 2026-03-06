'use client';

import { usePathname, useParams } from 'next/navigation';
import { useMemo } from 'react';

/**
 * 페이지 타입 정의
 */
export type PageType =
  | 'home'
  | 'projects'
  | 'project-detail'
  | 'project-gantt'
  | 'building-process-plan'
  | 'basement-process-plan'
  | 'posts'
  | 'post-detail'
  | 'profile'
  | 'admin'
  | 'admin-users'
  | 'admin-settings'
  | 'unknown';

/**
 * 페이지 컨텍스트 정보
 */
export interface PageContext {
  /** 페이지 타입 */
  pageType: PageType;
  /** 프로젝트 ID (있는 경우) */
  projectId?: string;
  /** 건물 ID (있는 경우) */
  buildingId?: string;
  /** 게시글 ID (있는 경우) */
  postId?: string;
  /** 현재 경로 */
  pathname: string;
  /** 공정계획 페이지 여부 */
  isProcessPlanPage: boolean;
  /** 관리자 페이지 여부 */
  isAdminPage: boolean;
}

/**
 * URL pathname을 분석하여 현재 페이지의 컨텍스트 정보를 반환하는 훅
 *
 * @example
 * const { pageType, projectId, buildingId } = usePageContext();
 *
 * // /projects/abc123 -> { pageType: 'project-detail', projectId: 'abc123' }
 * // /projects/abc123/buildings/bld456/process-plan -> { pageType: 'building-process-plan', projectId: 'abc123', buildingId: 'bld456' }
 */
export function usePageContext(): PageContext {
  const pathname = usePathname();
  const params = useParams();

  const context = useMemo((): PageContext => {
    // URL 세그먼트 분석
    const segments = pathname.split('/').filter(Boolean);

    // 기본값
    const baseContext: PageContext = {
      pageType: 'unknown',
      pathname,
      isProcessPlanPage: false,
      isAdminPage: false,
    };

    // 홈 페이지
    if (pathname === '/' || pathname === '/home') {
      return { ...baseContext, pageType: 'home' };
    }

    // 관리자 페이지
    if (segments[0] === 'admin') {
      baseContext.isAdminPage = true;

      if (segments[1] === 'users') {
        return { ...baseContext, pageType: 'admin-users' };
      }
      if (segments[1] === 'settings') {
        return { ...baseContext, pageType: 'admin-settings' };
      }
      return { ...baseContext, pageType: 'admin' };
    }

    // 프로젝트 관련 페이지
    if (segments[0] === 'projects') {
      const projectId = (params?.projectId as string) || segments[1];

      // 프로젝트 목록
      if (!projectId) {
        return { ...baseContext, pageType: 'projects' };
      }

      baseContext.projectId = projectId;

      // 간트 차트 페이지
      if (segments.includes('gantt')) {
        return { ...baseContext, pageType: 'project-gantt' };
      }

      // 건물 공정계획 페이지
      if (segments.includes('buildings') && segments.includes('process-plan')) {
        const buildingId = (params?.buildingId as string) || segments[segments.indexOf('buildings') + 1];
        return {
          ...baseContext,
          pageType: 'building-process-plan',
          buildingId,
          isProcessPlanPage: true,
        };
      }

      // 지하층 공정계획 페이지
      if (segments.includes('basement') && segments.includes('process-plan')) {
        return {
          ...baseContext,
          pageType: 'basement-process-plan',
          isProcessPlanPage: true,
        };
      }

      // 프로젝트 상세
      return { ...baseContext, pageType: 'project-detail' };
    }

    // 게시판 페이지
    if (segments[0] === 'posts') {
      const postId = (params?.postId as string) || segments[1];

      if (postId) {
        return { ...baseContext, pageType: 'post-detail', postId };
      }
      return { ...baseContext, pageType: 'posts' };
    }

    // 프로필 페이지
    if (segments[0] === 'profile') {
      return { ...baseContext, pageType: 'profile' };
    }

    return baseContext;
  }, [pathname, params]);

  return context;
}

/**
 * 페이지 타입에 따른 한글 레이블 반환
 */
export function getPageTypeLabel(pageType: PageType): string {
  const labels: Record<PageType, string> = {
    home: '홈',
    projects: '프로젝트 목록',
    'project-detail': '프로젝트 상세',
    'project-gantt': '간트 차트',
    'building-process-plan': '지상층 공정계획',
    'basement-process-plan': '지하층 공정계획',
    posts: '게시판',
    'post-detail': '게시글',
    profile: '프로필',
    admin: '관리자',
    'admin-users': '회원 관리',
    'admin-settings': '설정',
    unknown: '알 수 없음',
  };
  return labels[pageType];
}
