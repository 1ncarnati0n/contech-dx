'use client';

import { Box, MousePointer2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useIfcViewerStore } from '../../stores/useIfcViewerStore';
import { useIfcViewerContext } from '../../context/IfcViewerContext';

/**
 * 속성 정보 패널 컴포넌트
 *
 * 선택된 IFC 요소의 속성을 표시합니다.
 */
export function PropertiesPanel() {
  const { selectedElements, clearSelection } = useIfcViewerStore();
  const { clearHighlight } = useIfcViewerContext();

  const handleClearSelection = () => {
    clearHighlight();
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-zinc-100 dark:bg-slate-800 flex items-center justify-between border-b border-zinc-300 dark:border-slate-600">
        <h3 className="font-medium text-zinc-900 dark:text-white text-sm">속성 정보</h3>
        {selectedElements.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-white"
            onClick={handleClearSelection}
            title="선택 해제"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedElements.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-slate-500 py-8">
            <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">요소를 선택하면<br />속성이 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedElements.map((element, index) => (
              <div
                key={element.id || index}
                className="bg-zinc-100 dark:bg-slate-700/50 rounded-lg p-3 border border-zinc-300 dark:border-slate-600"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-4 w-4 text-primary" />
                  <span className="font-medium text-zinc-900 dark:text-white text-sm truncate">
                    {element.name}
                  </span>
                </div>
                <div className="text-xs text-zinc-600 dark:text-slate-400 mb-2">
                  타입: {element.type}
                </div>
                {Object.keys(element.properties).length > 0 && (
                  <div className="space-y-1 border-t border-zinc-300 dark:border-slate-600 pt-2 mt-2">
                    {Object.entries(element.properties).slice(0, 10).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-zinc-600 dark:text-slate-400 truncate max-w-[120px]">{key}</span>
                        <span className="text-zinc-800 dark:text-slate-300 truncate max-w-[120px]">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(element.properties).length > 10 && (
                      <div className="text-xs text-zinc-500 dark:text-slate-500 text-center pt-1">
                        +{Object.keys(element.properties).length - 10}개 더 보기
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
