import { NextResponse } from 'next/server';
import type { GeminiFileSearchStore } from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';
import { geminiStoreRequest } from '@/lib/utils/geminiApi';
import { checkAuth } from '@/lib/utils/apiAuth';

export async function GET() {
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // REST API로 File search stores 목록 가져오기
    // API 키를 헤더로 전달하여 URL 노출 방지
    const response = await geminiStoreRequest('fileSearchStores', apiKey, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '스토어 목록 조회 실패');
    }

    const data = await response.json();
    const stores: GeminiFileSearchStore[] = data.fileSearchStores || [];

    return NextResponse.json({
      success: true,
      stores: stores.map((store) => ({
        name: store.name,
        displayName: store.displayName,
        createTime: store.createTime,
      }))
    });

  } catch (error: unknown) {
    console.error('Error listing file search stores:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
