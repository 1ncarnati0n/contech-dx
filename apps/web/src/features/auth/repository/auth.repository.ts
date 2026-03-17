import { createClient } from '@/shared/lib/supabase/client';

export interface SignUpParams {
  email: string;
  password: string;
  metadata: {
    display_name: string;
    affiliation: string;
    department: string;
    position: string;
  };
  emailRedirectTo: string;
}

const getSupabase = () => createClient();

export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp({ email, password, metadata, emailRedirectTo }: SignUpParams) {
  const supabase = getSupabase();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: metadata,
    },
  });
}

export async function signOut() {
  const supabase = getSupabase();
  return supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = getSupabase();
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function updatePassword(password: string) {
  const supabase = getSupabase();
  return supabase.auth.updateUser({ password });
}

export async function getSession() {
  const supabase = getSupabase();
  return supabase.auth.getSession();
}

export async function checkEmailExists(email: string) {
  const supabase = getSupabase();
  return supabase.from('profiles').select('id').eq('email', email).maybeSingle();
}
