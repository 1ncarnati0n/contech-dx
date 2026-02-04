'use client';

import {
  Building2,
  Layers,
  Box,
  Square,
  Columns,
  DoorOpen,
  PanelTop,
  TrendingUp,
  Home,
  LayoutGrid,
  Fence,
  Armchair,
  Fan,
  Minus,
  HelpCircle,
} from 'lucide-react';
import type { IfcElementCategory } from '../../types';

interface TreeNodeIconProps {
  type: IfcElementCategory | string;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  IfcProject: Building2,
  IfcSite: LayoutGrid,
  IfcBuilding: Building2,
  IfcBuildingStorey: Layers,
  IfcSpace: Box,
  IfcWall: Square,
  IfcSlab: Minus,
  IfcColumn: Columns,
  IfcBeam: Minus,
  IfcDoor: DoorOpen,
  IfcWindow: PanelTop,
  IfcStair: TrendingUp,
  IfcRoof: Home,
  IfcCurtainWall: LayoutGrid,
  IfcRailing: Fence,
  IfcFurniture: Armchair,
  IfcFlowTerminal: Fan,
  IfcFlowSegment: Minus,
  IfcDistributionElement: Box,
};

const colorMap: Record<string, string> = {
  IfcProject: 'text-purple-500',
  IfcSite: 'text-green-600',
  IfcBuilding: 'text-blue-500',
  IfcBuildingStorey: 'text-blue-400',
  IfcSpace: 'text-cyan-500',
  IfcWall: 'text-orange-500',
  IfcSlab: 'text-gray-500',
  IfcColumn: 'text-red-500',
  IfcBeam: 'text-red-400',
  IfcDoor: 'text-amber-600',
  IfcWindow: 'text-sky-400',
  IfcStair: 'text-indigo-500',
  IfcRoof: 'text-rose-500',
  IfcCurtainWall: 'text-teal-500',
  IfcRailing: 'text-zinc-500',
  IfcFurniture: 'text-amber-500',
  IfcFlowTerminal: 'text-emerald-500',
  IfcFlowSegment: 'text-emerald-400',
  IfcDistributionElement: 'text-violet-500',
};

/**
 * 트리 노드 아이콘 컴포넌트
 *
 * IFC 요소 타입에 따라 적절한 아이콘을 표시합니다.
 */
export function TreeNodeIcon({ type, className = '' }: TreeNodeIconProps) {
  const Icon = iconMap[type] || HelpCircle;
  const color = colorMap[type] || 'text-zinc-400';

  return <Icon className={`h-4 w-4 ${color} ${className}`} />;
}
