/**
 * 공통 Zod 스키마 라이브러리
 *
 * 폼 검증에 사용되는 재사용 가능한 스키마와 메시지를 제공합니다.
 */

import { z } from 'zod';

// ============================================
// 검증 메시지 상수
// ============================================

export const ValidationMessages = {
  required: (field: string) => `${field}을(를) 입력해주세요`,
  minLength: (field: string, min: number) =>
    `${field}은(는) 최소 ${min}자 이상이어야 합니다`,
  maxLength: (field: string, max: number) =>
    `${field}은(는) ${max.toLocaleString()}자를 초과할 수 없습니다`,
  email: '올바른 이메일 형식이 아닙니다',
  passwordMismatch: '비밀번호가 일치하지 않습니다',
  invalidFormat: (field: string) => `${field} 형식이 올바르지 않습니다`,
} as const;

// ============================================
// 기본 필드 스키마
// ============================================

/**
 * 이메일 스키마
 */
export const emailSchema = z
  .string()
  .min(1, ValidationMessages.required('이메일'))
  .email(ValidationMessages.email);

/**
 * 비밀번호 스키마 (기본: 6-100자)
 */
export const passwordSchema = z
  .string()
  .min(6, ValidationMessages.minLength('비밀번호', 6))
  .max(100, ValidationMessages.maxLength('비밀번호', 100));

/**
 * 필수 문자열 스키마 팩토리
 */
export function requiredString(fieldName: string) {
  return z.string().min(1, ValidationMessages.required(fieldName));
}

/**
 * 길이 제한 문자열 스키마 팩토리
 */
export function boundedString(fieldName: string, min: number, max: number) {
  return z
    .string()
    .min(1, ValidationMessages.required(fieldName))
    .min(min, ValidationMessages.minLength(fieldName, min))
    .max(max, ValidationMessages.maxLength(fieldName, max));
}

// ============================================
// 인증 관련 스키마
// ============================================

/**
 * 로그인 폼 스키마
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * 회원가입 폼 스키마
 */
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, ValidationMessages.required('비밀번호 확인')),
    name: boundedString('이름', 2, 50),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: ValidationMessages.passwordMismatch,
    path: ['confirmPassword'],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

// ============================================
// 게시글/댓글 관련 스키마
// ============================================

/**
 * 게시글 폼 스키마
 */
export const postSchema = z.object({
  title: boundedString('제목', 2, 200),
  content: boundedString('내용', 10, 10000),
});

export type PostFormValues = z.infer<typeof postSchema>;

/**
 * 댓글 폼 스키마
 */
export const commentSchema = z.object({
  content: boundedString('댓글', 2, 1000),
});

export type CommentFormValues = z.infer<typeof commentSchema>;

// ============================================
// 프로젝트 관련 스키마
// ============================================

/**
 * 프로젝트 생성/수정 폼 스키마
 */
