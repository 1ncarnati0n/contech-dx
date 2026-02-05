'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { CalculationFormula, FormulaVariable } from '@/lib/types';
import { Plus, Trash2, Edit, Check, X, AlertCircle } from 'lucide-react';

interface FormulaEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulas: CalculationFormula[];
  onCreate: (formula: Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Omit<CalculationFormula, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>>) => void;
  onDelete: (id: string) => void;
  onValidate: (formula: string) => { isValid: boolean; error?: string };
}

/**
 * 계산 공식 편집 모달
 *
 * 내장 공식 (읽기 전용)과 사용자 정의 공식을 관리합니다.
 */
export function FormulaEditorModal({
  open,
  onOpenChange,
  formulas,
  onCreate,
  onUpdate,
  onDelete,
  onValidate,
}: FormulaEditorModalProps) {
  const [showNewFormulaForm, setShowNewFormulaForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 새 공식 폼 상태
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newVariables, setNewVariables] = useState<FormulaVariable[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 편집 폼 상태
  const [editName, setEditName] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editExample, setEditExample] = useState('');
  const [editVariables, setEditVariables] = useState<FormulaVariable[]>([]);

  const handleStartEdit = (formula: CalculationFormula) => {
    if (formula.isBuiltIn) return;

    setEditingId(formula.id);
    setEditName(formula.name);
    setEditFormula(formula.formula);
    setEditExample(formula.example || '');
    setEditVariables(formula.variables);
  };

  const handleSaveEdit = (id: string) => {
    const validation = onValidate(editFormula);
    if (!validation.isValid) {
      setValidationError(validation.error || '공식이 유효하지 않습니다.');
      return;
    }

    onUpdate(id, {
      name: editName,
      formula: editFormula,
      example: editExample,
      variables: editVariables,
    });

    setEditingId(null);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setValidationError(null);
  };

  const handleCreateFormula = () => {
    if (!newName.trim() || !newFormula.trim()) return;

    const validation = onValidate(newFormula);
    if (!validation.isValid) {
      setValidationError(validation.error || '공식이 유효하지 않습니다.');
      return;
    }

    onCreate({
      name: newName,
      formula: newFormula,
      example: newExample,
      variables: newVariables,
    });

    // 폼 초기화
    setShowNewFormulaForm(false);
    setNewName('');
    setNewFormula('');
    setNewExample('');
    setNewVariables([]);
    setValidationError(null);
  };

  const handleAddVariable = (isEdit: boolean) => {
    const newVar: FormulaVariable = {
      name: '',
      description: '',
      valueType: 'number',
    };

    if (isEdit) {
      setEditVariables([...editVariables, newVar]);
    } else {
      setNewVariables([...newVariables, newVar]);
    }
  };

  const handleUpdateVariable = (
    index: number,
    field: keyof FormulaVariable,
    value: string,
    isEdit: boolean
  ) => {
    if (isEdit) {
      const updated = [...editVariables];
      updated[index] = { ...updated[index], [field]: value };
      setEditVariables(updated);
    } else {
      const updated = [...newVariables];
      updated[index] = { ...updated[index], [field]: value };
      setNewVariables(updated);
    }
  };

  const handleRemoveVariable = (index: number, isEdit: boolean) => {
    if (isEdit) {
      setEditVariables(editVariables.filter((_, i) => i !== index));
    } else {
      setNewVariables(newVariables.filter((_, i) => i !== index));
    }
  };

  const renderVariableEditor = (variables: FormulaVariable[], isEdit: boolean) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>변수 정의</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAddVariable(isEdit)}
        >
          <Plus className="w-4 h-4 mr-1" />
          변수 추가
        </Button>
      </div>

      {variables.length === 0 && (
        <p className="text-sm text-zinc-500">변수를 추가해주세요.</p>
      )}

      {variables.map((variable, index) => (
        <div key={index} className="flex gap-2 items-start p-2 bg-zinc-50 rounded">
          <Input
            placeholder="변수명 (예: 수량)"
            value={variable.name}
            onChange={(e) => handleUpdateVariable(index, 'name', e.target.value, isEdit)}
            className="w-32"
          />
          <Input
            placeholder="설명"
            value={variable.description}
            onChange={(e) => handleUpdateVariable(index, 'description', e.target.value, isEdit)}
            className="flex-1"
          />
          <Select
            value={variable.valueType}
            onValueChange={(value) => handleUpdateVariable(index, 'valueType', value, isEdit)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">숫자</SelectItem>
              <SelectItem value="reference">참조</SelectItem>
              <SelectItem value="calculated">계산</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRemoveVariable(index, isEdit)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>계산 공식 관리</DialogTitle>
            <DialogDescription>
              공정 계산에 사용되는 공식을 관리합니다. 내장 공식은 읽기 전용입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 새 공식 생성 버튼 */}
            {!showNewFormulaForm && (
              <Button
                variant="outline"
                onClick={() => setShowNewFormulaForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                새 공식 추가
              </Button>
            )}

            {/* 새 공식 생성 폼 */}
            {showNewFormulaForm && (
              <Card className="border-2 border-blue-500">
                <CardHeader>
                  <CardTitle>새 공식 추가</CardTitle>
                  <CardDescription>
                    지원 함수: CEIL, FLOOR, ROUND, MIN, MAX, ABS<br />
                    변수 형식: {'{변수명}'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="new-formula-name">공식 이름 *</Label>
                    <Input
                      id="new-formula-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="예: 총작업인원, 장비대수"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-formula-formula">수식 *</Label>
                    <Input
                      id="new-formula-formula"
                      value={newFormula}
                      onChange={(e) => {
                        setNewFormula(e.target.value);
                        setValidationError(null);
                      }}
                      placeholder="예: CEIL({수량} / {인당생산성})"
                    />
                    {validationError && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {validationError}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="new-formula-example">예제 (선택)</Label>
                    <Textarea
                      id="new-formula-example"
                      value={newExample}
                      onChange={(e) => setNewExample(e.target.value)}
                      placeholder="예: 형틀 500㎡ ÷ 인당생산성 10㎡ = 50명"
                      rows={2}
                    />
                  </div>

                  {renderVariableEditor(newVariables, false)}
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    onClick={handleCreateFormula}
                    disabled={!newName.trim() || !newFormula.trim()}
                  >
                    추가
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewFormulaForm(false);
                      setNewName('');
                      setNewFormula('');
                      setNewExample('');
                      setNewVariables([]);
                      setValidationError(null);
                    }}
                  >
                    취소
                  </Button>
                </CardFooter>
              </Card>
            )}

            {/* 공식 목록 */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-700">내장 공식</h3>
              {formulas
                .filter((f) => f.isBuiltIn)
                .map((formula) => (
                  <Card key={formula.id} className="bg-zinc-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {formula.name}
                        <Badge variant="secondary">읽기 전용</Badge>
                      </CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {formula.formula}
                      </CardDescription>
                    </CardHeader>
                    {formula.example && (
                      <CardContent>
                        <p className="text-sm text-zinc-600">
                          <strong>예제:</strong> {formula.example}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}

              <h3 className="text-sm font-semibold text-zinc-700 mt-6">사용자 정의 공식</h3>
              {formulas.filter((f) => !f.isBuiltIn).length === 0 && (
                <p className="text-center text-zinc-500 py-4">
                  사용자 정의 공식이 없습니다.
                </p>
              )}

              {formulas
                .filter((f) => !f.isBuiltIn)
                .map((formula) => (
                  <Card key={formula.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingId === formula.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="mb-2"
                            />
                          ) : (
                            <CardTitle className="text-base">{formula.name}</CardTitle>
                          )}

                          {editingId === formula.id ? (
                            <div className="space-y-2 mt-2">
                              <Input
                                value={editFormula}
                                onChange={(e) => {
                                  setEditFormula(e.target.value);
                                  setValidationError(null);
                                }}
                                className="font-mono text-sm"
                              />
                              {validationError && (
                                <div className="flex items-center gap-1 text-sm text-red-600">
                                  <AlertCircle className="w-4 h-4" />
                                  {validationError}
                                </div>
                              )}
                            </div>
                          ) : (
                            <CardDescription className="font-mono text-sm">
                              {formula.formula}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {editingId === formula.id && (
                      <CardContent className="space-y-3">
                        <div>
                          <Label>예제</Label>
                          <Textarea
                            value={editExample}
                            onChange={(e) => setEditExample(e.target.value)}
                            rows={2}
                          />
                        </div>
                        {renderVariableEditor(editVariables, true)}
                      </CardContent>
                    )}

                    {editingId !== formula.id && formula.example && (
                      <CardContent>
                        <p className="text-sm text-zinc-600">
                          <strong>예제:</strong> {formula.example}
                        </p>
                      </CardContent>
                    )}

                    <CardFooter className="flex gap-2">
                      {editingId === formula.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSaveEdit(formula.id)}>
                            <Check className="w-4 h-4 mr-1" />
                            저장
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            취소
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(formula)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirmId(formula.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공식 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 공식을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
