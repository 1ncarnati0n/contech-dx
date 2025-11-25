/**
 * Gantt Chart User Data
 * 간트차트 사용자 할당을 위한 데이터
 */

export interface GanttUserOption {
  id: string | number;
  label: string;
  avatar?: string;
}

/**
 * 샘플 사용자 목록
 * 실제로는 Supabase profiles 테이블에서 가져와야 함
 */
export const users: GanttUserOption[] = [
  {
    id: 'user-1',
    label: '김프로 (PM)',
    avatar: undefined,
  },
  {
    id: 'user-2',
    label: '박엔지 (Engineer)',
    avatar: undefined,
  },
  {
    id: 'user-3',
    label: '이감독 (Supervisor)',
    avatar: undefined,
  },
  {
    id: 'user-4',
    label: '최작업 (Worker)',
    avatar: undefined,
  },
  {
    id: 'user-5',
    label: '정멤버 (Member)',
    avatar: undefined,
  },
];

/**
 * 사용자 ID로 사용자 정보 조회
 */
export function getUserById(id: string | number): GanttUserOption | undefined {
  return users.find((user) => user.id === id);
}

/**
 * 사용자 목록을 Supabase profiles에서 가져오기 (TODO)
 */
export async function fetchUsers(): Promise<GanttUserOption[]> {
  // TODO: Supabase에서 실제 사용자 목록 가져오기
  // const supabase = createClient();
  // const { data } = await supabase.from('profiles').select('id, display_name, email');
  // return data.map(profile => ({
  //   id: profile.id,
  //   label: profile.display_name || profile.email,
  // }));
  
  return users;
}

