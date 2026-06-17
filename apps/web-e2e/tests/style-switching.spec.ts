import { expect, test } from '@playwright/test';
import { getFixtureCluster } from './fixtures/cluster';
import type { E2EWindow } from './types';

/** A minimal valid style definition (forked from the realistic default). */
const IMPORTED_STYLE = {
	meta: { id: 'e2e-aurora', name: 'E2E Aurora', version: '1.0.0' },
	backgroundColor: '#001018',
	palette: {
		accent: '#7dd3fc',
		hover: '#ffffff',
		linkIdle: '#1e3a5f',
		orbitHover: '#bae6fd',
		region: '#334155',
		labelPrimary: '#e0f2fe',
		labelSecondary: '#7dd3fc',
		systemFill: '#7dd3fc',
		spectral: {
			O: '#6b9fff',
			B: '#9fc8ff',
			A: '#e8e8e8',
			F: '#fff8d6',
			G: '#ffd966',
			K: '#ff9966',
			M: '#ff6644',
			default: '#7dd3fc'
		},
		body: {
			Planet: '#60a5fa',
			Moon: '#94a3b8',
			SpaceStation: '#ec4899',
			DwarfPlanet: '#a78bfa',
			Comet: '#2dd4bf',
			default: '#ffffff'
		}
	},
	star: { shape: 'gradient' },
	body: { shape: 'disc' },
	systemNode: { shape: 'disc' },
	stroke: {
		orbit: { width: 1, alpha: 0.35 },
		portal: { width: 2, alpha: 0.5 },
		region: { width: 1, alpha: 0.2 }
	},
	label: { fontFamily: 'sans-serif', fontSize: 14 }
};

test.describe('Map style switching', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript((fixture) => {
			(window as unknown as E2EWindow).PUBLIC_E2E = '1';
			(window as unknown as E2EWindow).__E2E_CLUSTER_FIXTURE = fixture;
		}, getFixtureCluster());

		await page.goto('/');
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		const loadingScreen = page.locator('[data-testid="loading-screen"]');
		await loadingScreen.waitFor({ state: 'detached', timeout: 15_000 });
	});

	test('switches the active style and persists the choice across reloads', async ({ page }) => {
		await page.getByRole('button', { name: 'Map style' }).click();

		const menu = page.getByRole('menu');
		await expect(menu.getByText('Realistic Star Field')).toBeVisible();
		await expect(menu.getByText('Tactical CRT')).toBeVisible();

		await menu.getByRole('menuitemradio', { name: /Tactical CRT/ }).click();

		// The selection is persisted to localStorage immediately.
		await expect
			.poll(() => page.evaluate(() => localStorage.getItem('horizonis_style_id')))
			.toBe('tactical');

		// And survives a reload: the menu shows Tactical as the checked style.
		await page.reload();
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});
		await page.getByRole('button', { name: 'Map style' }).click();
		await expect(
			page.getByRole('menu').getByRole('menuitemradio', { name: /Tactical CRT/ })
		).toHaveAttribute('aria-checked', 'true');
	});

	test('imports a style file, activates it, and keeps it after reload', async ({ page }) => {
		await page.getByRole('button', { name: 'Map style' }).click();

		await page.locator('[data-testid="style-import-input"]').setInputFiles({
			name: 'aurora.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(IMPORTED_STYLE))
		});

		// Import auto-activates the new style and persists it.
		await expect
			.poll(() => page.evaluate(() => localStorage.getItem('horizonis_style_id')))
			.toBe('e2e-aurora');

		await page.reload();
		await page.waitForFunction(() => (window as unknown as E2EWindow).e2eReady === true, {
			timeout: 20_000
		});

		await page.getByRole('button', { name: 'Map style' }).click();
		const menu = page.getByRole('menu');
		await expect(menu.getByText('E2E Aurora')).toBeVisible();
		await expect(menu.getByRole('menuitemradio', { name: /E2E Aurora/ })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});
});
