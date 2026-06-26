import { describe, it, expect } from 'vitest';
import { apiSuccess, apiError, apiPaginated } from '@/app/api/_lib/response';

// ---------------------------------------------------------------------------
// apiSuccess
// ---------------------------------------------------------------------------
describe('apiSuccess', () => {
  it('returns Response with status 200 by default', async () => {
    const response = apiSuccess({ foo: 'bar' });
    expect(response.status).toBe(200);
  });

  it('returns Response with custom status 201', async () => {
    const response = apiSuccess({ id: 1 }, 201);
    expect(response.status).toBe(201);
  });

  it('returns Response with custom status 202', async () => {
    const response = apiSuccess({ accepted: true }, 202);
    expect(response.status).toBe(202);
  });

  it('response body has success: true and correct data (object)', async () => {
    const response = apiSuccess({ name: 'test', value: 42 });
    const body = await response.json();
    expect(body).toEqual({ success: true, data: { name: 'test', value: 42 } });
  });

  it('response body has success: true and correct data (array)', async () => {
    const data = [1, 2, 3];
    const response = apiSuccess(data);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('response body has success: true and correct data (primitive string)', async () => {
    const response = apiSuccess('hello');
    const body = await response.json();
    expect(body).toEqual({ success: true, data: 'hello' });
  });

  it('response body has success: true and correct data (primitive number)', async () => {
    const response = apiSuccess(99);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: 99 });
  });

  it('response body has success: true and correct data (primitive boolean)', async () => {
    const response = apiSuccess(false);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: false });
  });

  it('response body has success: true and correct data (null)', async () => {
    const response = apiSuccess(null);
    const body = await response.json();
    expect(body).toEqual({ success: true, data: null });
  });

  it('response body success field is strictly true', async () => {
    const response = apiSuccess('ok');
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// apiError
// ---------------------------------------------------------------------------
describe('apiError', () => {
  it('returns Response with status 400 by default', () => {
    const response = apiError('Bad Request');
    expect(response.status).toBe(400);
  });

  it('returns Response with custom status 401', () => {
    const response = apiError('Unauthorized', 401);
    expect(response.status).toBe(401);
  });

  it('returns Response with custom status 403', () => {
    const response = apiError('Forbidden', 403);
    expect(response.status).toBe(403);
  });

  it('returns Response with custom status 404', () => {
    const response = apiError('Not Found', 404);
    expect(response.status).toBe(404);
  });

  it('returns Response with custom status 500', () => {
    const response = apiError('Internal Server Error', 500);
    expect(response.status).toBe(500);
  });

  it('response body has success: false and correct error message', async () => {
    const response = apiError('Something went wrong');
    const body = await response.json();
    expect(body).toEqual({ success: false, error: 'Something went wrong' });
  });

  it('response body success field is strictly false', async () => {
    const response = apiError('fail');
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('includes details field when provided (object)', async () => {
    const details = { field: 'email', reason: 'invalid format' };
    const response = apiError('Validation failed', 422, details);
    const body = await response.json();
    expect(body).toEqual({
      success: false,
      error: 'Validation failed',
      details: { field: 'email', reason: 'invalid format' },
    });
  });

  it('includes details field when provided (array)', async () => {
    const details = ['field1 is required', 'field2 is invalid'];
    const response = apiError('Validation failed', 422, details);
    const body = await response.json();
    expect(body.details).toEqual(['field1 is required', 'field2 is invalid']);
  });

  it('includes details field when provided (string)', async () => {
    const response = apiError('Error', 500, 'Extra context');
    const body = await response.json();
    expect(body.details).toBe('Extra context');
  });

  it('does not include details field when not provided', async () => {
    const response = apiError('Error occurred');
    const body = await response.json();
    expect(body).not.toHaveProperty('details');
  });

  it('does not include details field when undefined is passed', async () => {
    const response = apiError('Error occurred', 400, undefined);
    const body = await response.json();
    expect(body).not.toHaveProperty('details');
  });
});

// ---------------------------------------------------------------------------
// apiPaginated
// ---------------------------------------------------------------------------
describe('apiPaginated', () => {
  it('returns correct pagination structure', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = apiPaginated(data, 10, 1, 5);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 5,
      total: 10,
      totalPages: 2,
    });
  });

  it('returns status 200 by default', () => {
    const response = apiPaginated([], 0, 1, 10);
    expect(response.status).toBe(200);
  });

  it('calculates totalPages correctly with Math.ceil (exact division)', async () => {
    // 20 total, 10 per page => 2 pages
    const response = apiPaginated([], 20, 1, 10);
    const body = await response.json();
    expect(body.pagination.totalPages).toBe(2);
  });

  it('calculates totalPages correctly with Math.ceil (fractional division)', async () => {
    // 21 total, 10 per page => ceil(21/10) = 3 pages
    const response = apiPaginated([], 21, 1, 10);
    const body = await response.json();
    expect(body.pagination.totalPages).toBe(3);
  });

  it('calculates totalPages correctly (1 item, 1 page size)', async () => {
    const response = apiPaginated([{ id: 1 }], 1, 1, 1);
    const body = await response.json();
    expect(body.pagination.totalPages).toBe(1);
  });

  it('works with empty data array', async () => {
    const response = apiPaginated([], 0, 1, 10);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('works with data array matching exactly one page', async () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const response = apiPaginated(data, 3, 1, 3);
    const body = await response.json();

    expect(body.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.pagination.total).toBe(3);
  });

  it('works with data requiring multiple pages', async () => {
    const data = [{ id: 1 }, { id: 2 }];
    const response = apiPaginated(data, 50, 1, 10);
    const body = await response.json();

    expect(body.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(body.pagination.totalPages).toBe(5);
    expect(body.pagination.total).toBe(50);
  });

  it('preserves page and pageSize in pagination object', async () => {
    const response = apiPaginated([], 100, 3, 25);
    const body = await response.json();

    expect(body.pagination.page).toBe(3);
    expect(body.pagination.pageSize).toBe(25);
    expect(body.pagination.total).toBe(100);
    expect(body.pagination.totalPages).toBe(4);
  });

  it('handles large total with small page size', async () => {
    const response = apiPaginated([], 1000, 1, 7);
    const body = await response.json();
    // ceil(1000 / 7) = ceil(142.857) = 143
    expect(body.pagination.totalPages).toBe(143);
  });
});
