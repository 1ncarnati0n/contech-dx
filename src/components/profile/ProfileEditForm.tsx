'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types';

interface ProfileEditFormProps {
  profile: Profile;
  signupName?: string | null;
  signupPosition?: string | null;
}

export default function ProfileEditForm({ profile, signupName, signupPosition }: ProfileEditFormProps) {
  // display_name이 없고 회원가입 시 등록한 정보가 있으면 자동 입력
  const getInitialDisplayName = () => {
    if (profile.display_name) {
      return profile.display_name;
    }
    // 회원가입 시 등록한 이름과 직위를 조합
    if (signupName && signupPosition) {
      return `${signupName} ${signupPosition}`;
    }
    if (signupName) {
      return signupName;
    }
    return '';
  };

  const [displayName, setDisplayName] = useState(getInitialDisplayName());
  const [bio, setBio] = useState(profile.bio || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          bio: bio || null,
        })
        .eq('id', profile.id);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      router.refresh();
    } catch (err) {
      setError('프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 이메일 (읽기 전용) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          이메일 (변경 불가)
        </label>
        <input
          id="email"
          type="email"
          value={profile.email}
          disabled
          className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed"
        />
      </div>

      {/* 표시 이름 */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
          표시 이름
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="이름을 입력하세요"
          maxLength={50}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          게시글과 댓글에 표시될 이름입니다. (최대 50자)
        </p>
      </div>

      {/* 자기소개 */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
          자기소개
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="간단한 자기소개를 입력하세요"
          rows={4}
          maxLength={200}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {bio.length}/200자
        </p>
      </div>

      {/* 회원 등급 (읽기 전용) */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          회원 등급 (변경 불가)
        </label>
        <input
          id="role"
          type="text"
          value={profile.role}
          disabled
          className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          회원 등급은 관리자만 변경할 수 있습니다.
        </p>
      </div>

      {/* 에러/성공 메시지 */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          {success}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '저장 중...' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={() => {
            setDisplayName(getInitialDisplayName());
            setBio(profile.bio || '');
            setError(null);
            setSuccess(null);
          }}
          disabled={loading}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          초기화
        </button>
      </div>
    </form>
  );
}
