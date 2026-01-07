/**
 * Unit tests for usePolling and useInterval React hooks
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { usePolling, useInterval } from './usePolling';
import { act } from '@testing-library/react';

describe('usePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should call callback immediately on mount', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => usePolling(callback));

    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('should call callback at default interval (5000ms)', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => usePolling(callback));

    expect(callback).toHaveBeenCalledTimes(1); // Initial call

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('should call callback at custom interval', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => usePolling(callback, { interval: 2000 }));

    expect(callback).toHaveBeenCalledTimes(1); // Initial call

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('should not call callback when enabled is false', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => usePolling(callback, { enabled: false }));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).not.toHaveBeenCalled();

    unmount();
  });

  it('should stop polling when enabled changes to false', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ enabled }) => usePolling(callback, { enabled }), {
      initialProps: { enabled: true },
    });

    expect(callback).toHaveBeenCalledTimes(1); // Initial call

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(2);

    // Disable polling
    act(() => {
      rerender({ enabled: false });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(2); // No additional calls

    unmount();
  });

  it('should start polling when enabled changes to true', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ enabled }) => usePolling(callback, { enabled }), {
      initialProps: { enabled: false },
    });

    expect(callback).not.toHaveBeenCalled();

    // Enable polling
    act(() => {
      rerender({ enabled: true });
    });

    expect(callback).toHaveBeenCalledTimes(1); // Initial call

    unmount();
  });

  it('should use latest callback after update', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { rerender, unmount } = renderHook(({ cb }) => usePolling(cb), {
      initialProps: { cb: callback1 },
    });

    expect(callback1).toHaveBeenCalledTimes(1);

    // Update callback
    act(() => {
      rerender({ cb: callback2 });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(callback1).toHaveBeenCalledTimes(1); // Not called again
    expect(callback2).toHaveBeenCalledTimes(1); // New callback used

    unmount();
  });

  it('should reset interval when interval option changes', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ interval }) => usePolling(callback, { interval }), {
      initialProps: { interval: 5000 },
    });

    expect(callback).toHaveBeenCalledTimes(1); // Initial call

    // Change interval to 2000ms
    act(() => {
      rerender({ interval: 2000 });
    });
    expect(callback).toHaveBeenCalledTimes(2); // Immediate call on interval change

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(3);

    unmount();
  });

  it('should cleanup interval on unmount', () => {
    const callback = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => usePolling(callback));

    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1); // No more calls after unmount

    clearIntervalSpy.mockRestore();
  });

  it('should handle async callbacks', async () => {
    const callback = jest.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() => usePolling(callback));

    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('should handle callbacks that return values', () => {
    const callback = jest.fn().mockReturnValue('result');

    const { unmount } = renderHook(() => usePolling(callback));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveReturnedWith('result');

    unmount();
  });
});

describe('useInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should NOT call callback immediately on mount', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => useInterval(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    unmount();
  });

  it('should call callback at specified interval', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => useInterval(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('should not set interval when delay is null', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => useInterval(callback, null));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).not.toHaveBeenCalled();

    unmount();
  });

  it('should pause interval when delay changes to null', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 1000 as number | null },
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Pause by setting delay to null
    act(() => {
      rerender({ delay: null });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1); // No additional calls

    unmount();
  });

  it('should resume interval when delay changes from null to number', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: null as number | null },
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).not.toHaveBeenCalled();

    // Resume by setting delay to a number
    act(() => {
      rerender({ delay: 1000 });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('should use latest callback after update', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const { rerender, unmount } = renderHook(({ cb }) => useInterval(cb, 1000), {
      initialProps: { cb: callback1 },
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback1).toHaveBeenCalledTimes(1);

    // Update callback
    act(() => {
      rerender({ cb: callback2 });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(callback1).toHaveBeenCalledTimes(1); // Not called again
    expect(callback2).toHaveBeenCalledTimes(1); // New callback used

    unmount();
  });

  it('should reset interval when delay changes', () => {
    const callback = jest.fn();

    const { rerender, unmount } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 2000 as number | null },
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Change delay to 1000ms
    act(() => {
      rerender({ delay: 1000 });
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('should cleanup interval on unmount', () => {
    const callback = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useInterval(callback, 1000));

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1); // No more calls after unmount

    clearIntervalSpy.mockRestore();
  });

  it('should handle zero delay', () => {
    const callback = jest.fn();

    const { unmount } = renderHook(() => useInterval(callback, 0));

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
  });
});
