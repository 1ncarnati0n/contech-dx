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

// Users 서비스
export {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUserRole,
  updateUserProfile,
  getUserRoleStats,
} from './users';

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

// Gantt Charts 서비스
export {
  getGanttCharts,
  getGanttChart,
  createGanttChart,
  updateGanttChart,
  deleteGanttChart,
  getGanttChartsByProject,
} from './ganttCharts';

// Tasks 서비스
export {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  createTasksBatch,
} from './tasks';

// Links 서비스
export {
  getLinks,
  getLink,
  createLink,
  updateLink,
  deleteLink,
  createLinksBatch,
} from './links';
