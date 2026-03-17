import { createClient } from '@/shared/lib/supabase/client';

export interface ProfileUpdateFields {
  display_name?: string | null;
  position?: string | null;
  affiliation?: string | null;
  department?: string | null;
  bio?: string | null;
}

export async function updateProfile(userId: string, fields: ProfileUpdateFields) {
  const supabase = createClient();
  return supabase.from('profiles').update(fields).eq('id', userId);
}
