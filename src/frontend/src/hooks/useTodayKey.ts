import { useState, useEffect } from 'react';

/**
 * Hook that returns a stable per-day key (YYYY-MM-DD) and automatically
 * updates when the local calendar date changes (e.g., after midnight).
 * This is used to trigger date-aware React Query invalidation/recomputation.
 */
export function useTodayKey(): string {
  const getTodayString = () => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const [todayKey, setTodayKey] = useState(getTodayString);

  useEffect(() => {
    // Calculate milliseconds until next midnight
    const getMillisecondsUntilMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - now.getTime();
    };

    // Schedule update at next midnight
    const scheduleNextUpdate = () => {
      const msUntilMidnight = getMillisecondsUntilMidnight();
      
      return setTimeout(() => {
        setTodayKey(getTodayString());
        // Schedule the next update
        scheduleNextUpdate();
      }, msUntilMidnight);
    };

    const timeoutId = scheduleNextUpdate();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return todayKey;
}
