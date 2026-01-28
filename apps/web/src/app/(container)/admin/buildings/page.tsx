import { redirect } from 'next/navigation';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/Card';
import AdminBuildingsClient, {
  type AdminStats,
  type RecentBuilding,
} from './AdminBuildingsClient';
import type { Project } from '@/lib/types';

/**
 * 서버 사이드에서 프로젝트 목록 조회
 */
async function getProjectList(): Promise<Pick<Project, 'id' | 'name'>[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }

  return data || [];
}

/**
 * 서버 사이드에서 Admin 통계 조회
 */
async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();

  const [
    { count: buildingsCount },
    { count: floorsCount },
    { count: floorTradesCount },
    { count: processPlansCount },
    { count: pouringSectionsCount },
    { count: projectsCount },
  ] = await Promise.all([
    supabase.from('buildings').select('*', { count: 'exact', head: true }),
    supabase.from('floors').select('*', { count: 'exact', head: true }),
    supabase.from('floor_trades').select('*', { count: 'exact', head: true }),
    supabase.from('building_process_plans').select('*', { count: 'exact', head: true }),
    supabase.from('pouring_sections').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalBuildings: buildingsCount || 0,
    totalFloors: floorsCount || 0,
    totalFloorTrades: floorTradesCount || 0,
    totalProcessPlans: processPlansCount || 0,
    totalPouringSections: pouringSectionsCount || 0,
    activeProjects: projectsCount || 0,
  };
}

/**
 * 서버 사이드에서 최근 생성된 동 목록 조회
 */
async function getRecentBuildings(limit: number = 20): Promise<RecentBuilding[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
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
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch recent buildings:', error);
    throw new Error(`Failed to fetch recent buildings: ${error.message}`);
  }

  return (rows || []).map(row => {
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
}

export default async function AdminBuildingsPage() {
  const profile = await getCurrentUserProfile();

  // Admin만 접근 가능
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  // 초기 데이터 조회
  let projects: Pick<Project, 'id' | 'name'>[] = [];
  let stats: AdminStats = {
    totalBuildings: 0,
    totalFloors: 0,
    totalFloorTrades: 0,
    totalProcessPlans: 0,
    totalPouringSections: 0,
    activeProjects: 0,
  };
  let recentBuildings: RecentBuilding[] = [];
  let error: string | null = null;

  try {
    [projects, stats, recentBuildings] = await Promise.all([
      getProjectList(),
      getAdminStats(),
      getRecentBuildings(20),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-800 font-bold mb-2 text-lg">데이터 조회 오류</h2>
            <p className="text-red-600 mb-4">건물 데이터를 불러오는 중 오류가 발생했습니다.</p>
            <pre className="text-xs bg-red-100 p-4 rounded-lg overflow-auto text-left inline-block max-w-full">
              {error}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminBuildingsClient
      projects={projects}
      initialStats={stats}
      initialBuildings={recentBuildings}
    />
  );
}
