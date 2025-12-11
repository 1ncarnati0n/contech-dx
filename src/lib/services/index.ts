/**
 * 서비스 레이어 통합 export
 *
 * 사용 예:
 * import { getPosts, createComment, updateUserRole } from '@/lib/services';
 */

// Posts 서비스
export {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getPostsByUserId,
} from './posts';

// Comments 서비스
export {
  getCommentsByPostId,
  createComment,
  deleteComment,
  getCommentsByUserId,
} from './comments';

// Users 서비스 (클라이언트 전용)
export {
  updateUserRole,
  updateUserProfile,
  promoteCurrentUserToAdmin,
} from './users.client';

// Users 서비스 (서버 전용) - 서버 컴포넌트에서만 import 가능
// import { getAllUsers, getUserById, getCurrentUser, getUserRoleStats } from '@/lib/services/users.server';

// Gemini AI 서비스
export {
  listStores,
  createStore,
  deleteStore,
  getStore,
  listFiles,
  uploadFile,
  searchDocuments,
  type FileSearchStore,
  type UploadedFile,
  type SearchMessage,
} from './gemini';

// Project 서비스
export {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByStatus,
  getProjectsByUser,
} from './projects';

// Project Members 서비스
export {
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  isProjectMember,
  getUserRoleInProject,
} from './projectMembers';

// Unit Rates 서비스
export {
  getUnitRates,
  saveUnitRates,
  addUnitRateItem,
  updateUnitRateItem,
  deleteUnitRateItem,
} from './unitRates';

