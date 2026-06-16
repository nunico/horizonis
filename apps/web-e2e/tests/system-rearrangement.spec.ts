import { expect, test } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow } from './types';

type StarMapViewportDebug = {
	starMapDebug: {
		viewport: {
			toScreen: (x: number, y: number) => { x: number; y: number };
			center: { x: number; y: number };
		};
	};
};

test.describe('System Rearrangement', () => {
	test.beforeEach(async ({ page }) => {
		// Provide deterministic cluster-data fixture
		await page.addInitScript((fixture) => {
			// Clear localStorage only on first load, not on reloads
			if (!localStorage.getItem('e2e_initialized')) {
				localStorage.clear();
				localStorage.setItem('e2e_initialized', 'true');
			}

			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());

		await page.goto('/');
		// Wait until app is ready
		await page.waitForFunction(() => (window as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		// Wait for Star Map to be rendered
		await page.waitForFunction(() => (window as E2EWindow).e2eClusterReady === true, {
			timeout: 20_000
		});
		// Wait for loading screen to disappear
		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('can drag a solar system to a new location and persist it', async ({ page }) => {
		const systemId = 'sys-0001';

		// 1. Get initial world position from store
		const initialWorldPos = await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const cluster = w.getClusterSnapshot!();
			if (!cluster || !cluster.Systems) {
				throw new Error(`Cluster or Systems not found. Cluster: ${JSON.stringify(cluster)}`);
			}
			const sys = cluster.Systems.find((s) => s.Id === id);
			if (!sys) {
				throw new Error(
					`System ${id} not found. Available IDs: ${cluster.Systems.map((s) => s.Id).join(', ')}`
				);
			}
			return { x: sys.X, y: sys.Y };
		}, systemId);

		// 2. Calculate screen position of the system node
		const screenPos = await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const debug = (w as unknown as StarMapViewportDebug).starMapDebug;
			if (!debug || !debug.viewport) throw new Error('starMapDebug.viewport not found');
			
			const viewport = debug.viewport;
			const cluster = w.getClusterSnapshot!();
			const sys = cluster.Systems.find((s) => s.Id === id);
			
			// viewport.toScreen converts world coordinates to screen coordinates (canvas-relative)
			const pos = viewport.toScreen(sys!.X, sys!.Y);
			const canvas = document.querySelector('canvas')!;
			const rect = canvas.getBoundingClientRect();
			
			return {
				x: pos.x + rect.left,
				y: pos.y + rect.top
			};
		}, systemId);

		// 3. Perform the drag-and-drop interaction
		// Move to the system's center
		await page.mouse.move(screenPos.x, screenPos.y);
		// Click and hold
		await page.mouse.down();
		// Drag to a new position (offset by 100px on screen)
		await page.mouse.move(screenPos.x + 100, screenPos.y + 100);
		// Release
		await page.mouse.up();

		// Give it a moment to process the store update and save
		await page.waitForTimeout(500);

		// 4. Verify world position in store has updated
		const newWorldPos = await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const cluster = w.getClusterSnapshot!();
			const sys = cluster.Systems.find((s) => s.Id === id);
			return { x: sys!.X, y: sys!.Y };
		}, systemId);

		expect(newWorldPos.x).not.toBe(initialWorldPos.x);
		expect(newWorldPos.y).not.toBe(initialWorldPos.y);

		// 5. Reload the page and verify persistence in localStorage
		await page.reload();
		await page.waitForFunction(() => (window as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		await page.waitForFunction(() => (window as E2EWindow).e2eClusterReady === true, {
			timeout: 20_000
		});

		const persistedWorldPos = await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const cluster = w.getClusterSnapshot!();
			const sys = cluster.Systems.find((s) => s.Id === id);
			return { x: sys!.X, y: sys!.Y };
		}, systemId);

		// The position should be exactly what it was after the drag
		expect(persistedWorldPos.x).toBe(newWorldPos.x);
		expect(persistedWorldPos.y).toBe(newWorldPos.y);
	});

	test('viewport does not reset its center after dragging a system', async ({ page }) => {
		const systemId = 'sys-0001';

		// 1. Get initial screen position of the system
		const screenPos = await page.evaluate((id) => {
			const w = window as unknown as E2EWindow;
			const debug = (w as unknown as StarMapViewportDebug).starMapDebug;
			const viewport = debug.viewport;
			const cluster = w.getClusterSnapshot!();
			const sys = cluster.Systems.find((s) => s.Id === id);
			const pos = viewport.toScreen(sys!.X, sys!.Y);
			const canvas = document.querySelector('canvas')!;
			const rect = canvas.getBoundingClientRect();
			return { x: pos.x + rect.left, y: pos.y + rect.top };
		}, systemId);

		// 2. Pan the viewport slightly so it's not at the default center
		await page.mouse.move(screenPos.x, screenPos.y);
		await page.mouse.down({ button: 'middle' }); // Assume middle mouse pans
		await page.mouse.move(screenPos.x + 50, screenPos.y + 50);
		await page.mouse.up({ button: 'middle' });

		const centerBeforeDrag = await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			const debug = (w as unknown as StarMapViewportDebug).starMapDebug;
			return { x: debug.viewport.center.x, y: debug.viewport.center.y };
		});

		// 3. Drag the system
		await page.mouse.move(screenPos.x + 50, screenPos.y + 50); // Move to new system position
		await page.mouse.down();
		await page.mouse.move(screenPos.x + 150, screenPos.y + 150);
		await page.mouse.up();

		// Wait for save and potential re-render
		await page.waitForTimeout(1000);

		const centerAfterDrag = await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			const debug = (w as unknown as StarMapViewportDebug).starMapDebug;
			return { x: debug.viewport.center.x, y: debug.viewport.center.y };
		});

		// If it jump-resets, these will be different (centerAfterDrag will be the cluster center)
		expect(centerAfterDrag.x).toBeCloseTo(centerBeforeDrag.x, 0.1);
		expect(centerAfterDrag.y).toBeCloseTo(centerBeforeDrag.y, 0.1);
	});
});
