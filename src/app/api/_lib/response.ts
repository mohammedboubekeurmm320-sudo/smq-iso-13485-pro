// API response helpers for consistent JSON responses

import { NextResponse } from 'next/server';

export function apiSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  const body: Record<string, unknown> = { success: false, error: message };
  if (details !== undefined) {
    body.details = details;
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
