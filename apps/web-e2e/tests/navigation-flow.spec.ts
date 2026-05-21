import { expect, test } from '@playwright/test';

test.describe('Navigation Flow', () => {
	test.beforeAll(async ({ page }) => {
		await page.goto('/');
		await page.waitForFunction(() => (window as any).e2eReady === true, {
			timeout: 20_000
		});
		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('searches for a system and navigates to it', async ({ page }) => {
		const nav = page.locator('nav');
		await expect(nav).toBeVisible();

		const searchInput = page.getByPlaceholder('Search systems...');
		await searchInput.click();
		await searchInput.fill('Alpha');

		const result = page.locator('button:has-text("Alpha Centauri")');
		await expect(result).toBeVisible();
		await result.click();

		const solarMap = page.locator('[data-testid="solar-system-map"]');
		await expect(solarMap).toBeVisible({ timeout: 20_000 });

		await page.waitForFunction(() => (window as any).e2eSystemReady === true, {
			timeout: 20_000
		});

		const breadcrumbs = await nav.textContent();
		expect(breadcrumbs ?? '').toContain('Alpha Centauri');
	});

	test('navigates back to cluster using back button', async ({ page }) => {
		const backButton = page.locator('button[aria-label="Go back"]');
		await backButton.click();

		const starMap = page.locator('[data-testid="star-map"]');
		await expect(starMap).toBeVisible();

		const viewMode = await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const w: any = window;
			let val: string | undefined;
			w.stores.viewMode.subscribe((v: string) => (val = v))();
			return val;
		});
		expect(viewMode).toBe('cluster');
	});

	test('opens and closes help overlay', async ({ page }) => {
		await page.keyboard.press('?');

		const helpTitle = page.locator('#help-title');
		await expect(helpTitle).toBeVisible();
		await expect(helpTitle).toHaveText('Keyboard Shortcuts');

		await page.keyboard.press('Escape');
		await expect(helpTitle).toBeHidden();
	});

	test('uses Inspector keyboard shortcuts', async ({ page }) => {
		// Wait for cluster data to be loaded
		await page.waitForFunction(
			() => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const w: any = window;
					const snap =
						typeof w.getClusterSnapshot === 'function'
							? w.getClusterSnapshot()
							: (() => {
									let v: any;
									w.stores?.cluster?.subscribe((x: any) => (v = x))?.();
									return v;
								})();
					return !!snap && Array.isArray(snap.Systems) && snap.Systems.length > 0;
				} catch {
					return false;
				}
			},
			{ timeout: 10_000 }
		);

		// Select a system from cluster to open inspector
		await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const w: any = window;
			const data =
				typeof w.getClusterSnapshot === 'function'
					? w.getClusterSnapshot()
					: (() => {
							let v: any;
							w.stores.cluster.subscribe((x: any) => (v = x))();
							return v;
						})();
			w.stores.selectedEntity.set(data.Systems[0]);
		});

		const inspector = page.locator('[role="dialog"]');
		await expect(inspector).toBeVisible();

		const nameInput = inspector.locator('#name');
		await nameInput.fill('Renamed System');

		// Save with Enter
		await page.keyboard.press('Enter');
		await expect(inspector).toBeHidden();

		const systemName = await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const w: any = window;
			let data: any;
			w.stores.cluster.subscribe((v: any) => (data = v))();
			return data.Systems[0].Name;
		});
		expect(systemName).toBe('Renamed System');
	});
});
