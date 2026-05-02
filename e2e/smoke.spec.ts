import { test, expect } from '@playwright/test';

test.describe('QMS SaaS Pro — Smoke Tests', () => {
  // ---------------------------------------------------------------------------
  // Homepage loads
  // ---------------------------------------------------------------------------
  test('homepage loads with QMS branding', async ({ page }) => {
    await page.goto('/');

    // Verify the sidebar shows the QMS SaaS Pro brand name
    await expect(page.getByText('QMS SaaS Pro')).toBeVisible();

    // Verify the app shell renders — the header should show the active section
    // (defaults to "dashboard" on first load)
    await expect(
      page.getByRole('heading', { name: /dashboard/i })
    ).toBeVisible();

    // The page should not show any error states
    await expect(page.getByText(/error|not found|500/i)).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Navigation works — sidebar shows modules
  // ---------------------------------------------------------------------------
  test('sidebar navigation displays all core modules', async ({ page }) => {
    await page.goto('/');

    // Core navigation items that are always visible (from isItemVisible logic)
    const coreModules = [
      'Dashboard',
      'Documents',
      'NCR',
      'CAPA',
      'Audits',
      'Training',
    ];

    for (const moduleName of coreModules) {
      await expect(
        page.getByRole('button', { name: new RegExp(moduleName, 'i') })
      ).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // Dashboard view — shows stats and KPIs
  // ---------------------------------------------------------------------------
  test('dashboard view displays KPI cards and stats', async ({ page }) => {
    await page.goto('/');

    // The dashboard is the default view; verify key dashboard elements
    // The dashboard shows a welcome message and quality dashboard label
    await expect(page.getByText(/quality dashboard/i)).toBeVisible();

    // KPI card titles that should appear on the dashboard
    const kpiLabels = [
      /open capas/i,
      /documents/i,
      /training/i,
    ];

    for (const label of kpiLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }

    // Compliance score section
    await expect(page.getByText(/compliance score/i)).toBeVisible();

    // Quick actions section
    await expect(page.getByText(/quick actions/i)).toBeVisible();

    // Recent activity section
    await expect(page.getByText(/recent activity/i)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Document module — navigate and verify document list
  // ---------------------------------------------------------------------------
  test('document module loads and displays document list', async ({ page }) => {
    await page.goto('/');

    // Click the Documents navigation item in the sidebar
    await page.getByRole('button', { name: /documents/i }).first().click();

    // Verify the Document Control heading appears (from DocumentControlView)
    await expect(
      page.getByRole('heading', { name: /document control/i })
    ).toBeVisible();

    // The document list should render inside a table
    // Verify table headers that DocumentControlView renders
    await expect(page.getByRole('columnheader', { name: /doc number/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();

    // Summary cards should show document counts
    await expect(page.getByText(/total/i)).toBeVisible();
    await expect(page.getByText(/approved/i)).toBeVisible();

    // At least one document row should be present (mock data)
    // Header row + at least one data row = minimum 2 rows
    const rowCount = await page.getByRole('row').count();
    expect(rowCount).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------------------------
  // CAPA module — navigate and verify CAPA list
  // ---------------------------------------------------------------------------
  test('CAPA module loads and displays CAPA list', async ({ page }) => {
    await page.goto('/');

    // Click the CAPA navigation item in the sidebar
    await page.getByRole('button', { name: /capa/i }).click();

    // Verify the CAPA Management heading appears (from CapaView)
    await expect(
      page.getByRole('heading', { name: /capa management/i })
    ).toBeVisible();

    // Verify CAPA table headers
    await expect(page.getByRole('columnheader', { name: /capa #/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /priority/i })).toBeVisible();

    // Summary cards for CAPA statuses
    await expect(page.getByText(/open/i)).toBeVisible();
    await expect(page.getByText(/closed/i)).toBeVisible();

    // The "New CAPA" button should be visible (user has capa.create permission in demo)
    await expect(page.getByRole('button', { name: /new capa/i })).toBeVisible();

    // At least one CAPA row should be present (mock data)
    const rowCount = await page.getByRole('row').count();
    expect(rowCount).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------------------------
  // NCR module — navigate and verify NCR list
  // ---------------------------------------------------------------------------
  test('NCR module loads and displays NCR list', async ({ page }) => {
    await page.goto('/');

    // Click the NCR navigation item in the sidebar
    await page.getByRole('button', { name: /ncr/i }).click();

    // Verify the Non-Conformances heading appears (from NcrView)
    await expect(
      page.getByRole('heading', { name: /non-conformances/i })
    ).toBeVisible();

    // Verify NCR table headers
    await expect(page.getByRole('columnheader', { name: /ncr #/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /title/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /severity/i })).toBeVisible();

    // Summary cards for NCR statuses
    await expect(page.getByText(/open/i)).toBeVisible();
    await expect(page.getByText(/closed/i)).toBeVisible();

    // The "New NCR" button should be visible (user has ncr.create permission in demo)
    await expect(page.getByRole('button', { name: /new ncr/i })).toBeVisible();

    // At least one NCR row should be present (mock data)
    const rowCount = await page.getByRole('row').count();
    expect(rowCount).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------------------------
  // Cross-module navigation — switching between modules updates the view
  // ---------------------------------------------------------------------------
  test('switching between modules updates the view correctly', async ({ page }) => {
    await page.goto('/');

    // Start on dashboard (default)
    await expect(page.getByText(/quality dashboard/i)).toBeVisible();

    // Navigate to CAPA
    await page.getByRole('button', { name: /capa/i }).click();
    await expect(page.getByRole('heading', { name: /capa management/i })).toBeVisible();

    // Navigate to NCR
    await page.getByRole('button', { name: /ncr/i }).click();
    await expect(page.getByRole('heading', { name: /non-conformances/i })).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole('button', { name: /dashboard/i }).click();
    await expect(page.getByText(/quality dashboard/i)).toBeVisible();
  });
});
