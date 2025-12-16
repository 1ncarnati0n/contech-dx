'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { Input, Textarea } from '@/components/ui/Input';

// ============================================
// Zod 스키마 정의
// ============================================
const profileSchema = z.object({
  displayName: z
    .string()
    .max(50, '표시 이름은 50자를 초과할 수 없습니다'),
  bio: z
    .string()
    .max(200, '자기소개는 200자를 초과할 수 없습니다'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ============================================
// Props 타입 정의
// ============================================
interface ProfileEditFormProps {
  profile: Profile;
  signupName?: string | null;
  signupPosition?: string | null;
}

// ============================================
// 컴포넌트
// ============================================
export default function ProfileEditForm({ profile, signupName, signupPosition }: ProfileEditFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // 초기 표시 이름 계산
  const getInitialDisplayName = () => {
    if (profile.display_name) {
      return profile.display_name;
    }
    if (signupName && signupPosition) {
      return `${signupName} ${signupPosition}`;
    }
    if (signupName) {
      return signupName;
    }
    return '';
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: getInitialDisplayName(),
      bio: profile.bio || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.displayName || null,
          bio: data.bio || null,
        })
        .eq('id', profile.id);

      if (error) {
        toast.error('프로필 업데이트 실패', { description: error.message });
        return;
      }

      toast.success('프로필이 성공적으로 업데이트되었습니다.');
      router.refresh();
    } catch {
      toast.error('프로필 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    form.reset({
      displayName: getInitialDisplayName(),
      bio: profile.bio || '',
    });
  };

  const bioValue = form.watch('bio') || '';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 이메일 (읽기 전용) */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            이메일 (변경 불가)
          </label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
          />
        </div>

        {/* 표시 이름 */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>표시 이름</FormLabel>
              <FormControl>
                <Input
                  placeholder="이름을 입력하세요"
                  maxLength={50}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                게시글과 댓글에 표시될 이름입니다. (최대 50자)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 자기소개 */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>자기소개</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="간단한 자기소개를 입력하세요"
                  rows={4}
                  maxLength={200}
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                {bioValue.length}/200자
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 회원 등급 (읽기 전용) */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            회원 등급 (변경 불가)
          </label>
          <Input
            id="role"
            type="text"
            value={profile.role}
            disabled
            className="bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            회원 등급은 관리자만 변경할 수 있습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
            className="flex-1"
          >
            저장하기
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={form.formState.isSubmitting}
          >
            초기화
          </Button>
        </div>
      </form>
    </Form>
  );
}
