import { test, expect } from '@playwright/test';
import type { E2EWindow } from './types';

test.describe('Layout Obscurity', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true);
	});

	test('Inspector should not be obscured by navigation bar', async ({ page }) => {
		// 1. Select a system to show the Inspector
		// Wait for the map to be ready
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eClusterReady === true);

		// Click on a system node in the StarMap
		// We'll use a known system from the cluster or just click somewhere likely to have a system
		// The cluster data is available in window.stores.cluster
		const system = await page.evaluate(() => {
			const win = window as unknown as E2EWindow;
			const cluster = win.stores.cluster;
			if (!cluster) throw new Error('Cluster store not found');
			let value: unknown = null;
			cluster.subscribe((v) => (value = v))();
			return (value as { Systems: Array<unknown> }).Systems[0];
		});

		// We can select it directly via store to show inspector
		await page.evaluate((sys) => {
			(window as unknown as E2EWindow).stores.selectedEntity.set(sys);
		}, system);

		// Wait for Inspector to appear
		const inspector = page.locator('[role="dialog"][aria-labelledby="inspector-title"]');
		await expect(inspector).toBeVisible();

		// 2. Check overlap
		const navBar = page.locator('nav[aria-label="Primary"]');
		const navBox = await navBar.boundingBox();
		const inspectorBox = await inspector.boundingBox();

		if (!navBox || !inspectorBox) throw new Error('Could not get bounding boxes');

		// Check if the top of the inspector is above the bottom of the nav bar
		const isObscured = inspectorBox.y < navBox.y + navBox.height;

		expect(isObscured, 'Inspector is obscured by navigation bar').toBe(false);
	});

	test('Solar System controls should not be obscured by navigation bar', async ({ page }) => {
		// 1. Navigate to a system
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eClusterReady === true);

		const system = await page.evaluate(() => {
			const win = window as unknown as E2EWindow;
			const cluster = win.stores.cluster;
			if (!cluster) throw new Error('Cluster store not found');
			let value: unknown = null;
			cluster.subscribe((v) => (value = v))();
			return (value as { Systems: Array<{ Id: string }> }).Systems[0];
		});

		await page.evaluate((sysId) => {
			(window as unknown as E2EWindow).stores.activeSystemId.set(sysId);
			(window as unknown as E2EWindow).stores.viewMode.set('system');
		}, system.Id);

		// Wait for Solar System view to be ready
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eSystemReady === true);

		// 2. Locate the controls
		// In SolarSystemMap.svelte: <div class="absolute top-4 left-4 flex gap-2">
		// We should add a test id to it, but for now we can find it by its content
		const backButton = page.locator('button', { hasText: 'Back to Cluster' });
		await expect(backButton).toBeVisible();

		const navBar = page.locator('nav[aria-label="Primary"]');
		const navBox = await navBar.boundingBox();
		const buttonBox = await backButton.boundingBox();

		if (!navBox || !buttonBox) throw new Error('Could not get bounding boxes');

		// Check if the top of the button is above the bottom of the nav bar
		const isObscured = buttonBox.y < navBox.y + navBox.height;

		expect(isObscured, 'Solar System controls are obscured by navigation bar').toBe(false);
	});
});
