describe('Zoom UX Regression', () => {
	it('should fit the whole system on entry', async () => {
		await browser.url('http://localhost:1420');

		// Wait for cluster and select first system
		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 20000 });

		const clusterData = await browser.execute(() => {
			let data;
			window.stores.cluster.subscribe((v) => (data = v))();
			return data;
		});
		const targetSystemId = clusterData.systems[0].id;

		await browser.execute((id) => {
			window.stores.activeSystemId.set(id);
			window.stores.viewMode.set('system');
		}, targetSystemId);

		const solarSystemMap = await $('[data-testid="solar-system-map"]');
		await solarSystemMap.waitForDisplayed({ timeout: 20000 });

		// Wait for instrumentation to be ready
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.solarSystemMapDebug);
			},
			{ timeout: 5000, timeoutMsg: 'SolarSystemMap debug data not found' }
		);

		// Check initial scale
		const debugData = await browser.execute(() => {
			const { viewport, lastMinScale } = window.solarSystemMapDebug;
			return {
				currentScale: viewport.scale.x,
				minScale: lastMinScale
			};
		});

		// Current scale should be exactly minScale after renderSystem
		expect(debugData.currentScale).toBeCloseTo(debugData.minScale, 4);
	});

	it('should respect max zoom limit on focused object', async () => {
		// Find a planet to focus on
		const targetId = await browser.execute(() => {
			return window.solarSystemMapDebug.bodyNodes[0].body.id;
		});

		// Get planet position
		const planetPos = await browser.execute((id) => {
			const node = window.solarSystemMapDebug.bodyNodes.find((n) => n.body.id === id);
			const pos = window.solarSystemMapDebug.viewport.toScreen(node.worldX, node.worldY);
			return { x: pos.x, y: pos.y };
		}, targetId);

		// Move mouse to planet to trigger focus
		await browser.performActions([
			{
				type: 'pointer',
				id: 'finger1',
				parameters: { pointerType: 'mouse' },
				actions: [
					{
						type: 'pointerMove',
						duration: 100,
						x: Math.round(planetPos.x),
						y: Math.round(planetPos.y)
					}
				]
			}
		]);

		// Small wait for focus update
		await browser.pause(500);

		// Zoom in using wheel
		await browser.performActions([
			{
				type: 'wheel',
				id: 'wheel1',
				actions: [
					{ type: 'scroll', duration: 500, x: 0, y: 0, deltaX: 0, deltaY: -5000 } // Zoom in
				]
			}
		]);

		// Check scale vs maxScale
		const scaleData = await browser.execute(() => {
			const { viewport, lastMaxScale } = window.solarSystemMapDebug;
			return {
				currentScale: viewport.scale.x,
				maxScale: lastMaxScale
			};
		});

		expect(scaleData.currentScale).toBeLessThanOrEqual(scaleData.maxScale + 0.0001);
		// It should be close to maxScale if we zoomed in enough
		expect(scaleData.currentScale).toBeGreaterThan(scaleData.maxScale * 0.9);
	});

	it('should ensure satellites are smaller than parents', async () => {
		// Zoom out to trigger clamping
		await browser.performActions([
			{
				type: 'wheel',
				id: 'wheel2',
				actions: [
					{ type: 'scroll', duration: 500, x: 0, y: 0, deltaX: 0, deltaY: 5000 } // Zoom out
				]
			}
		]);

		await browser.pause(500);

		// Verify for all parent-child pairs in the current view
		const violations = await browser.execute(() => {
			const { bodyNodes, starNodes } = window.solarSystemMapDebug;
			const errors = [];
			const allNodes = [...starNodes, ...bodyNodes];

			for (const node of bodyNodes) {
				if (node.parentId) {
					const parent = allNodes.find((n) => (n.star?.id || n.body?.id) === node.parentId);

					if (parent) {
						const childVisRadius = node.baseRadius * node.container.scale.x;
						const parentVisRadius = parent.baseRadius * parent.container.scale.x;
						// The constraint is 0.4. We allow a tiny epsilon for float math.
						if (childVisRadius > parentVisRadius * 0.4001) {
							errors.push(
								`${node.body.name} (${childVisRadius.toFixed(2)}) is too large compared to parent (${parentVisRadius.toFixed(2)}) - ratio: ${(childVisRadius / parentVisRadius).toFixed(3)}`
							);
						}
					}
				}
			}
			return errors;
		});

		expect(violations).toEqual([]);
	});
});
