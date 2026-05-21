import { expect, test } from '@playwright/test';

test.describe('App Responsiveness', () => {
    test('loads the cluster within a reasonable time', async ({ page }) => {
		const startTime = Date.now();
		await page.goto('/');

		await page.waitForFunction(() => (window as any).e2eReady === true, {
			timeout: 20_000
		});

		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });

		const starMap = page.locator('[data-testid="star-map"]');
		await expect(starMap).toBeVisible({ timeout: 20_000 });

		const loadTime = Date.now() - startTime;
		// eslint-disable-next-line no-console
		console.log(`Cluster load time: ${loadTime}ms`);
	});

 test('transitions to solar system view quickly', async ({ page }) => {
        // Fresh page per test: navigate and wait for readiness
        await page.goto('/');
        await page.waitForFunction(() => (window as any).e2eReady === true, {
            timeout: 20_000
        });
        const loadingScreen = page.locator('[data-testid="loading-screen"]');
        await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });

        const starMap = page.locator('[data-testid="star-map"]');
        await expect(starMap).toBeVisible({ timeout: 20_000 });

		// Check if there are systems to transition to; skip test gracefully if not
		const hasSystems = await page.evaluate(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const w: any = window;
			try {
				const data =
					typeof w.getClusterSnapshot === 'function'
						? w.getClusterSnapshot()
						: (() => {
							let v: any;
							w.stores?.cluster?.subscribe((x: any) => (v = x))?.();
							return v;
						})();
				return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
			} catch {
				return false;
			}
		});
		if (!hasSystems) {
			test.skip(true, 'No systems available to transition to');
		}

		const targetSystemId = await page.evaluate(() => {
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
			return data.Systems[0].Id as string;
		});

		const startTime = Date.now();

		await page.evaluate((id) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const w: any = window;
			const { activeSystemId, viewMode } = w.stores;
			activeSystemId.set(id);
			viewMode.set('system');
		}, targetSystemId);

  const solarSystemMap = page.locator('[data-testid="solar-system-map"]');
  await expect(solarSystemMap).toBeVisible({ timeout: 20_000 });

		const transitionTime = Date.now() - startTime;
		// eslint-disable-next-line no-console
		console.log(`Transition time: ${transitionTime}ms`);
	});
});
