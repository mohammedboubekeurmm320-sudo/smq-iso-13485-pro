// src/__tests__/integration/types.ts
// ============================================================================
// Shared types for integration tests.
// ============================================================================

export interface FetchInterface {
  (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<{
    status: number;
    ok: boolean;
    json: () => Promise<unknown>;
    headers: {
      get(name: string): string | null;
    };
  }>;
}