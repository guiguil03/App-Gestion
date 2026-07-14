'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type StreamStatus = 'connecting' | 'live' | 'offline';

const STREAM_EVENT_TYPES = ['attendance.recorded', 'absence.marked'] as const;

export function useDashboardStream(): StreamStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StreamStatus>('connecting');

  useEffect(() => {
    const source = new EventSource('/api/dashboard/stream');
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    source.onopen = () => setStatus('live');
    source.onerror = () => setStatus('offline');
    for (const eventType of STREAM_EVENT_TYPES) {
      source.addEventListener(eventType, invalidate);
    }

    return () => source.close();
  }, [queryClient]);

  return status;
}
