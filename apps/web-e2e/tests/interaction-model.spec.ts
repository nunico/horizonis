import { expect, test, type Page } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow } from './types';

type DebugViewport = {
	starMapDebug: { viewport: { toScreen: (x: number, y: number) => { x: number; y: number } } };
};
type SystemDebug = {
	solarSystemMapDebug: { viewport: { scale: { x: number } }; lastMinScale: number };
};

async function worldPos(page: Page, id: string) {
	return page.evaluate((sysId) => {
		const w = window as unknown as E2EWindow;
		const sys = w.getClusterSnapshot!().Systems.find((s) => s.Id === sysId)!;
		return { x: (sys as { X: number }).X, y: (sys as { Y: number }).Y };
	}, id);
}

async function screenPos(page: Page, id: string) {
	return page.evaluate((sysId) => {
		const w = window as unknown as E2EWindow & DebugViewport;
		const sys = w.getClusterSnapshot!().Systems.find((s) => s.Id === sysId)! as {
			X: number;
			Y: number;
		};
		const pos = w.starMapDebug.viewport.toScreen(sys.X, sys.Y);
		const rect = document.querySelector('canvas')!.getBoundingClientRect();
		return { x: pos.x + rect.left, y: pos.y + rect.top };
	}, id);
}

test.describe('Interaction model (drag threshold, focus, open, scale toggle)', () => {
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
		await page.waitForFunction(() => (window as E2EWindow).e2eClusterReady === true, {
			timeout: 20_000
		});
		await page
			.locator('[data-testid="loading-screen"]')
			.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('clicking a system selects it without moving it', async ({ page }) => {
		const id = 'sys-0001';
		const before = await worldPos(page, id);
		const at = await screenPos(page, id);

		// Press and release without moving — must stay a pure click, not a drag.
		await page.mouse.move(at.x, at.y);
		await page.mouse.down();
		await page.mouse.up();
		await page.waitForTimeout(400);

		const after = await worldPos(page, id);
		expect(after).toEqual(before);

		// And the click selected the system (Inspector opened).
		await expect(page.locator('[role="dialog"]')).toBeVisible();
	});

	test('a sub-threshold drag does not move the system', async ({ page }) => {
		const id = 'sys-0001';
		const before = await worldPos(page, id);
		const at = await screenPos(page, id);

		await page.mouse.move(at.x, at.y);
		await page.mouse.down();
		await page.mouse.move(at.x + 2, at.y + 2); // within the threshold
		await page.mouse.up();
		await page.waitForTimeout(400);

		const after = await worldPos(page, id);
		expect(after).toEqual(before);
	});

	test('selecting a system does not move focus into the name field', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			w.stores.selectedEntity.set(w.getClusterSnapshot!().Systems[0]);
		});

		await expect(page.locator('[role="dialog"]')).toBeVisible();
		const nameFocused = await page.evaluate(() => document.activeElement?.id === 'name');
		expect(nameFocused).toBe(false);
	});

	test('the Inspector Open System button enters the system view', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			w.stores.selectedEntity.set(w.getClusterSnapshot!().Systems[0]);
		});

		const inspector = page.locator('[role="dialog"]');
		await expect(inspector).toBeVisible();
		await inspector.getByRole('button', { name: /open system/i }).click();

		await expect(page.locator('[data-testid="solar-system-map"]')).toBeVisible({ timeout: 20_000 });
	});

	test('the Linear/Log toggle preserves the camera framing', async ({ page }) => {
		await page.evaluate(() => {
			const w = window as unknown as E2EWindow;
			const snap = w.getClusterSnapshot!();
			w.stores.activeSystemId.set(snap.Systems[0].Id);
			w.stores.viewMode.set('system');
		});

		await expect(page.locator('[data-testid="solar-system-map"]')).toBeVisible({ timeout: 20_000 });
		await page.waitForFunction(() => (window as E2EWindow).e2eSystemReady === true, {
			timeout: 20_000
		});

		// Zoom in so the camera is no longer at the fully-zoomed-out minimum.
		const box = (await page.locator('canvas').boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, -600);
		await page.waitForTimeout(400);

		const ratioBefore = await page.evaluate(() => {
			const d = (window as unknown as SystemDebug).solarSystemMapDebug;
			return d.viewport.scale.x / d.lastMinScale;
		});
		// Sanity: we actually zoomed in.
		expect(ratioBefore).toBeGreaterThan(1.1);

		// Default mode is log; switch to linear.
		await page.getByRole('button', { name: 'Linear' }).click();
		await page.waitForTimeout(600);

		const ratioAfter = await page.evaluate(() => {
			const d = (window as unknown as SystemDebug).solarSystemMapDebug;
			return d.viewport.scale.x / d.lastMinScale;
		});

		// The pixel mapping changes between modes, so absolute scale differs — but
		// the zoom *ratio* is preserved. A reset would collapse it back to ~1.
		expect(ratioAfter).toBeGreaterThan(1.1);
		expect(Math.abs(ratioAfter - ratioBefore) / ratioBefore).toBeLessThan(0.3);
	});
});
