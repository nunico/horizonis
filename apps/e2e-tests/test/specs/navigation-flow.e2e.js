describe('Navigation Flow', () => {
	it('should search for a system and navigate to it', async () => {
		await browser.url('http://localhost:1420');

		// Wait for loading screen to disappear
		const loadingScreen = await $('[data-testid="loading-screen"]');
		await loadingScreen.waitForDisplayed({ reverse: true, timeout: 15000 });

		const nav = await $('nav');
		await nav.waitForDisplayed();

		const searchInput = await $('input[placeholder="Search systems..."]');
		await searchInput.click();
		await searchInput.setValue('Alpha');

		const result = await $('button*=Alpha Centauri');
		await result.waitForDisplayed();
		await result.click();

		// Verify we moved to system view
		const solarMap = await $('[data-testid="solar-system-map"]');
		await solarMap.waitForDisplayed();

		const breadcrumbs = await nav.getText();
		expect(breadcrumbs).toContain('Alpha Centauri');
	});

	it('should navigate back to cluster using back button', async () => {
		const backButton = await $('button[aria-label="Go back"]');
		await backButton.click();

		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed();

		const viewMode = await browser.execute(() => {
			let val;
			window.stores.viewMode.subscribe((v) => (val = v))();
			return val;
		});
		expect(viewMode).toBe('cluster');
	});

	it('should open and close help overlay', async () => {
		await browser.keys(['?']);

		const helpTitle = await $('#help-title');
		await helpTitle.waitForDisplayed();
		expect(await helpTitle.getText()).toBe('Keyboard Shortcuts');

		await browser.keys(['Escape']);
		await helpTitle.waitForDisplayed({ reverse: true });
	});

	it('should use Inspector keyboard shortcuts', async () => {
		// Wait for cluster data to be loaded
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					let data;
					window.stores.cluster.subscribe((v) => (data = v))();
					return !!data && !!data.Systems && data.Systems.length > 0;
				});
			},
			{ timeout: 10000, timeoutMsg: 'Cluster data not loaded for selection' }
		);

		// Select a system from cluster to open inspector
		await browser.execute(() => {
			const c = window.stores.cluster;
			let data;
			c.subscribe((v) => (data = v))();
			window.stores.selectedEntity.set(data.Systems[0]);
		});

		const inspector = await $('[role="dialog"]');
		await inspector.waitForDisplayed();

		const nameInput = await inspector.$('#name');
		await nameInput.setValue('Renamed System');

		// Save with Enter
		await browser.keys(['Enter']);
		await inspector.waitForDisplayed({ reverse: true });

		// Verify save
		const systemName = await browser.execute(() => {
			let data;
			window.stores.cluster.subscribe((v) => (data = v))();
			return data.Systems[0].Name;
		});
		expect(systemName).toBe('Renamed System');
	});
});
