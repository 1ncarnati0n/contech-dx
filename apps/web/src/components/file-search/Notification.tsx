'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

interface NotificationProps {
  error: string;
  success: string;
  onClose: () => void;
}

export default function Notification({
  error,
  success,
  onClose,
}: NotificationProps) {
  if (!error && !success) return null;

  const isError = !!error;
  const message = error || success;

  return (
    <div className="fixed bottom-20 right-6 z-40 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Card
        className={`shadow-lg border ${isError
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
      >
        <CardContent className="p-3 flex items-center gap-3">
          {isError ? (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          )}
          <p
            className={`text-sm ${isError ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
              }`}
          >
            {message}
          </p>
          <button
            onClick={onClose}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
