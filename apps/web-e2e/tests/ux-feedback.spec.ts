import { expect, test } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow } from './types';

test.describe('UX feedback (toasts, undo, empty state)', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript((fixture) => {
			if (!localStorage.getItem('e2e_initialized')) {
				localStorage.clear();
				localStorage.setItem('e2e_initialized', 'true');
			}
			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());

		await page.goto('/');
		await page.waitForFunction(() => (window as E2EWindow).e2eReady === true, { timeout: 20_000 });
		await page
			.locator('[data-testid="loading-screen"]')
			.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('shows a success toast after saving in the Inspector', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			const snap = w.getClusterSnapshot!();
			w.stores.selectedEntity.set(snap.Systems[0]);
		});

		const inspector = page.locator('[role="dialog"]');
		await expect(inspector).toBeVisible();
		await inspector.locator('#name').fill('Renamed System');
		await inspector.getByRole('button', { name: /save changes/i }).click();

		await expect(page.getByText('Changes saved')).toBeVisible();
	});

	test('undo (Ctrl+Z) restores the previous cluster after regenerate', async ({ page }) => {
		const oldIds = await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			return w.getClusterSnapshot!().Systems.map((s) => s.Id);
		});

		await page.getByLabel('Generate New Cluster').click();
		await page.getByRole('button', { name: 'Generate', exact: true }).click();

		// Wait for the cluster to actually change.
		await page.waitForFunction(
			(old) => {
				const w = window as unknown as E2EWindow;
				const snap = w.getClusterSnapshot?.();
				if (!snap) return false;
				return JSON.stringify(snap.Systems.map((s) => s.Id)) !== JSON.stringify(old);
			},
			oldIds,
			{ timeout: 15_000 }
		);

		await page.keyboard.press('Control+z');

		await page.waitForFunction(
			(old) => {
				const w = window as unknown as E2EWindow;
				const snap = w.getClusterSnapshot?.();
				if (!snap) return false;
				return JSON.stringify(snap.Systems.map((s) => s.Id)) === JSON.stringify(old);
			},
			oldIds,
			{ timeout: 15_000 }
		);

		const restored = await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			return w.getClusterSnapshot!().Systems.map((s) => s.Id);
		});
		expect(restored).toEqual(oldIds);
	});

	test('an empty cluster shows the empty state and can generate', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			(w.stores.cluster as unknown as { set: (v: unknown) => void }).set({
				Name: 'Empty',
				Systems: []
			});
		});

		const empty = page.locator('[data-testid="empty-state"]');
		await expect(empty).toBeVisible();

		await empty.getByRole('button', { name: /generate a cluster/i }).click();

		await expect(empty).toBeHidden({ timeout: 15_000 });
	});
});
