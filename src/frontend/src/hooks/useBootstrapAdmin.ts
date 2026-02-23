/**
 * No-op hook (admin bootstrapping removed).
 */
export function useBootstrapAdmin() {
  return {
    bootstrapAdmin: () => {},
    isBootstrapping: false,
    isSuccess: true,
    isError: false,
    error: null,
    data: { success: true },
    retry: () => {},
  };
}
