import { updateProfile as updateProfileRepo } from '../repository/profile.repository';

export type ProfileUpdateResult =
  | { success: true }
  | { success: false; error: string };

export interface ProfileUpdateData {
  displayName: string;
  position: string;
  affiliation: string;
  department: string;
  bio: string;
}

export async function updateProfile(
  userId: string,
  data: ProfileUpdateData,
): Promise<ProfileUpdateResult> {
  try {
    const { error } = await updateProfileRepo(userId, {
      display_name: data.displayName || null,
      position: data.position || null,
      affiliation: data.affiliation || null,
      department: data.department || null,
      bio: data.bio || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch {
    return { success: false, error: '프로필 업데이트 중 오류가 발생했습니다.' };
  }
}
