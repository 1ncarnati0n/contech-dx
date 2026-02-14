import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { geminiUploadStart } from '@/lib/utils/geminiApi';
import { apiError, checkAuth, ErrorCode } from '@/lib/utils/apiAuth';
import { z } from 'zod';

// 보안 설정
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 10; // 한 번에 최대 10개 파일

// MIME 타입과 허용 확장자 매핑
const ALLOWED_FILE_TYPES: Record<string, { extensions: string[]; magicBytes?: number[][] }> = {
  'application/pdf': {
    extensions: ['.pdf'],
    magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  'application/msword': {
    extensions: ['.doc'],
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]], // OLE Compound Document
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // ZIP (OOXML)
  },
  'application/vnd.ms-excel': {
    extensions: ['.xls'],
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]], // OLE Compound Document
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extensions: ['.xlsx'],
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // ZIP (OOXML)
  },
  'application/vnd.ms-powerpoint': {
    extensions: ['.ppt'],
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]], // OLE Compound Document
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extensions: ['.pptx'],
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // ZIP (OOXML)
  },
  'text/plain': {
    extensions: ['.txt'],
    // 텍스트 파일은 매직 바이트 없음
  },
  'text/csv': {
    extensions: ['.csv'],
    // CSV 파일은 매직 바이트 없음
  },
  'text/markdown': {
    extensions: ['.md', '.markdown'],
    // 마크다운 파일은 매직 바이트 없음
  },
};

// 위험한 실행 파일 확장자 (이중 확장자 공격 방지)
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.js', '.jse', '.vbs', '.vbe', '.wsf', '.wsh',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash', '.zsh',
  '.app', '.dmg', '.pkg',
  '.jar', '.class',
  '.php', '.asp', '.aspx', '.jsp',
];

const uploadMetadataSchema = z.object({
  storeName: z.string().trim().min(1, '스토어를 선택해주세요.'),
});

// 파일명 sanitize 함수
function sanitizeFileName(fileName: string): string {
  // 경로 구분자 제거 및 위험 문자 제거
  return fileName
    .replace(/[/\\]/g, '_')  // 경로 구분자
    .replace(/\.\./g, '_')   // 상위 디렉토리 참조
    .replace(/[<>:"|?*]/g, '_')  // Windows 예약 문자
    .trim();
}

// 파일 확장자 추출 함수
function getFileExtensions(fileName: string): string[] {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) return [];

  // 마지막 확장자와 이중 확장자 반환
  const extensions: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    extensions.push('.' + parts[i]);
  }
  return extensions;
}

// 이중 확장자 공격 검사 함수
function hasDoubleExtensionAttack(fileName: string): boolean {
  const extensions = getFileExtensions(fileName);

  // 2개 이상의 확장자가 있는 경우
  if (extensions.length >= 2) {
    // 마지막이 아닌 확장자 중 위험한 확장자가 있는지 확인
    for (let i = 0; i < extensions.length - 1; i++) {
      // 문서 확장자 뒤에 다른 확장자가 오는 경우 (예: .pdf.exe)
      const allowedExts = Object.values(ALLOWED_FILE_TYPES).flatMap(t => t.extensions);
      if (allowedExts.includes(extensions[i])) {
        return true; // 이중 확장자 공격 의심
      }
    }

    // 위험한 확장자가 포함된 경우 (예: .exe.pdf)
    for (const ext of extensions) {
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        return true;
      }
    }
  }

  return false;
}

// 매직 바이트 검증 함수 (비동기)
async function validateMagicBytes(file: File, expectedMagicBytes?: number[][]): Promise<boolean> {
  // 텍스트 파일처럼 매직 바이트가 없는 경우 통과
  if (!expectedMagicBytes || expectedMagicBytes.length === 0) {
    return true;
  }

  try {
    // 파일의 처음 8바이트 읽기
    const slice = file.slice(0, 8);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // 허용된 매직 바이트 중 하나와 일치하는지 확인
    return expectedMagicBytes.some(expectedBytes => {
      for (let i = 0; i < expectedBytes.length; i++) {
        if (bytes[i] !== expectedBytes[i]) {
          return false;
        }
      }
      return true;
    });
  } catch {
    return false;
  }
}

