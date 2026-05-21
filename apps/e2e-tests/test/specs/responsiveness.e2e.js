describe('App Responsiveness', () => {
	it('should load the cluster within a reasonable time', async () => {
		const startTime = Date.now();
		await browser.url('http://localhost:1420'); // Use dev URL for testing if possible or handled by Tauri

		// App readiness first to ensure WASM + cluster loaded
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.e2eReady),
			{ timeout: 20000, timeoutMsg: 'App not ready (e2eReady not set)' }
		);

		const loadingScreen = await $('[data-testid="loading-screen"]');
		await loadingScreen.waitForDisplayed();

		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 20000 });

		const loadTime = Date.now() - startTime;
		console.log(`Cluster load time: ${loadTime}ms`);
	});

	it('should transition to solar system view quickly', async () => {
		// Ensure we are in cluster view
		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed();

		// Ensure cluster data available and use snapshot helper
		await browser.waitUntil(
			async () => await browser.execute(() => {
				try {
					const data = typeof window.getClusterSnapshot === 'function'
						? window.getClusterSnapshot()
						: (() => { let v; window.stores?.cluster?.subscribe((x) => (v = x))?.(); return v; })();
					return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
				} catch { return false; }
			}),
			{ timeout: 20000, timeoutMsg: 'Cluster data not loaded for responsiveness test' }
		);

		const clusterData = await browser.execute(() => {
			// @ts-ignore
			return typeof window.getClusterSnapshot === 'function' ? window.getClusterSnapshot() : (() => { let v; window.stores.cluster.subscribe((x) => (v = x))(); return v; })();
		});

		const targetSystemId = clusterData.Systems[0].Id;
		const startTime = Date.now();

		await browser.execute((id) => {
			const { activeSystemId, viewMode } = window.stores;
			activeSystemId.set(id);
			viewMode.set('system');
		}, targetSystemId);

		const solarSystemMap = await $('[data-testid="solar-system-map"]');
		await solarSystemMap.waitForDisplayed({ timeout: 20000 });

		// Wait for explicit system readiness to avoid timing races
		await browser.waitUntil(
			async () => await browser.execute(() => !!window.e2eSystemReady),
			{ timeout: 20000, timeoutMsg: 'System view not ready (e2eSystemReady not set)' }
		);

		const transitionTime = Date.now() - startTime;
		console.log(`Transition time: ${transitionTime}ms`);
	});
});
