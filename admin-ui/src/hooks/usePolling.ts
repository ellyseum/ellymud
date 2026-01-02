import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
}

export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions = {}
): void {
  const { interval = 5000, enabled = true } = options;
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Initial call
    savedCallback.current();

    // Set up the interval
    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, interval);

    return () => clearInterval(id);
  }, [interval, enabled]);
}

export function useInterval(
  callback: () => void,
  delay: number | null
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
