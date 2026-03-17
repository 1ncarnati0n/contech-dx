import * as authRepo from '../repository/auth.repository';

// ─── Error Message Mapping ───

function getLoginErrorMessage(error: string): string {
  if (error.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (error.includes('Email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
  }
  if (error.includes('too many requests') || error.includes('rate limit')) {
    return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (error.includes('network') || error.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.';
  }
  return '로그인에 실패했습니다. 다시 시도해주세요.';
}

function getResetPasswordErrorMessage(error: string): string {
  if (error.includes('same as your old password')) {
    return '기존 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요.';
  }
  return '비밀번호 변경에 실패했습니다. 다시 시도해주세요.';
}

function getResetRequestErrorMessage(error: string): string {
  if (error.includes('rate limit') || error.includes('Rate limit')) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  return '비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.';
}

// ─── Service Functions ───

export type AuthResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await authRepo.signIn(email, password);
    if (error) {
      return { success: false, error: getLoginErrorMessage(error.message) };
    }
    return { success: true };
  } catch {
    return { success: false, error: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

export interface SignupData {
  name: string;
  affiliation: string;
  department: string;
  position: string;
  email: string;
  password: string;
}

export type SignupResult = AuthResult<{ needsEmailConfirmation: boolean }>;

export async function signup(data: SignupData): Promise<SignupResult> {
  try {
    const { data: authData, error } = await authRepo.signUp({
      email: data.email,
      password: data.password,
      metadata: {
        display_name: data.name,
        affiliation: data.affiliation,
        department: data.department,
        position: data.position,
      },
      emailRedirectTo: `${location.origin}/auth/callback`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const needsEmailConfirmation = !!(authData?.user && !authData.session);
    return { success: true, data: { needsEmailConfirmation } };
  } catch {
    return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
  }
}

export async function logout(): Promise<AuthResult> {
  try {
    const { error } = await authRepo.signOut();
    if (error) {
      return { success: false, error: '로그아웃 중 오류가 발생했습니다.' };
    }
    return { success: true };
  } catch {
    return { success: false, error: '로그아웃 중 오류가 발생했습니다.' };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    // 이메일이 가입된 계정인지 확인
    const { data: profile, error: profileError } = await authRepo.checkEmailExists(email);

    if (profileError) {
      return { success: false, error: '이메일 확인 중 오류가 발생했습니다. 다시 시도해주세요.' };
    }

    if (!profile) {
      return { success: false, error: '가입되지 않은 이메일입니다. 이메일을 확인해주세요.' };
    }

    const { error } = await authRepo.resetPasswordForEmail(
      email,
      `${window.location.origin}/auth/callback?next=/reset-password/confirm`,
    );

    if (error) {
      return { success: false, error: getResetRequestErrorMessage(error.message) };
    }

    return { success: true };
  } catch {
    return { success: false, error: '오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

export async function confirmPasswordReset(password: string): Promise<AuthResult> {
  try {
    const { error } = await authRepo.updatePassword(password);

    if (error) {
      return { success: false, error: getResetPasswordErrorMessage(error.message) };
    }

    await authRepo.signOut();
    return { success: true };
  } catch {
    return { success: false, error: '오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

export type SessionCheckResult =
  | { status: 'ready' }
  | { status: 'error'; error: string };

export function checkResetUrlParams(): SessionCheckResult | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('error_code') === 'otp_expired') {
    return { status: 'error', error: '인증 링크가 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요.' };
  }
  if (params.get('error')) {
    return { status: 'error', error: '인증 링크가 유효하지 않습니다. 비밀번호 재설정을 다시 요청해주세요.' };
  }
  return null;
}

export async function checkResetSession(): Promise<SessionCheckResult> {
  const urlCheck = checkResetUrlParams();
  if (urlCheck) return urlCheck;

  const { data: { session } } = await authRepo.getSession();
  if (session) {
    return { status: 'ready' };
  }
  return { status: 'error', error: '인증 세션이 없습니다. 비밀번호 재설정을 다시 요청해주세요.' };
}
