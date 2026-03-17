import { LucideIcon, FileText, FileSearch, FolderKanban, Shield, TestTube, Building2 } from 'lucide-react';

export interface MenuItem {
  href: string;
  label: string;
  labelEn: string;
  icon: LucideIcon;
  keywords: string[];
  isAdmin?: boolean;
}

export interface MenuSection {
  title: string;
  titleEn: string;
  items: MenuItem[];
  isAdmin?: boolean;
}

// 메인 메뉴 아이템
const mainMenuItems: MenuItem[] = [
  {
    href: '/projects',
    label: '프로젝트',
    labelEn: 'Projects',
    icon: FolderKanban,
    keywords: ['project', '프로젝트', '작업', 'work', 'task', '일정'],
  },
  {
    href: '/file-search',
    label: 'AI 문서분석',
    labelEn: 'AI Document Analysis',
    icon: FileSearch,
    keywords: ['ai', '문서', 'document', '분석', 'analysis', 'search', '검색', 'file'],
  },
  {
    href: '/posts',
    label: '게시판',
    labelEn: 'Posts',
    icon: FileText,
    keywords: ['post', '게시판', '글', 'board', 'article', '공지'],
  },
];

// 관리자 메뉴 아이템
const adminMenuItems: MenuItem[] = [
  {
    href: '/admin/users',
    label: 'User Manage',
    labelEn: 'User Management',
    icon: Shield,
    keywords: ['user', '사용자', '유저', 'manage', '관리', 'admin', '권한'],
    isAdmin: true,
  },
  {
    href: '/admin/buildings',
    label: 'Building Data',
    labelEn: 'Building Data',
    icon: Building2,
    keywords: ['building', '빌딩', '건물', 'data', '데이터', 'admin'],
    isAdmin: true,
  },
  {
    href: '/admin/db-checker',
    label: 'DB Checker',
    labelEn: 'Database Checker',
    icon: TestTube,
    keywords: ['db', 'database', '데이터베이스', 'test', '테스트', 'connection', '연결', 'checker'],
    isAdmin: true,
  },
];

// 섹션별 메뉴 구성
export const menuSections: MenuSection[] = [
  {
    title: '메인 메뉴',
    titleEn: 'Main Menu',
    items: mainMenuItems,
  },
  {
    title: '관리자 페이지',
    titleEn: 'Admin Pages',
    items: adminMenuItems,
    isAdmin: true,
  },
];

// 전체 메뉴 아이템 (검색용)
export const allMenuItems: MenuItem[] = [...mainMenuItems, ...adminMenuItems];

/**
 * 검색어로 메뉴 아이템 필터링
 * @param query 검색어
 * @param isAdmin 관리자 여부 (관리자가 아니면 관리자 메뉴 제외)
 * @returns 필터링된 메뉴 아이템 배열
 */
export function filterMenuItems(query: string, isAdmin: boolean): MenuItem[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    // 검색어가 없으면 전체 반환 (관리자 권한에 따라)
    return isAdmin ? allMenuItems : allMenuItems.filter(item => !item.isAdmin);
  }

  const items = isAdmin ? allMenuItems : allMenuItems.filter(item => !item.isAdmin);

  return items.filter(item => {
    // 라벨, 영문 라벨, href, 키워드에서 검색
    const searchTargets = [
      item.label.toLowerCase(),
      item.labelEn.toLowerCase(),
      item.href.toLowerCase(),
      ...item.keywords.map(k => k.toLowerCase()),
    ];

    return searchTargets.some(target => target.includes(normalizedQuery));
  });
}

/**
 * 검색 결과를 섹션별로 그룹핑
 * @param items 필터링된 메뉴 아이템
 * @returns 섹션별로 그룹핑된 결과
 */
export function groupItemsBySection(items: MenuItem[]): MenuSection[] {
  return menuSections
    .map(section => ({
      ...section,
      items: section.items.filter(sectionItem =>
        items.some(item => item.href === sectionItem.href)
      ),
    }))
    .filter(section => section.items.length > 0);
}
