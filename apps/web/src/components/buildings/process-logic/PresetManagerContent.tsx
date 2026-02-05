'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/Badge';
import type { ProcessLogicPreset } from '@/lib/types';
import { Copy, Trash2, Edit, Check } from 'lucide-react';

interface PresetManagerContentProps {
  presets: ProcessLogicPreset[];
  activePresetId: string | null;
  onApply: (id: string) => void;
  onDuplicate: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { name?: string; description?: string; isDefault?: boolean }) => void;
  onSaveCurrentAs: (name: string, description?: string, isDefault?: boolean) => void;
}

/**
 * 프리셋 관리 콘텐츠 (모달에서 분리)
 */
export function PresetManagerContent({
  presets,
  activePresetId,
  onApply,
  onDuplicate,
  onDelete,
  onUpdate,
  onSaveCurrentAs,
}: PresetManagerContentProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showNewPresetForm, setShowNewPresetForm] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [newPresetIsDefault, setNewPresetIsDefault] = useState(false);

  const handleEdit = (preset: ProcessLogicPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditDescription(preset.description || '');
  };

  const handleSaveEdit = (id: string) => {
    onUpdate(id, {
      name: editName,
      description: editDescription,
    });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleDuplicate = (preset: ProcessLogicPreset) => {
    const newName = `${preset.name} (복사본)`;
    onDuplicate(preset.id, newName);
  };

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return;

    onSaveCurrentAs(newPresetName, newPresetDescription, newPresetIsDefault);
    setShowNewPresetForm(false);
    setNewPresetName('');
    setNewPresetDescription('');
    setNewPresetIsDefault(false);
  };

  return (
    <>
      <div className="space-y-4">
        {/* 새 프리셋 생성 버튼 */}
        {!showNewPresetForm && (
          <Button
            variant="outline"
            onClick={() => setShowNewPresetForm(true)}
            className="w-full"
          >
            현재 설정을 프리셋으로 저장
          </Button>
        )}

        {/* 새 프리셋 생성 폼 */}
        {showNewPresetForm && (
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle>새 프리셋 생성</CardTitle>
              <CardDescription>
                현재 설정을 새로운 프리셋으로 저장합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-preset-name">프리셋 이름 *</Label>
                <Input
                  id="new-preset-name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="예: SK건설 표준, 프로젝트 A 커스텀"
                />
              </div>
              <div>
                <Label htmlFor="new-preset-description">설명 (선택)</Label>
                <Textarea
                  id="new-preset-description"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="이 프리셋에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="new-preset-default"
                  checked={newPresetIsDefault}
                  onChange={(e) => setNewPresetIsDefault(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="new-preset-default" className="cursor-pointer">
                  기본 프리셋으로 설정
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button
                onClick={handleSaveNewPreset}
                disabled={!newPresetName.trim()}
              >
                저장
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewPresetForm(false);
                  setNewPresetName('');
                  setNewPresetDescription('');
                  setNewPresetIsDefault(false);
                }}
              >
                취소
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* 프리셋 목록 */}
        <div className="space-y-3">
          {presets.length === 0 && (
            <p className="text-center text-zinc-500 py-8">
              저장된 프리셋이 없습니다. 현재 설정을 프리셋으로 저장해보세요.
            </p>
          )}

          {presets.map((preset) => (
            <Card
              key={preset.id}
              className={`${
                activePresetId === preset.id ? 'border-blue-500 border-2' : ''
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingId === preset.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mb-2"
                      />
                    ) : (
                      <CardTitle className="flex items-center gap-2">
                        {preset.name}
                        {activePresetId === preset.id && (
                          <Badge variant="default">활성</Badge>
                        )}
                        {preset.isDefault && (
                          <Badge variant="secondary">기본</Badge>
                        )}
                        {!preset.projectId && (
                          <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
                            공통
                          </Badge>
                        )}
                      </CardTitle>
                    )}

                    {editingId === preset.id ? (
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="mt-2"
                      />
                    ) : (
                      <CardDescription>
                        {preset.description || '설명 없음'}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardFooter className="flex gap-2">
                {editingId === preset.id ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(preset.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onApply(preset.id)}
                      disabled={activePresetId === preset.id}
                    >
                      적용
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(preset)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      수정
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(preset)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      복사
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirmId(preset.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      삭제
                    </Button>
                  </>
                )}
              </CardFooter>

              <CardContent className="text-xs text-zinc-500 dark:text-zinc-400 border-t pt-3">
                생성일: {new Date(preset.createdAt).toLocaleDateString('ko-KR')} |
                수정일: {new Date(preset.updatedAt).toLocaleDateString('ko-KR')} |
                생성자: {preset.createdBy}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>프리셋 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 프리셋을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
