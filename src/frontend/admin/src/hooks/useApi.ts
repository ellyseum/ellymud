import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResponse } from '../types';

interface UseApiOptions<T> {
  initialData?: T;
  autoFetch?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetchFn: () => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, autoFetch = true } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFn();
      if (mountedRef.current) {
        if (response.success) {
          setData(response as unknown as T);
        } else {
          setError(response.message || 'Failed to fetch data');
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
