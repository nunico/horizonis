describe('Map Rendering', () => {
	it('should render the star map on startup', async () => {
		await browser.url('http://localhost:1420');

		// Wait for loading screen to disappear
		const loadingScreen = await $('[data-testid="loading-screen"]');
		await loadingScreen.waitForDisplayed({ reverse: true, timeout: 15000 });

		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 10000 });

		// Check if PixiJS canvas is present
		const canvas = await starMap.$('canvas');
		await canvas.waitForExist({ timeout: 5000 });
		expect(await canvas.isDisplayed()).toBe(true);
		
		// Wait for debug info to be available
		await browser.waitUntil(async () => {
			return await browser.execute(() => !!window.starMapDebug?.viewport);
		}, { timeout: 10000, timeoutMsg: 'StarMap debug info not available' });

		// Check if systems are rendered in PixiJS
		const childCount = await browser.execute(() => {
			return window.starMapDebug?.viewport?.children?.length || 0;
		});
		expect(childCount).toBeGreaterThan(0);
	});

	it('should render the solar system map when a system is selected', async () => {
		// Navigate to a system
		await browser.execute(() => {
			const c = window.stores.cluster;
			let data;
			c.subscribe((v) => (data = v))();
			if (data && data.Systems && data.Systems.length > 0) {
				const systemId = data.Systems[0].Id;
				window.stores.activeSystemId.set(systemId);
				window.stores.viewMode.set('system');
			}
		});

		const solarMap = await $('[data-testid="solar-system-map"]');
		await solarMap.waitForDisplayed({ timeout: 5000 });

		const canvas = await solarMap.$('canvas');
		await canvas.waitForExist({ timeout: 5000 });
		expect(await canvas.isDisplayed()).toBe(true);

		// Wait for debug info to be available
		await browser.waitUntil(async () => {
			return await browser.execute(() => !!window.solarSystemDebug?.viewport);
		}, { timeout: 10000, timeoutMsg: 'SolarSystemMap debug info not available' });

		// Check if bodies are rendered in PixiJS
		const bodyCount = await browser.execute(() => {
			return window.solarSystemDebug?.viewport?.children?.length || 0;
		});
		expect(bodyCount).toBeGreaterThan(0);

		// Check if system name is displayed (it's a DOM element in SolarSystemMap)
		const systemName = await $('h1');
		await systemName.waitForDisplayed({ timeout: 5000 });
		expect(await systemName.getText()).toContain('System');
	});
});
