/**
 * 서비스 레이어 통합 export
 *
 * 사용 예:
 * import { getPosts, createComment, updateUserRole } from '@/lib/services';
 */

// Posts 서비스 - Server (서버 컴포넌트에서만 사용)
export {
  getPosts,
  getPostById,
  getPostsByUserId,
} from './posts.server';

// Posts 서비스 - Client (클라이언트 컴포넌트에서 사용)
export {
  createPost,
  updatePost,
  deletePost,
} from './posts.client';

// Comments 서비스 - Server (서버 컴포넌트에서만 사용)
export {
  getCommentsByPostId,
  getCommentsByUserId,
} from './comments.server';

// Comments 서비스 - Client (클라이언트 컴포넌트에서 사용)
export {
  createComment,
  deleteComment,
} from './comments.client';

// Users 서비스 - Server (서버 컴포넌트에서만 사용)
export {
  getAllUsers,
  getUserById,
  getCurrentUser,
  getUserRoleStats,
} from './users.server';

// Users 서비스 - Client (클라이언트 컴포넌트에서 사용)
export {
  updateUserRole,
  updateUserProfile,
  promoteCurrentUserToAdmin,
} from './users.client';

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

