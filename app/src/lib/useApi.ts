import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { ApiError } from './api';

interface State<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** يجلب البيانات عند فتح الشاشة وعند العودة إليها، مع سحب للتحديث. */
export function useApi<T>(fetcher: () => Promise<T>): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void run('initial');
    }, [run]),
  );

  return {
    data,
    error,
    loading,
    refreshing,
    reload: async () => {
      setLoading(true);
      await run('initial');
    },
    refresh: () => run('refresh'),
  };
}
