'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui';

/**
 * Evaluates a safe mathematical expression (=formula).
 * Only allows digits, +, -, *, /, parentheses, dots, and spaces.
 */
export function calculateFormula(formula: string): number | null {
  try {
    let expression = formula.trim();
    if (expression.startsWith('=')) {
      expression = expression.substring(1).trim();
    }

    if (!expression) return null;

    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
    if (sanitized !== expression) return null;

    const result = new Function('return ' + sanitized)(); // Safe: sanitized to digits and operators only
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

type RowInfo = {
  type: 'group' | 'floor' | 'summary';
  label: string;
  floor?: {
    id: string;
    levelType?: string;
    floorClass?: string;
    floorNumber?: number;
  };
};

interface TradeInputCellProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  rowIndex?: number;
  colIndex?: number;
  /** Optional rows array for cell address labels (FloorTradeTable feature) */
  rows?: RowInfo[];
  floorId?: string;
  tradeGroup?: string;
  fieldPath?: string;
  onPaste?: (e: React.ClipboardEvent, startRow: number, startCol: number) => void;
  onSelect?: (rowIndex: number, colIndex: number, isMultiSelect: boolean) => void;
  onDragStart?: (rowIndex: number, colIndex: number) => void;
  onDragMove?: (rowIndex: number, colIndex: number) => void;
  isDragging?: boolean;
  onTextDragStart?: () => void;
  onTextDragEnd?: () => void;
  isDraggingText?: boolean;
  isDraggingTextRef?: React.MutableRefObject<boolean>;
  isSelected?: boolean;
  isRecentlyPasted?: boolean;
  isLocked?: boolean;
  /** Optional function to compute a cell address label (e.g., "D6") */
  getCellAddress?: (colIndex: number, rowIndex: number) => string | null;
}

/** Generate a human-readable aria-label from fieldPath */
function getFieldLabel(fieldPath?: string): string {
  if (!fieldPath) return '물량 입력';
  const labels: Record<string, string> = {
    'gangForm.areaM2': '갱폼 면적(M²)',
    'alForm.areaM2': '알폼 면적(M²)',
    'euroForm.areaM2': '유로폼 면적(M²)',
    'rebar.ton': '철근(TON)',
    'rebar.wall': '철근 벽(TON)',
    'rebar.beamSlab': '철근 보/슬래브(TON)',
    'concrete.volumeM3': '콘크리트(M³)',
    'concrete.wall': '콘크리트 벽(M³)',
    'concrete.beamSlab': '콘크리트 보/슬래브(M³)',
  };
  return labels[fieldPath] || '물량 입력';
}

function formatValue(num: number | null | undefined): string {
  if (num === null || num === undefined || num === 0) return '-';
  return num.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseValue(str: string): number | null {
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Shared editable cell component for trade tables.
 *
 * Features:
 * - Excel-style formula support (=expression)
 * - localStorage-backed formula persistence
 * - Korean locale number formatting (천단위 구분자)
 * - Cell drag selection integration
 * - Clipboard paste handling (Ctrl+V / Cmd+V)
 * - Optional cell address label display
 */
export function TradeInputCell({
  value,
  onChange,
  rowIndex,
  colIndex,
  floorId,
  tradeGroup,
  fieldPath,
  onPaste,
  onSelect,
  onDragStart,
  onDragMove,
  isDragging,
  onTextDragStart,
  onTextDragEnd,
  isSelected,
  isRecentlyPasted,
  getCellAddress,
}: TradeInputCellProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const formulaKey = floorId && fieldPath ? `formula-${floorId}-${tradeGroup}-${fieldPath}` : null;

  const getStoredFormula = (): string | null => {
    if (!formulaKey) return null;
    try {
      return localStorage.getItem(formulaKey);
    } catch {
      return null;
    }
  };

  const setStoredFormula = (formula: string | null) => {
    if (!formulaKey) return;
    try {
      if (formula) {
        localStorage.setItem(formulaKey, formula);
      } else {
        localStorage.removeItem(formulaKey);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  const [formula, setFormula] = useState<string | null>(getStoredFormula());

  // Focus handler
  const handleFocus = () => {
    setIsFocused(true);
    if (formula) {
      setDisplayValue(formula);
    } else if (value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  };

  // Blur handler
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isPasting) {
      setIsFocused(false);
      return;
    }

    setIsFocused(false);
    const inputValue = e.target.value.trim();

    if (!inputValue) {
      if (value !== null && value !== undefined && value !== 0) {
        setDisplayValue(formatValue(value));
        return;
      }
      onChange(null);
      setDisplayValue('');
      setFormula(null);
      setStoredFormula(null);
      return;
    }

    if (inputValue.startsWith('=')) {
      const calculatedValue = calculateFormula(inputValue);
      if (calculatedValue !== null) {
        setFormula(inputValue);
        setStoredFormula(inputValue);
        onChange(calculatedValue);
        setDisplayValue(formatValue(calculatedValue));
      } else {
        const parsedValue = parseValue(inputValue);
        onChange(parsedValue);
        setDisplayValue(formatValue(parsedValue));
        setFormula(null);
        setStoredFormula(null);
      }
    } else {
      const parsedValue = parseValue(inputValue);
      onChange(parsedValue);
      setDisplayValue(formatValue(parsedValue));
      setFormula(null);
      setStoredFormula(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  // Sync displayValue with value changes
  useEffect(() => {
    if (!isFocused || isPasting) {
      if (formula) {
        const calculatedValue = calculateFormula(formula);
        if (calculatedValue !== null) {
          queueMicrotask(() => {
            setDisplayValue(formatValue(calculatedValue));
          });
        } else {
          queueMicrotask(() => {
            setDisplayValue(formatValue(value));
          });
        }
      } else {
        queueMicrotask(() => {
          setDisplayValue(formatValue(value));
        });
      }
    }
  }, [value, isFocused, isPasting, formula]);

  // Load formula on mount and recalculate if stale
  useEffect(() => {
    if (!formulaKey) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(formulaKey);
    } catch {
      stored = null;
    }

    if (stored) {
      queueMicrotask(() => {
        setFormula(stored);
      });
      const calculated = calculateFormula(stored);
      if (calculated !== null && calculated !== value) {
        onChange(calculated);
      }
    }
  }, [formulaKey, onChange, value]);

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!onPaste || rowIndex === undefined || colIndex === undefined) return;

    e.preventDefault();
    e.stopPropagation();

    const clipboardData = e.clipboardData.getData('text/plain');
    if (!clipboardData || !clipboardData.trim()) return;

    setIsPasting(true);

    const input = e.target as HTMLInputElement;
    if (input?.setSelectionRange) {
      input.setSelectionRange(0, 0);
    }

    const syntheticEvent = {
      ...e,
      preventDefault: () => {},
      stopPropagation: () => {},
      clipboardData: {
        getData: (format: string) => format === 'text/plain' ? clipboardData : '',
      } as DataTransfer,
    } as React.ClipboardEvent;

    onPaste(syntheticEvent, rowIndex, colIndex);

    requestAnimationFrame(() => {
      setTimeout(() => setIsPasting(false), 100);
    });
  };

  // Keyboard handler (Ctrl+V, Delete/Backspace)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      e.stopPropagation();

      if (onPaste && rowIndex !== undefined && colIndex !== undefined) {
        navigator.clipboard.readText().then((clipboardText) => {
          if (clipboardText.trim()) {
            setIsPasting(true);
            const input = e.target as HTMLInputElement;
            if (input) {
              setDisplayValue('');
              input.value = '';
            }

            const syntheticEvent = {
              clipboardData: {
                getData: (type: string) => type === 'text/plain' ? clipboardText : '',
              },
              preventDefault: () => {},
              stopPropagation: () => {},
            } as React.ClipboardEvent;

            onPaste(syntheticEvent, rowIndex, colIndex);
            setTimeout(() => setIsPasting(false), 100);
          }
        }).catch(() => {});
      }
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && isFocused) {
      const input = e.target as HTMLInputElement;
      if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
        e.preventDefault();
        onChange(null);
        setDisplayValue('');
      }
    }
  };

  // Mouse down on input (cell selection + text drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();

    if (onTextDragStart) onTextDragStart();

    const handleTextSelectionEnd = () => {
      if (onTextDragEnd) onTextDragEnd();
      window.removeEventListener('mouseup', handleTextSelectionEnd);
    };
    window.addEventListener('mouseup', handleTextSelectionEnd, { once: true });

    if (rowIndex !== undefined && colIndex !== undefined) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isMultiSelect && onDragStart) {
        onDragStart(rowIndex, colIndex);
      }
      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  const handleInputMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isDragging && onDragMove && rowIndex !== undefined && colIndex !== undefined) {
      onDragMove(rowIndex, colIndex);
    }
    e.stopPropagation();
  };

  const handleCellMouseDown = (e: React.MouseEvent<HTMLTableCellElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('input')) return;

    if (rowIndex !== undefined && colIndex !== undefined && onDragStart) {
      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!isMultiSelect) {
        onDragStart(rowIndex, colIndex);
      }
      if (onSelect) {
        onSelect(rowIndex, colIndex, isMultiSelect);
      }
    }
  };

  const getCellBgClass = () => {
    if (isRecentlyPasted) return 'bg-green-100 dark:bg-green-900/50 animate-pulse';
    if (isSelected) return 'bg-blue-100 dark:bg-blue-900/50';
    return '';
  };

  const cellAddress = getCellAddress && rowIndex !== undefined && colIndex !== undefined
    ? getCellAddress(colIndex, rowIndex)
    : null;

  return (
    <td
      className={`${cellAddress ? 'relative ' : ''}px-0.5 py-0 border-r border-slate-200 dark:border-slate-800 w-16 transition-colors duration-150 ${getCellBgClass()}`}
      onMouseDown={handleCellMouseDown}
    >
      {cellAddress && (
        <span
          className="absolute top-0.5 left-0.5 pointer-events-none select-none z-10 text-[9px] font-mono leading-none text-slate-400/60 dark:text-slate-600/60 transition-opacity duration-150"
          aria-hidden="true"
        >
          {cellAddress}
        </span>
      )}

      <Input
        type="text"
        inputMode="decimal"
        aria-label={cellAddress ? `${cellAddress} ${getFieldLabel(fieldPath)}` : getFieldLabel(fieldPath)}
        value={isFocused ? displayValue : formatValue(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleMouseDown(e);
        }}
        onMouseMove={handleInputMouseMove}
        data-row-index={rowIndex}
        data-col-index={colIndex}
        style={{ userSelect: 'text' }}
        className="w-full h-6 text-xs px-1 py-0.5 border-0 rounded-none text-center bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500/50 focus-visible:ring-1 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      />
    </td>
  );
}
