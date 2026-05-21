describe('Map Rendering', () => {
	it('should render the star map on startup', async () => {
		await browser.url('http://localhost:1420');

		// App-level readiness: wait until WASM + cluster loaded
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.e2eReady),
			{ timeout: 20000, timeoutMsg: 'App not ready (e2eReady not set)' }
		);

		// Wait for loading screen to disappear
		const loadingScreen = await $('[data-testid="loading-screen"]');
		await loadingScreen.waitForDisplayed({ reverse: true, timeout: 15000 });

		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 10000 });

		// Check if PixiJS canvas is present
		const canvas = await starMap.$('canvas');
		await canvas.waitForExist({ timeout: 5000 });
		expect(await canvas.isDisplayed()).toBe(true);

		// Wait for debug instrumentation to be available on the cluster view
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.starMapDebug?.viewport),
			{ timeout: 20000, timeoutMsg: 'StarMap debug info not available' }
		);

		// Check if systems are rendered in PixiJS
		const childCount = await browser.execute(() => {
			return window.starMapDebug?.viewport?.children?.length || 0;
		});
		expect(childCount).toBeGreaterThan(0);
	});

	it('should render the solar system map when a system is selected', async () => {
		// Ensure app is ready first
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.e2eReady),
			{ timeout: 20000, timeoutMsg: 'App not ready (e2eReady not set)' }
		);
		// Navigate to a system
		await browser.waitUntil(
			async () =>
				await browser.execute(() => {
					try {
						const snap = typeof window.getClusterSnapshot === 'function'
							? window.getClusterSnapshot()
							: (() => {
								let v; window.stores?.cluster?.subscribe((x) => (v = x))?.(); return v;
							})();
						return !!snap && Array.isArray(snap.Systems) && snap.Systems.length > 0;
					} catch { return false; }
				}),
			{ timeout: 20000, timeoutMsg: 'Cluster data not loaded for system selection' }
		);

		await browser.execute(() => {
			// @ts-ignore
			const data = typeof window.getClusterSnapshot === 'function' ? window.getClusterSnapshot() : (() => { let v; window.stores.cluster.subscribe((x) => (v = x))(); return v; })();
			const systemId = data.Systems[0].Id;
			window.stores.activeSystemId.set(systemId);
			window.stores.viewMode.set('system');
		});

		const solarMap = await $('[data-testid="solar-system-map"]');
		await solarMap.waitForDisplayed({ timeout: 20000 });

		// Wait for explicit system readiness first, then instrumentation
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.e2eSystemReady),
			{ timeout: 20000, timeoutMsg: 'System view not ready (e2eSystemReady not set)' }
		);

		const canvas = await solarMap.$('canvas');
		await canvas.waitForExist({ timeout: 5000 });
		expect(await canvas.isDisplayed()).toBe(true);

		// Wait for debug info to be available after readiness (correct hook name)
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.solarSystemMapDebug?.viewport),
			{ timeout: 20000, timeoutMsg: 'SolarSystemMap debug info not available' }
		);

		// Check if bodies are rendered in PixiJS
		const bodyCount = await browser.execute(() => {
			return window.solarSystemMapDebug?.viewport?.children?.length || 0;
		});
		expect(bodyCount).toBeGreaterThan(0);

		// Check if system name is displayed (it's a DOM element in SolarSystemMap)
		const systemName = await $('h1');
		await systemName.waitForDisplayed({ timeout: 5000 });
		expect(await systemName.getText()).toContain('System');
	});
});
