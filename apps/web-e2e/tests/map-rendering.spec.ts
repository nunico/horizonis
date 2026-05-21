import { expect, test } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow, ClusterLike } from './types';

test.describe('Map Rendering', () => {
	test.beforeEach(async ({ page }) => {
		// Provide deterministic cluster-data fixture to the app before it loads
		await page.addInitScript((fixture) => {
			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());

		await page.goto('/');
		// App-level readiness: wait until WASM + cluster loaded
		await page.waitForFunction(() => (window as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		// Wait for loading screen to disappear
		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('renders the star map on startup', async ({ page }) => {
		const starMap = page.locator('[data-testid="star-map"]');
		await expect(starMap).toBeVisible({ timeout: 20_000 });

		// Proceed once star map is visible (cluster readiness flag may be disabled in prod builds)

		// PixiJS canvas present
		const canvas = starMap.locator('canvas');
		await expect(canvas).toHaveCount(1, { timeout: 5_000 });
		await expect(canvas).toBeVisible();

		// Optional debug instrumentation check (only if available)
		const hasDebug = await page.evaluate(() =>
			Boolean((window as E2EWindow).starMapDebug?.viewport)
		);
		if (hasDebug) {
			const childCount = await page.evaluate(() => {
				const vp = (window as E2EWindow).starMapDebug?.viewport;
				return (vp?.children?.length as number | undefined) ?? 0;
			});
			expect(childCount).toBeGreaterThan(0);
		}
	});

	test('renders the solar system map when a system is selected', async ({ page }) => {
		// Check if there are systems to select; skip test gracefully if not
		const hasSystems = await page.evaluate(() => {
			const w = window as E2EWindow;
			try {
				const snap: ClusterLike | undefined =
					typeof w.getClusterSnapshot === 'function'
						? w.getClusterSnapshot?.()
						: (() => {
								let v: ClusterLike | undefined = undefined;
								w.stores?.cluster?.subscribe((x: ClusterLike) => (v = x))?.();
								return v;
							})();
				return !!snap && Array.isArray(snap.Systems) && snap.Systems.length > 0;
			} catch {
				return false;
			}
		});
		if (!hasSystems) {
			test.skip(true, 'No systems available in cluster');
		}

		await page.evaluate(() => {
			const w = window as E2EWindow;
			const data: ClusterLike =
				typeof w.getClusterSnapshot === 'function'
					? (w.getClusterSnapshot as () => ClusterLike)()
					: (() => {
							let v!: ClusterLike;
							w.stores!.cluster!.subscribe((x: ClusterLike) => (v = x))();
							return v;
						})();
			const systemId = data.Systems[0].Id;
			w.stores!.activeSystemId.set(systemId);
			w.stores!.viewMode.set('system');
		});

		const solarMap = page.locator('[data-testid="solar-system-map"]');
		await expect(solarMap).toBeVisible({ timeout: 20_000 });

		// Proceed based on map visibility; system readiness flag may be disabled in prod builds

		const systemCanvas = solarMap.locator('canvas');
		await expect(systemCanvas).toHaveCount(1, { timeout: 15_000 });
		await expect(systemCanvas).toBeVisible();

		// Optional debug instrumentation check (only if available)
		const hasSysDebug = await page.evaluate(() =>
			Boolean((window as E2EWindow).solarSystemMapDebug?.viewport)
		);
		if (hasSysDebug) {
			const bodyCount = await page.evaluate(() => {
				const vp = (window as E2EWindow).solarSystemMapDebug?.viewport;
				return (vp?.children?.length as number | undefined) ?? 0;
			});
			expect(bodyCount).toBeGreaterThan(0);
		}

		const systemName = page.locator('h1');
		await expect(systemName).toBeVisible({ timeout: 5_000 });
		await expect(systemName).toHaveText(/System/i);
	});
});
