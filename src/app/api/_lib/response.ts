// API response helpers for consistent JSON responses
// P1 Fix: Never expose internal error details in production

import { NextResponse } from 'next/server';

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };

  // P1 Security: In production, never expose internal error details to clients.
  // Log them server-side only. This prevents leaking SQL errors, stack traces,
  // table names, file paths, or other internal information.
  if (details !== undefined) {
    if (process.env.NODE_ENV === 'production') {
      // Log the actual error for server-side debugging only
      console.error('[API Error]', message, details);
    } else {
      // Development: include details for debugging
      body.details = details;
    }
  }

  return NextResponse.json(body, { status });
}

export function apiPaginated(
  data: unknown[],
  total: number,
  page: number,
  pageSize: number,
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}