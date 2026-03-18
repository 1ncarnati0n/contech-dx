import { Settings } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">준비 중인 기능입니다</h3>
      <p className="text-sm">해당 메뉴는 아직 개발 중입니다.</p>
    </div>
  );
}
