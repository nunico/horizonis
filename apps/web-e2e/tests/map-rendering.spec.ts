import { expect, test } from '@playwright/test';

type ClusterLike = { Systems: Array<{ Id: string; Name?: string }> };

type E2EWindow = Window & {
	e2eReady?: boolean;
	e2eSystemReady?: boolean;
	starMapDebug?: { viewport?: { children?: unknown[] } };
	solarSystemMapDebug?: { viewport?: { children?: unknown[] } };
	stores?: {
		cluster?: { subscribe: (fn: (x: ClusterLike) => void) => () => void };
		activeSystemId: { set: (id: string) => void };
		viewMode: { set: (mode: string) => void };
	};
	getClusterSnapshot?: () => ClusterLike;
};

test.describe('Map Rendering', () => {
	test.beforeEach(async ({ page }) => {
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
		await expect(starMap).toBeVisible({ timeout: 10_000 });

		// PixiJS canvas present
		const canvas = starMap.locator('canvas');
		await expect(canvas).toHaveCount(1, { timeout: 5_000 });
		await expect(canvas).toBeVisible();

		// Wait for debug instrumentation on the cluster view
		await page.waitForFunction(() => Boolean((window as E2EWindow).starMapDebug?.viewport), {
			timeout: 20_000
		});

		const childCount = await page.evaluate(() => {
			const vp = (window as E2EWindow).starMapDebug?.viewport;
			return (vp?.children?.length as number | undefined) ?? 0;
		});
		expect(childCount).toBeGreaterThan(0);
	});

	test('renders the solar system map when a system is selected', async ({ page }) => {
		// Ensure cluster snapshot is available
		await page.waitForFunction(
			() => {
				try {
					const w = window as E2EWindow;
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
			},
			{ timeout: 20_000 }
		);

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

		// Wait for explicit system readiness then instrumentation
		await page.waitForFunction(() => (window as E2EWindow).e2eSystemReady === true, {
			timeout: 20_000
		});

		const systemCanvas = solarMap.locator('canvas');
		await expect(systemCanvas).toHaveCount(1, { timeout: 5_000 });
		await expect(systemCanvas).toBeVisible();

		await page.waitForFunction(() => Boolean((window as E2EWindow).solarSystemMapDebug?.viewport), {
			timeout: 20_000
		});

		const bodyCount = await page.evaluate(() => {
			const vp = (window as E2EWindow).solarSystemMapDebug?.viewport;
			return (vp?.children?.length as number | undefined) ?? 0;
		});
		expect(bodyCount).toBeGreaterThan(0);

		const systemName = page.locator('h1');
		await expect(systemName).toBeVisible({ timeout: 5_000 });
		await expect(systemName).toHaveText(/System/i);
	});
});
