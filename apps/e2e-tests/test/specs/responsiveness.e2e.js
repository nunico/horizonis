describe('App Responsiveness', () => {
	it('should load the cluster within a reasonable time', async () => {
		const startTime = Date.now();
		await browser.url('http://localhost:1420'); // Use dev URL for testing if possible or handled by Tauri

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

		const clusterData = await browser.execute(() => {
			let data;
			window.stores.cluster.subscribe((v) => (data = v))();
			return data;
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

		const transitionTime = Date.now() - startTime;
		console.log(`Transition time: ${transitionTime}ms`);
	});
});
