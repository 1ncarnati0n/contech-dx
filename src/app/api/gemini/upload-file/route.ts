import { NextRequest, NextResponse } from 'next/server';

const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';

// 단일 파일 업로드 헬퍼 함수
async function uploadSingleFile(
  file: File,
  storeName: string,
  apiKey: string
): Promise<{ name: string; displayName: string; mimeType: string; sizeBytes: number }> {
  // 파일을 Buffer로 변환
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Resumable upload - Start
  const metadata = {
    displayName: file.name,
    mimeType: file.type,
  };

  const startResponse = await fetch(
    `${GEMINI_UPLOAD_BASE}/${storeName}:uploadToFileSearchStore?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Type': file.type,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!startResponse.ok) {
    const errorData = await startResponse.json();
    throw new Error(errorData.error?.message || `${file.name} 업로드 시작 실패`);
  }

  const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error(`${file.name} 업로드 URL을 받지 못했습니다.`);
  }

  // Resumable upload - Finalize
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': file.type,
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json();
    throw new Error(errorData.error?.message || `${file.name} 업로드 실패`);
  }

  const uploadData = await uploadResponse.json();

  return {
    name: uploadData.file?.name || uploadData.name,
    displayName: uploadData.file?.displayName || file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const storeName = formData.get('storeName') as string;

    if (!storeName) {
      return NextResponse.json(
        { error: '스토어를 선택해주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 여러 파일 수집
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: '파일을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 여러 파일 업로드 (순차 처리)
    const uploadedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await uploadSingleFile(file, storeName, apiKey);
        uploadedFiles.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        errors.push({ fileName: file.name, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: uploadedFiles.length > 0,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      message: `${uploadedFiles.length}개 파일 업로드 성공${errors.length > 0 ? `, ${errors.length}개 실패` : ''}`,
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    const errorMessage = error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