export const projectSchema = z.object({
  name: boundedString('프로젝트명', 2, 100),
  description: z.string().max(1000, ValidationMessages.maxLength('설명', 1000)).optional(),
  status: z.enum(['announcement', 'bidding', 'award', 'construction_start', 'completion']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

// ============================================
// 빌딩 관련 스키마
// ============================================

/**
 * 빌딩 기본 정보 스키마
 */
export const buildingBasicSchema = z.object({
  name: boundedString('빌딩명', 1, 100),
  groundFloors: z.coerce.number().min(1, '지상 층수는 1 이상이어야 합니다').max(200),
  basementFloors: z.coerce.number().min(0).max(20),
  phFloors: z.coerce.number().min(0).max(10),
  coreCount: z.coerce.number().min(1).max(10),
});

export type BuildingBasicFormValues = z.infer<typeof buildingBasicSchema>;

// ============================================
// 빌딩 기본정보 상세 스키마 (BuildingBasicInfo 컴포넌트용)
// ============================================

/**
 * 단위세대 패턴 스키마
 */
export const unitTypePatternSchema = z.object({
  from: z.number().min(1, '시작 호수는 1 이상이어야 합니다'),
  to: z.number().min(1, '끝 호수는 1 이상이어야 합니다'),
  type: z.string().min(1, '세대 타입을 입력해주세요'),
  coreNumber: z.number().min(1).max(10).optional(),
}).refine(
  (data) => data.to >= data.from,
  { message: '끝 호수는 시작 호수 이상이어야 합니다', path: ['to'] }
);

export type UnitTypePatternFormValues = z.infer<typeof unitTypePatternSchema>;

/**
 * 층고 설정 스키마 (mm 단위)
 */
export const floorHeightsSchema = z.object({
  basement2: z.number()
    .min(2500, '지하2층 층고는 2500mm 이상이어야 합니다')
    .max(10000, '층고는 10000mm 이하여야 합니다'),
  basement1: z.number()
    .min(2500, '지하1층 층고는 2500mm 이상이어야 합니다')
    .max(10000),
  floor1: z.number()
    .min(2500, '1층 층고는 2500mm 이상이어야 합니다')
    .max(10000),
  floor2: z.number().min(2000).max(10000),
  floor3: z.number().min(2000).max(10000),
  floor4: z.number().min(2000).max(10000).optional(),
  floor5: z.number().min(2000).max(10000).optional(),
  standard: z.number()
    .min(2000, '기준층 층고는 2000mm 이상이어야 합니다')
    .max(5000, '기준층 층고는 5000mm 이하여야 합니다'),
  top: z.number()
    .min(2500, '최상층 층고는 2500mm 이상이어야 합니다')
    .max(10000),
  ph: z.union([
    z.number().min(2000).max(10000),
    z.array(z.number().min(2000).max(10000)),
  ]),
});

export type FloorHeightsFormValues = z.infer<typeof floorHeightsSchema>;

/**
 * 층수 설정 스키마
 */
export const floorCountSchema = z.object({
  basement: z.number()
    .min(0, '지하층 수는 0 이상이어야 합니다')
    .max(10, '지하층 수는 10 이하여야 합니다'),
  ground: z.number()
    .min(1, '지상층 수는 1 이상이어야 합니다')
    .max(100, '지상층 수는 100 이하여야 합니다'),
  ph: z.number()
    .min(0, '옥탑층 수는 0 이상이어야 합니다')
    .max(5, '옥탑층 수는 5 이하여야 합니다'),
  coreGroundFloors: z.array(z.number().min(0).max(100)).optional(),
  coreBasementFloors: z.array(z.number().min(0).max(10)).optional(),
  corePhFloors: z.array(z.number().min(0).max(5)).optional(),
  pilotisCount: z.number().min(0).max(50).optional(),
  corePilotisCounts: z.array(z.number().min(0).max(50)).optional(),
  corePilotisHeights: z.array(z.number().min(0).max(10)).optional(),
  hasHighCeilingEquipmentRoom: z.boolean().optional(),
});

export type FloorCountFormValues = z.infer<typeof floorCountSchema>;

/**
 * 빌딩 기본정보 전체 스키마 (BuildingBasicInfo 폼 검증용)
 */
export const buildingBasicInfoSchema = z.object({
  buildingName: z.string().min(1, '동 이름을 입력해주세요'),
  coreType: z.enum(['중복도(판상형)', '타워형', '편복도']),
  slabType: z.enum(['벽식구조', 'RC구조', '벽식구조(내부기둥)']),
  unitTypePattern: z.array(unitTypePatternSchema)
    .min(1, '단위세대 구성을 1개 이상 추가해주세요'),
  floorCount: floorCountSchema,
  heights: floorHeightsSchema,
  standardFloorCycle: z.number().min(0).max(30).optional(),
});

export type BuildingBasicInfoFormValues = z.infer<typeof buildingBasicInfoSchema>;

// ============================================
// API 요청 검증 스키마
// ============================================

/**
 * ID 파라미터 스키마
 */
export const idParamSchema = z.object({
  id: z.string().uuid('올바른 ID 형식이 아닙니다'),
});

/**
 * 페이지네이션 쿼리 스키마
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
