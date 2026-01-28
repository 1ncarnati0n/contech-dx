import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isSystemAdmin } from '@/lib/permissions/shared';
import type { AdminStats, RecentBuilding } from '@/app/(container)/admin/buildings/AdminBuildingsClient';

/**
 * 프로젝트별 건물 통계 및 동 목록 조회 API
 * Admin 권한을 가진 사용자만 접근 가능합니다.
 *
 * @query projectId - 조회할 프로젝트 ID
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // 1. 현재 로그인된 사용자 확인
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증되지 않은 사용자입니다.' } },
      { status: 401 }
    );
  }

  // 2. 현재 사용자의 프로필 조회 (권한 확인용)
  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (profileError || !currentProfile) {
    return NextResponse.json(
      { success: false, error: { code: 'PROFILE_NOT_FOUND', message: '프로필을 찾을 수 없습니다.' } },
      { status: 404 }
    );
  }

  // 3. Admin 권한 확인
  if (!isSystemAdmin(currentProfile)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: '관리자만 접근할 수 있습니다.' } },
      { status: 403 }
    );
  }

  // 4. 쿼리 파라미터에서 프로젝트 ID 추출
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: '프로젝트 ID가 필요합니다.' } },
      { status: 400 }
    );
  }

  try {
    // 5. 프로젝트별 통계 조회
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

    // 6. 프로젝트별 동 목록 조회
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
      throw new Error(`Failed to fetch buildings: ${buildingsError.message}`);
    }

    const buildings: RecentBuilding[] = (rows || []).map(row => {
      const projectData = row.projects as unknown as { name: string } | null;
      return {
        id: row.id,
        projectId: row.project_id,
        projectName: projectData?.name || 'Unknown',
        buildingName: row.building_name,
        buildingNumber: row.building_number,
        floorCount: (row.meta as any)?.floorCount?.ground || 0,
        coreType: (row.meta as any)?.coreType || '-',
        slabType: (row.meta as any)?.slabType || '-',
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      stats,
      buildings,
    });
  } catch (error) {
    console.error('Admin buildings API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    );
  }
}
