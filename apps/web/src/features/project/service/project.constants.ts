import {
  Crown,
  Wrench,
  ClipboardCheck,
  HardHat,
  Eye,
  Megaphone,
  Gavel,
  Award,
  CheckCircle2,
} from 'lucide-react';
import type { ProjectMemberRole } from '@/shared/types';

export const ROLE_CONFIG: Record<ProjectMemberRole, {
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Crown;
  bgColor: string;
  iconColor: string;
  badgeColors: string;
}> = {
  pm: {
    label: '프로젝트 매니저',
    shortLabel: 'PM',
    description: '프로젝트 정보 수정, 멤버 관리, 삭제 가능',
    icon: Crown,
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeColors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  engineer: {
    label: '엔지니어',
    shortLabel: '엔지니어',
    description: '데이터 입력 및 조회 가능',
    icon: Wrench,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  supervisor: {
    label: '감독관',
    shortLabel: '감독관',
    description: '공정 감독 및 검토 권한',
    icon: ClipboardCheck,
    bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    badgeColors: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  },
  worker: {
    label: '작업자',
    shortLabel: '작업자',
    description: '현장 작업 데이터 입력 가능',
    icon: HardHat,
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeColors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  member: {
    label: '일반 멤버',
    shortLabel: '멤버',
    description: '프로젝트 조회만 가능',
    icon: Eye,
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
    badgeColors: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
};

export const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  pm: '프로젝트 매니저',
  engineer: '엔지니어',
  supervisor: '감독자',
  worker: '작업자',
  member: '일반 멤버',
};

export const ROLE_ORDER: ProjectMemberRole[] = ['pm', 'engineer', 'supervisor', 'worker', 'member'];

export const STATUS_OPTIONS = [
  { value: 'announcement', label: '공모', icon: Megaphone, bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400', activeRing: 'ring-blue-500' },
  { value: 'bidding', label: '입찰', icon: Gavel, bgColor: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400', activeRing: 'ring-amber-500' },
  { value: 'award', label: '수주', icon: Award, bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400', activeRing: 'ring-emerald-500' },
  { value: 'construction_start', label: '착공', icon: HardHat, bgColor: 'bg-purple-50 dark:bg-purple-900/20', iconColor: 'text-purple-600 dark:text-purple-400', activeRing: 'ring-purple-500' },
  { value: 'completion', label: '준공', icon: CheckCircle2, bgColor: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-600 dark:text-slate-400', activeRing: 'ring-slate-500' },
] as const;
