import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com/upload/v1beta';

// 보안 설정
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
];

// 파일명 sanitize 함수
function sanitizeFileName(fileName: string): string {
  // 경로 구분자 제거 및 위험 문자 제거
  return fileName
    .replace(/[/\\]/g, '_')  // 경로 구분자
    .replace(/\.\./g, '_')   // 상위 디렉토리 참조
    .replace(/[<>:"|?*]/g, '_')  // Windows 예약 문자
    .trim();
}

// 파일 검증 함수
function validateFile(file: File): { valid: boolean; error?: string } {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `파일 크기가 10MB를 초과합니다: ${file.name}` };
  }

  // MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `허용되지 않는 파일 형식입니다: ${file.name} (${file.type})` };
  }

  // 파일명 검증 (빈 이름, 너무 긴 이름)
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: `잘못된 파일명입니다: ${file.name}` };
  }

  return { valid: true };
}

// 단일 파일 업로드 헬퍼 함수
async function uploadSingleFile(
  file: File,
  storeName: string,
  apiKey: string
): Promise<{ name: string; displayName: string; mimeType: string; sizeBytes: number }> {
  // 파일을 Buffer로 변환
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 파일명 sanitize
  const safeFileName = sanitizeFileName(file.name);

  // Resumable upload - Start
  const metadata = {
    displayName: safeFileName,
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
    displayName: uploadData.file?.displayName || safeFileName,
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
        { success: false, error: { code: 'NO_FILES', message: '파일을 선택해주세요.' } },
        { status: 400 }
      );
    }

    // 파일 검증
    const validationErrors: { fileName: string; error: string }[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        validationErrors.push({ fileName: file.name, error: validation.error! });
      }
    }

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_FAILED', message: '유효한 파일이 없습니다.' },
          validationErrors,
        },
        { status: 400 }
      );
    }

    // 여러 파일 업로드 (순차 처리)
    const uploadedFiles = [];
    const errors = [...validationErrors];

    for (const file of validFiles) {
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
    logger.error('파일 업로드 오류', { error: error instanceof Error ? error.message : '알 수 없는 오류' });
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_ERROR', message: '파일 업로드 중 오류가 발생했습니다.' } },
      { status: 500 }
    );
  }
}
