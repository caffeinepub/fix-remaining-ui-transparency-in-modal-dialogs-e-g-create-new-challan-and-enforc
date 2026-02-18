import { useQueryClient } from '@tanstack/react-query';

/**
 * Helper hook that derives a serializable "version" for a given base queryKey
 * by using React Query cache metadata (dataUpdatedAt) instead of including
 * BigInt-containing datasets directly in queryKeys.
 * 
 * This prevents "Do not know how to serialize a BigInt" errors while still
 * ensuring derived queries recompute when underlying data changes.
 */
export function useQueryDataVersion(queryKey: unknown[]): string {
  const queryClient = useQueryClient();
  
  // Get the query state from the cache
  const queryState = queryClient.getQueryState(queryKey);
  
  // Return a serializable version string based on dataUpdatedAt timestamp
  // If no data exists yet, return a default version
  if (!queryState || !queryState.dataUpdatedAt) {
    return 'v0';
  }
  
  return `v${queryState.dataUpdatedAt}`;
}
