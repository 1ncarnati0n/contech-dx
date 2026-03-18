'use client';

import { useEffect, useId, useRef } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { logger } from '@/shared/utils/logger';

type RealtimeEvent = '*' | 'INSERT' | 'UPDATE' | 'DELETE';

interface UseRealtimeCacheSyncOptions {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInvalidate?: () => void;
  enabled?: boolean;
}

/**
 * Supabase Realtime 이벤트에 따라 UI 상태를 동기화합니다.
 */
export function useRealtimeCacheSync({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInvalidate,
  enabled = true,
}: UseRealtimeCacheSyncOptions): void {
  const instanceId = useId();
  const channelId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '');
  const onInvalidateRef = useRef(onInvalidate);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`${channelId}:${schema}:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          onInvalidateRef.current?.();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          logger.warn(`[realtime-sync] channel error for ${schema}.${table}`);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, table, schema, event, filter, channelId]);
}
