import { DollarSign } from 'lucide-react';

export default function UnitRatePage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-400">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <DollarSign className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
      </div>
      <p className="text-sm">단가 입력 기능은 준비 중입니다.</p>
    </div>
  );
}
