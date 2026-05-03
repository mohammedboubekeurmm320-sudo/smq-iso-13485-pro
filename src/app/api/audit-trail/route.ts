import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError, apiPaginated } from '../_lib/response';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const action = searchParams.get('action');
    const tableName = searchParams.get('tableName');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let filtered = [...store.auditTrails];

    if (action) filtered = filtered.filter(a => a.action === action);
    if (tableName) filtered = filtered.filter(a => a.tableName === tableName);
    if (userId) filtered = filtered.filter(a => a.userId === userId);
    if (startDate) filtered = filtered.filter(a => new Date(a.createdAt) >= new Date(startDate));
    if (endDate) filtered = filtered.filter(a => new Date(a.createdAt) <= new Date(endDate));

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return apiPaginated(filtered.slice(start, start + pageSize), total, page, pageSize);
  } catch (error) {
    return apiError('Failed to fetch audit trail', 500, error instanceof Error ? error.message : undefined);
  }
}
