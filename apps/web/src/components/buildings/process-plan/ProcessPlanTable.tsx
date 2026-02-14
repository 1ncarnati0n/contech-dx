import { Fragment, type ReactNode } from 'react';

interface ProcessPlanTableProps {
  hasProcessColumns: boolean;
  children: ReactNode;
  summaryLabelClassName?: string;
}

export function ProcessPlanTable({
  hasProcessColumns,
  children,
  summaryLabelClassName = 'text-zinc-900 dark:text-white',
}: ProcessPlanTableProps) {
  return (
    <div className="flex-1 min-w-0 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">공정 목록</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm table-fixed">
          <colgroup>
            <col style={{ width: '92px' }} />
            <col style={{ width: '44px' }} />
            <col style={{ width: '52px' }} />
            <col style={{ width: '48px' }} />
            <col style={{ width: '48px' }} />
            <col style={{ width: '52px' }} />
            <col style={{ width: '52px' }} />
            <col style={{ width: '54px' }} />
            <col style={{ width: '58px' }} />
            <col style={{ width: '90px' }} />
            <col style={{ width: '56px' }} />
          </colgroup>
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr className="border-b border-zinc-200 dark:border-zinc-800" style={{ height: '24px' }}>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                구분
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                층수
              </th>
              <th
                colSpan={4}
                className="px-1 py-0.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                style={{ whiteSpace: 'nowrap' }}
              >
                형틀
              </th>
              <th
                rowSpan={2}
                className="px-0.5 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.1' }}
              >
                해체/<br />정리
              </th>
              <th
                rowSpan={2}
                className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                철근
              </th>
              <th
                rowSpan={2}
                className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r-2 border-zinc-200 dark:border-zinc-800"
                style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                콘크리트
              </th>
              {hasProcessColumns && (
                <Fragment>
                  <th
                    rowSpan={2}
                    className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                    style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    공정타입
                  </th>
                  <th
                    rowSpan={2}
                    className="px-1 py-1 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-800"
                    style={{ height: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    세부공정
                  </th>
                </Fragment>
              )}
            </tr>
            <tr className="border-b border-zinc-200 dark:border-zinc-800" style={{ height: '20px' }}>
              <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                합계
              </th>
              <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                갱폼
              </th>
              <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                알폼
              </th>
              <th className="px-0.5 py-0.5 text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-800" style={{ whiteSpace: 'nowrap' }}>
                유로폼
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
            {children}
            <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" style={{ height: '24px' }}>
              <td
                className={`px-2 py-1 text-center text-xs font-semibold border-r border-zinc-200 dark:border-zinc-800 align-middle ${summaryLabelClassName}`}
                style={{ height: '24px' }}
              >
                합계
              </td>
              <td className="px-2 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              <td className="px-1 py-1 text-center text-xs border-r-2 border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
              {hasProcessColumns && (
                <>
                  <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                  <td className="px-1 py-1 border-r border-zinc-200 dark:border-zinc-800 align-middle" style={{ height: '24px' }}></td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
