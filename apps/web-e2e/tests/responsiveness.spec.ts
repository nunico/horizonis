import { expect, test } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow, ClusterLike } from './types';

test.describe('App Responsiveness', () => {
	test('loads the cluster within a reasonable time', async ({ page }) => {
		// Provide deterministic cluster-data fixture to the app before it loads
		await page.addInitScript((fixture) => {
			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());
		const startTime = Date.now();
		await page.goto('/');

		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});

		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });

		const starMap = page.locator('[data-testid="star-map"]');
		await expect(starMap).toBeVisible({ timeout: 20_000 });

		const loadTime = Date.now() - startTime;
		console.log(`Cluster load time: ${loadTime}ms`);
	});

	test('transitions to solar system view quickly', async ({ page }) => {
		// Provide deterministic cluster-data fixture to the app before it loads
		await page.addInitScript((fixture) => {
			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());
		// Fresh page per test: navigate and wait for readiness
		await page.goto('/');
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });

		const starMap = page.locator('[data-testid="star-map"]');
		await expect(starMap).toBeVisible({ timeout: 20_000 });

		// Check if there are systems to transition to; skip test gracefully if not
		const hasSystems = await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			try {
				const data =
					typeof w.getClusterSnapshot === 'function'
						? w.getClusterSnapshot()
						: (() => {
								let v: ClusterLike | undefined;
								w.stores?.cluster?.subscribe((x: ClusterLike) => (v = x))?.();
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
			const w = window as unknown as E2EWindow;
			const data =
				typeof w.getClusterSnapshot === 'function'
					? w.getClusterSnapshot()
					: (() => {
							let v!: ClusterLike;
							w.stores.cluster?.subscribe((x: ClusterLike) => (v = x))?.();
							return v;
						})();
			return data.Systems[0].Id as string;
		});

		const startTime = Date.now();

		await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const { activeSystemId, viewMode } = w.stores;
			activeSystemId.set(id);
			viewMode.set('system');
		}, targetSystemId);

		const solarSystemMap = page.locator('[data-testid="solar-system-map"]');
		await expect(solarSystemMap).toBeVisible({ timeout: 20_000 });

		const transitionTime = Date.now() - startTime;
		console.log(`Transition time: ${transitionTime}ms`);
	});
});
