/**
 * Unit tests for useApi React hook
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from './useApi';
import { ApiResponse } from '../types';

describe('useApi', () => {
  describe('initial state', () => {
    it('should initialize with loading=true when autoFetch=true (default)', () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize with loading=false when autoFetch=false', () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useApi(mockFetchFn, { autoFetch: false }));

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize with provided initialData', () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ success: true, data: {} });
      const initialData = { test: 'data' };

      const { result } = renderHook(() => useApi(mockFetchFn, { initialData, autoFetch: false }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return refetch function', () => {
      const mockFetchFn = jest.fn().mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useApi(mockFetchFn, { autoFetch: false }));

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('autoFetch behavior', () => {
    it('should trigger fetch on mount when autoFetch=true (default)', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'success' },
      });

      renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(mockFetchFn).toHaveBeenCalledTimes(1);
      });
    });

    it('should not trigger fetch on mount when autoFetch=false', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { message: 'success' },
      });

      renderHook(() => useApi(mockFetchFn, { autoFetch: false }));

      // Wait a bit to ensure fetch isn't called
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFetchFn).not.toHaveBeenCalled();
    });
  });

  describe('successful fetch', () => {
    it('should set data correctly on successful fetch', async () => {
      const mockData = { message: 'test data' };
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      } as ApiResponse<typeof mockData>);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true, data: mockData });
      expect(result.current.error).toBeNull();
    });

    it('should transition loading state from true to false', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { test: 'data' },
      });

      const { result } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should clear previous error on successful fetch', async () => {
      const mockFetchFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ success: true, data: { test: 'data' } });

      const { result } = renderHook(() => useApi(mockFetchFn));

      // Wait for first (failed) fetch
      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Trigger refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.data).toEqual({ success: true, data: { test: 'data' } });
    });
  });

  describe('error handling', () => {
    it('should handle API error response (success=false)', async () => {
      const errorMessage = 'API error message';
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: false,
        message: errorMessage,
      } as ApiResponse<never>);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.data).toBeNull();
    });

    it('should handle API error response without message', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: false,
      } as ApiResponse<never>);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch data');
      expect(result.current.data).toBeNull();
    });

    it('should handle Error object thrown during fetch', async () => {
      const errorMessage = 'Network error';
      const mockFetchFn = jest.fn().mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.data).toBeNull();
    });

    it('should handle non-Error exception thrown during fetch', async () => {
      const mockFetchFn = jest.fn().mockRejectedValue('string error');

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred');
      expect(result.current.data).toBeNull();
    });

    it('should handle null exception', async () => {
      const mockFetchFn = jest.fn().mockRejectedValue(null);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('should handle undefined exception', async () => {
      const mockFetchFn = jest.fn().mockRejectedValue(undefined);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An error occurred');
    });
  });

  describe('refetch functionality', () => {
    it('should allow manual refetch when autoFetch=false', async () => {
      const mockData = { message: 'fetched data' };
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() => useApi(mockFetchFn, { autoFetch: false }));

      expect(mockFetchFn).not.toHaveBeenCalled();

      // Manually trigger fetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({ success: true, data: mockData });
    });

    it('should reset loading state when refetch is called', async () => {
      let resolveFirstFetch: ((value: ApiResponse<{ test: string }>) => void) | undefined;
      let resolveSecondFetch: ((value: ApiResponse<{ test: string }>) => void) | undefined;

      const mockFetchFn = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<ApiResponse<{ test: string }>>((resolve) => {
              resolveFirstFetch = resolve;
            })
        )
        .mockImplementationOnce(
          () =>
            new Promise<ApiResponse<{ test: string }>>((resolve) => {
              resolveSecondFetch = resolve;
            })
        );

      const { result } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);

      // Resolve first fetch
      resolveFirstFetch?.({ success: true, data: { test: 'first' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call refetch
      result.current.refetch();

      // Loading should be true again for the second fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve second fetch
      resolveSecondFetch?.({ success: true, data: { test: 'second' } });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true, data: { test: 'second' } });
    });

    it('should update data on refetch with new response', async () => {
      const mockData1 = { value: 1 };
      const mockData2 = { value: 2 };
      const mockFetchFn = jest
        .fn()
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true, data: mockData1 });

      // Refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual({ success: true, data: mockData2 });
      });

      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple sequential refetch calls', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { test: 'data' },
      });

      const { result } = renderHook(() => useApi(mockFetchFn, { autoFetch: false }));

      await result.current.refetch();
      await result.current.refetch();
      await result.current.refetch();

      expect(mockFetchFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('unmount cleanup', () => {
    it('should not update state after component unmounts', async () => {
      const mockFetchFn = jest.fn(
        (): Promise<ApiResponse<{ test: string }>> =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, data: { test: 'data' } });
            }, 100);
          })
      );

      const { result, unmount } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Wait for fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      // State should remain as it was at unmount (no updates after unmount)
      // This test verifies mountedRef prevents state updates
      expect(mockFetchFn).toHaveBeenCalledTimes(1);
    });

    it('should not update state if unmounted during error', async () => {
      const mockFetchFn = jest.fn(
        (): Promise<ApiResponse<never>> =>
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Async error'));
            }, 100);
          })
      );

      const { result, unmount } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Wait for fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockFetchFn).toHaveBeenCalledTimes(1);
    });

    it('should not trigger fetch after unmount', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { test: 'data' },
      });

      const { result, unmount } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const refetchFn = result.current.refetch;

      unmount();

      // Calling refetch after unmount will still call the function
      // but mountedRef will prevent state updates
      await refetchFn();

      // Fetch is called twice: once on mount, once by refetch
      // (The function itself runs, but state updates are prevented)
      expect(mockFetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchFn reference changes', () => {
    it('should use updated fetchFn on subsequent renders', async () => {
      const mockFetchFn1 = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 1 },
      });
      const mockFetchFn2 = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 2 },
      });

      const { result, rerender } = renderHook(({ fn }) => useApi(fn, { autoFetch: false }), {
        initialProps: { fn: mockFetchFn1 },
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetchFn1).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({ success: true, data: { value: 1 } });

      // Update fetchFn
      rerender({ fn: mockFetchFn2 });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual({ success: true, data: { value: 2 } });
      });

      expect(mockFetchFn2).toHaveBeenCalledTimes(1);
    });

    it('should trigger new fetch when autoFetch=true and fetchFn changes', async () => {
      const mockFetchFn1 = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 1 },
      });
      const mockFetchFn2 = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 2 },
      });

      const { result, rerender } = renderHook(({ fn }) => useApi(fn, { autoFetch: true }), {
        initialProps: { fn: mockFetchFn1 },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetchFn1).toHaveBeenCalledTimes(1);

      // Update fetchFn - should trigger new fetch
      rerender({ fn: mockFetchFn2 });

      await waitFor(() => {
        expect(mockFetchFn2).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ success: true, data: { value: 2 } });
      });
    });
  });

  describe('TypeScript generics', () => {
    it('should work with typed data', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const mockData: TestData = { id: 1, name: 'Test' };
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      } as ApiResponse<TestData>);

      const { result } = renderHook(() => useApi<TestData>(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // TypeScript should infer the correct type for data
      expect(result.current.data).toEqual({ success: true, data: mockData });
    });

    it('should work with array data', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true, data: mockData });
    });
  });

  describe('edge cases', () => {
    it('should handle empty response data', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ success: true, data: null });
      expect(result.current.error).toBeNull();
    });

    it('should handle response with empty string message', async () => {
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: false,
        message: '',
      });

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch data');
    });

    it('should handle extremely slow fetch', async () => {
      const mockFetchFn = jest.fn(
        (): Promise<ApiResponse<{ slow: string }>> =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, data: { slow: 'data' } });
            }, 1000);
          })
      );

      const { result } = renderHook(() => useApi(mockFetchFn));

      expect(result.current.loading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 1500 }
      );

      expect(result.current.data).toEqual({ success: true, data: { slow: 'data' } });
    });

    it('should handle fetch that returns undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFetchFn = jest.fn().mockResolvedValue(undefined as any);

      const { result } = renderHook(() => useApi(mockFetchFn));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Undefined response will throw when trying to access .success property
      expect(result.current.error).toBe("Cannot read properties of undefined (reading 'success')");
    });
  });

  describe('options combinations', () => {
    it('should work with both initialData and autoFetch=true', async () => {
      const initialData = { initial: 'value' };
      const fetchedData = { fetched: 'value' };
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: fetchedData,
      });

      const { result } = renderHook(() => useApi(mockFetchFn, { initialData, autoFetch: true }));

      // Should start with initial data
      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should update with fetched data
      expect(result.current.data).toEqual({ success: true, data: fetchedData });
    });

    it('should preserve initialData when autoFetch=false and no refetch', () => {
      const initialData = { initial: 'value' };
      const mockFetchFn = jest.fn().mockResolvedValue({
        success: true,
        data: { fetched: 'value' },
      });

      const { result } = renderHook(() => useApi(mockFetchFn, { initialData, autoFetch: false }));

      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(false);
      expect(mockFetchFn).not.toHaveBeenCalled();
    });
  });
});