// 파일 검증 함수 (비동기로 변경)
async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. 파일명 검증 (빈 이름, 너무 긴 이름)
  if (!file.name || file.name.length > 255) {
    return { valid: false, error: `잘못된 파일명입니다: ${file.name}` };
  }

  // 2. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `파일 크기가 10MB를 초과합니다: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)` };
  }

  // 3. 이중 확장자 공격 검사
  if (hasDoubleExtensionAttack(file.name)) {
    logger.warn('이중 확장자 공격 시도 감지', { fileName: file.name });
    return { valid: false, error: `보안상 허용되지 않는 파일명입니다: ${file.name}` };
  }

  // 4. MIME 타입 검증
  const fileTypeConfig = ALLOWED_FILE_TYPES[file.type];
  if (!fileTypeConfig) {
    return { valid: false, error: `허용되지 않는 파일 형식입니다: ${file.name} (${file.type})` };
  }

  // 5. 확장자와 MIME 타입 일치 검증
  const parts = file.name.split('.');
  if (parts.length < 2) {
    return { valid: false, error: `파일 확장자가 없습니다: ${file.name}` };
  }
  const fileExtension = '.' + parts.pop()!.toLowerCase();
  if (!fileTypeConfig.extensions.includes(fileExtension)) {
    logger.warn('MIME 타입과 확장자 불일치', { fileName: file.name, mimeType: file.type, extension: fileExtension });
    return { valid: false, error: `파일 확장자가 MIME 타입과 일치하지 않습니다: ${file.name}` };
  }

  // 6. 매직 바이트 검증 (파일 내용 확인)
  const magicBytesValid = await validateMagicBytes(file, fileTypeConfig.magicBytes);
  if (!magicBytesValid) {
    logger.warn('매직 바이트 검증 실패', { fileName: file.name, mimeType: file.type });
    return { valid: false, error: `파일 내용이 형식과 일치하지 않습니다: ${file.name}` };
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
  // API 키를 헤더로 전달하여 URL 노출 방지
  const metadata = {
    displayName: safeFileName,
    mimeType: file.type,
  };

  const startResponse = await geminiUploadStart(
    storeName,
    apiKey,
    metadata,
    file.type
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
  // 인증 확인
  const authCheck = await checkAuth();
  if (!authCheck.success) return authCheck.response;

  try {
    const formData = await request.formData();
    const metadataResult = uploadMetadataSchema.safeParse({
      storeName: formData.get('storeName'),
    });

    if (!metadataResult.success) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        '스토어를 선택해주세요.',
        { fieldErrors: metadataResult.error.flatten().fieldErrors }
      );
    }
    const { storeName } = metadataResult.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError(ErrorCode.SERVER_ERROR, 'Gemini API 키가 설정되지 않았습니다.');
    }

    // 여러 파일 수집
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return apiError(ErrorCode.MISSING_FIELD, '파일을 선택해주세요.');
    }

    // 한 번에 업로드 가능한 파일 수 제한
    if (files.length > MAX_FILES_PER_REQUEST) {
      return apiError(
        ErrorCode.LIMIT_EXCEEDED,
        `한 번에 최대 ${MAX_FILES_PER_REQUEST}개 파일만 업로드할 수 있습니다.`,
        { maxFilesPerRequest: MAX_FILES_PER_REQUEST }
      );
    }

    // 파일 검증 (비동기)
    const validationErrors: { fileName: string; error: string }[] = [];
    const validFiles: File[] = [];

    for (const file of files) {
      const validation = await validateFile(file);
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
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: '유효한 파일이 없습니다.',
            details: { validationErrors },
          },
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
    return apiError(ErrorCode.OPERATION_FAILED, '파일 업로드 중 오류가 발생했습니다.');
  }
}
