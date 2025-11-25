"use client";

import { Combo, RadioButtonGroup } from "@svar-ui/react-core";
import { defaultEditorItems, registerEditorItem } from "@svar-ui/react-gantt";

import { users, type GanttUserOption } from "../../data/users";
import { TASK_TYPES } from "./taskConfig";

interface AssignedComboProps {
  value: string | number | undefined;
  options: GanttUserOption[];
  onChange: (payload: { value: string | number | undefined }) => void;
}

const FIELD_OVERRIDES: Record<string, { label?: string; placeholder?: string }> = {
  text: { label: "작업명", placeholder: "작업 이름을 입력하세요" },
  details: { label: "설명", placeholder: "세부 내용을 입력하세요" },
  type: { label: "작업 유형" },
  start: { label: "시작일" },
  end: { label: "종료일" },
  progress: { label: "진행율" },
  links: { label: "연결 관계" },
};

const AssignedCombo = ({ value, options, onChange }: AssignedComboProps) => {
  const renderOption = ({ option }: { option: GanttUserOption }) => <span>{option?.label ?? ""}</span>;
  return (
    <Combo
      clear
      options={options}
      value={value}
      onChange={onChange}
      placeholder="담당자를 선택하세요"
    >
      {renderOption as any}
    </Combo>
  );
};

// Ensure this runs on client only, though nextjs client components will handle it
if (typeof window !== 'undefined') {
    registerEditorItem("radio", RadioButtonGroup);
    registerEditorItem("assigned-combo", AssignedCombo);
}

const createEditorItems = () => {
  const baseItems = defaultEditorItems
    .filter((item) => item.key !== "duration")
    .map((item) => {
      const overrides = FIELD_OVERRIDES[item.key as string];
      const next: Record<string, any> = { ...item };

      // 각 필드에 고유 id 할당 (중복 id 방지)
      if (!next.id && item.key) {
        next.id = `editor-field-${item.key}`;
      }

      if (overrides?.label) {
        next.label = overrides.label;
      }

      if (overrides?.placeholder) {
        next.config = {
          ...(next.config ?? {}),
          placeholder: overrides.placeholder,
        };
      }

      return next;
    });

  const typeIndex = baseItems.findIndex((item) => item.key === "type");

  if (typeIndex !== -1) {
    baseItems.splice(
      typeIndex,
      1,
      {
        key: "type",
        id: "task-type-field",
        comp: "radio",
        label: FIELD_OVERRIDES.type?.label ?? "작업 유형",
        options: TASK_TYPES.map(({ id, label }) => ({
          id,
          label,
          value: id,
        })),
        config: {
          type: "inline",
        },
      },
      {
        key: "assigned",
        id: "task-assigned-field",
        comp: "assigned-combo",
        label: "담당자",
        options: users,
        config: {
          placeholder: "담당자를 선택하세요",
        },
      },
    );
  }

  return baseItems;
};

export const editorItems = createEditorItems();

