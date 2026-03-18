import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidation } from '@/shared/lib/api/withValidation';
import { createClient } from '@/shared/lib/supabase/server';
import { isSystemAdmin } from '@/shared/lib/permissions/shared';
import type { AdminStats, RecentBuilding } from '@/app/(container)/admin/buildings/AdminBuildingsClient';
import { extractBuildingDisplayData } from '@/features/building/shared/service/building-metadata';
import { logger } from '@/shared/utils/logger';
import { apiError, ErrorCode } from '@/shared/utils/apiAuth';

const getAdminBuildingsQuerySchema = z.object({
  projectId: z.string().trim().min(1, '프로젝트 ID가 필요합니다.'),
});

/**
 * 프로젝트별 건물 통계 및 동 목록 조회 API
 * Admin 권한을 가진 사용자만 접근 가능합니다.
 */
export const GET = withValidation(
  { schema: getAdminBuildingsQuerySchema, source: 'query' },
  async (_request: NextRequest, query) => {
    const supabase = await createClient();

    // 1. 현재 로그인된 사용자 확인
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return apiError(ErrorCode.AUTH_REQUIRED, '인증되지 않은 사용자입니다.');
    }

    // 2. 현재 사용자의 프로필 조회 (권한 확인용)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !currentProfile) {
      return apiError(ErrorCode.NOT_FOUND, '프로필을 찾을 수 없습니다.');
    }

    // 3. Admin 권한 확인
    if (!isSystemAdmin(currentProfile)) {
      return apiError(ErrorCode.PERMISSION_DENIED, '관리자만 접근할 수 있습니다.');
    }

    const { projectId } = query;

    try {
      // 4. 프로젝트별 통계 조회
      const [
        { count: buildingsCount },
        { count: floorsCount },
        { count: floorTradesCount },
        { count: processPlansCount },
        { count: pouringSectionsCount },
      ] = await Promise.all([
        supabase
          .from('buildings')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabase
          .from('floors')
          .select('*, buildings!inner(project_id)', { count: 'exact', head: true })
          .eq('buildings.project_id', projectId),
        supabase
          .from('floor_trades')
          .select('*, buildings!inner(project_id)', { count: 'exact', head: true })
          .eq('buildings.project_id', projectId),
        supabase
          .from('building_process_plans')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
        supabase
          .from('pouring_sections')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId),
      ]);

      const stats: AdminStats = {
        totalBuildings: buildingsCount || 0,
        totalFloors: floorsCount || 0,
        totalFloorTrades: floorTradesCount || 0,
        totalProcessPlans: processPlansCount || 0,
        totalPouringSections: pouringSectionsCount || 0,
        activeProjects: 1,
      };

      // 5. 프로젝트별 동 목록 조회
      const { data: rows, error: buildingsError } = await supabase
        .from('buildings')
        .select(`
          id,
          project_id,
          building_name,
          building_number,
          meta,
          created_at,
          projects!inner(name)
        `)
        .eq('project_id', projectId)
        .order('building_number', { ascending: true });

      if (buildingsError) {
        return apiError(ErrorCode.DATABASE_ERROR, `Failed to fetch buildings: ${buildingsError.message}`);
      }

      const buildings: RecentBuilding[] = (rows || []).map((row) => {
        const projectData = row.projects as unknown as { name: string } | null;
        const metaData = extractBuildingDisplayData(row.meta);
        return {
          id: row.id,
          projectId: row.project_id,
          projectName: projectData?.name || 'Unknown',
          buildingName: row.building_name,
          buildingNumber: row.building_number,
          floorCount: metaData.floorCount,
          coreType: metaData.coreType,
          slabType: metaData.slabType,
          createdAt: row.created_at,
        };
      });

      return NextResponse.json({
        success: true,
        stats,
        buildings,
      });
    } catch (error) {
      logger.error('Admin buildings API error:', error);
      return apiError(
        ErrorCode.SERVER_ERROR,
        error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      );
    }
  }
);
