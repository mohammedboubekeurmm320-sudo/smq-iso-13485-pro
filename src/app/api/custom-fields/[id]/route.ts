import { NextRequest } from 'next/server';
import { getDemoStore } from '../../_lib/demo-data';
import { apiSuccess, apiError } from '../../_lib/response';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const def = store.customFieldDefinitions.find(d => d.id === id);
    if (!def) return apiError('Custom field definition not found', 404);
    return apiSuccess(def);
  } catch (error) {
    return apiError('Failed to fetch custom field definition', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.customFieldDefinitions.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Custom field definition not found', 404);

    const body = await request.json();
    const old = store.customFieldDefinitions[idx];

    // If name is being changed, check for duplicates
    if (body.name && body.name !== old.name) {
      const duplicate = store.customFieldDefinitions.find(d => d.name === body.name && d.id !== id);
      if (duplicate) {
        return apiError(`A custom field with name "${body.name}" already exists`, 409);
      }
    }

    const updated = {
      ...old,
      ...body,
      id: old.id,
      createdAt: old.createdAt,
      updatedAt: new Date().toISOString(),
    } as import('@/types/qms').CustomFieldDefinition;

    store.customFieldDefinitions[idx] = updated;
    store.logAudit('UPDATE', 'CustomFieldDefinition', id, { name: old.name, label: old.label }, body);

    return apiSuccess(updated);
  } catch (error) {
    return apiError('Failed to update custom field definition', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const store = getDemoStore();
    const idx = store.customFieldDefinitions.findIndex(d => d.id === id);
    if (idx === -1) return apiError('Custom field definition not found', 404);

    const old = store.customFieldDefinitions[idx];
    store.customFieldDefinitions.splice(idx, 1);
    store.logAudit('DELETE', 'CustomFieldDefinition', id, { name: old.name, label: old.label });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError('Failed to delete custom field definition', 500, error instanceof Error ? error.message : undefined);
  }
}
