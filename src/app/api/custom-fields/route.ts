import { NextRequest } from 'next/server';
import { getDemoStore } from '../_lib/demo-data';
import { apiSuccess, apiError } from '../_lib/response';

export async function GET(request: NextRequest) {
  try {
    const store = getDemoStore();
    const { searchParams } = new URL(request.url);
    const applicableTo = searchParams.get('applicableTo');

    let definitions = [...store.customFieldDefinitions];

    if (applicableTo) {
      definitions = definitions.filter(
        d => d.applicableTo.includes('*') || d.applicableTo.includes(applicableTo)
      );
    }

    // Sort by sortOrder
    definitions.sort((a, b) => a.sortOrder - b.sortOrder);

    return apiSuccess(definitions);
  } catch (error) {
    return apiError('Failed to fetch custom field definitions', 500, error instanceof Error ? error.message : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getDemoStore();
    const body = await request.json();

    const { name, label, type, required, options, placeholder, defaultValue, applicableTo, organizationId } = body as {
      name: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
      placeholder?: string;
      defaultValue?: string;
      applicableTo?: string[];
      organizationId?: string;
    };

    if (!name || !label || !type) {
      return apiError('name, label, and type are required', 400);
    }

    const validTypes = ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'url'];
    if (!validTypes.includes(type)) {
      return apiError(`Invalid type. Valid types: ${validTypes.join(', ')}`, 400);
    }

    // Check for duplicate name
    const existing = store.customFieldDefinitions.find(d => d.name === name);
    if (existing) {
      return apiError(`A custom field with name "${name}" already exists`, 409);
    }

    const now = new Date().toISOString();
    const maxSortOrder = store.customFieldDefinitions.length > 0
      ? Math.max(...store.customFieldDefinitions.map(d => d.sortOrder))
      : -1;

    const definition = {
      id: `cfd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      label: label.trim(),
      type: type as import('@/types/qms').CustomFieldType,
      required: required ?? false,
      options: type === 'select' ? options : undefined,
      placeholder: placeholder || undefined,
      defaultValue: defaultValue || undefined,
      applicableTo: applicableTo && applicableTo.length > 0 ? applicableTo : ['*'],
      organizationId: organizationId || 'org-001',
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    } as import('@/types/qms').CustomFieldDefinition;

    store.customFieldDefinitions.push(definition);
    store.logAudit('CREATE', 'CustomFieldDefinition', definition.id, undefined, { name: definition.name, label: definition.label, type: definition.type });

    return apiSuccess(definition, 201);
  } catch (error) {
    return apiError('Failed to create custom field definition', 500, error instanceof Error ? error.message : undefined);
  }
}
