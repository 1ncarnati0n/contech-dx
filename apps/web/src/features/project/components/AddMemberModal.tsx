'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from '@/components/ui';
import { getAllUsersClient } from '@/lib/services/users.client';
import type { Profile, ProjectMemberRole } from '@/lib/types';
import { logger } from '@/lib/utils/logger';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (userId: string, role: ProjectMemberRole) => void;
  projectId: string;
  existingMemberIds: string[];
}

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  pm: '프로젝트 매니저',
  engineer: '엔지니어',
  supervisor: '감독자',
  worker: '작업자',
  member: '일반 멤버',
};

export function AddMemberModal({
  isOpen,
  onClose,
  onAdd,
  projectId,
  existingMemberIds,
}: AddMemberModalProps) {
  void projectId;
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('member');
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const allUsers = await getAllUsersClient();
      // 이미 멤버로 추가된 사용자 제외
      const availableUsers = allUsers.filter((user) => !existingMemberIds.includes(user.id));
      setUsers(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (error) {
      logger.error('Failed to load users:', error);
      toast.error('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [existingMemberIds]);

  useEffect(() => {
    if (isOpen) {
      void loadUsers();
    } else {
      // 모달 닫을 때 상태 초기화
      setSearchQuery('');
      setSelectedUserId('');
      setSelectedRole('member');
    }
  }, [isOpen, loadUsers]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email?.toLowerCase().includes(query) ||
            user.display_name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const handleSubmit = () => {
    if (!selectedUserId) {
      toast.error('사용자를 선택해주세요.');
      return;
    }

    onAdd(selectedUserId, selectedRole);
  };

  const availableUsers = filteredUsers.filter((user) => !existingMemberIds.includes(user.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>멤버 추가</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="이메일 또는 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">로딩 중...</div>
            ) : availableUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                {searchQuery ? '검색 결과가 없습니다.' : '추가할 수 있는 사용자가 없습니다.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-primary-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.display_name || user.email || ''}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">
                            {(user.display_name || user.email || 'U')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate">
                          {user.display_name || user.email || '알 수 없음'}
                        </div>
                        {user.display_name && (
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </div>
                        )}
                      </div>
                      {selectedUserId === user.id && (
                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              역할
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectMemberRole)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isLoading}>
            <UserPlus className="w-4 h-4 mr-2" />
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
