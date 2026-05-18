describe('Zoom UX Regression', () => {
	it('should fit the whole cluster on entry', async () => {
		await browser.url('http://localhost:1420');

		// Wait for cluster view
		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 20000 });

		// Wait for instrumentation
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.starMapDebug);
			},
			{ timeout: 5000, timeoutMsg: 'StarMap debug data not found' }
		);

		// Check initial scale
		const debugData = await browser.execute(() => {
			const { viewport, lastMinScale } = window.starMapDebug;
			return {
				currentScale: viewport.scale.x,
				minScale: lastMinScale
			};
		});

		// Current scale should be exactly minScale after renderCluster
		expect(debugData.currentScale).toBeCloseTo(debugData.minScale, 4);
	});

	it('should prevent panning away from the cluster', async () => {
		// Try to pan far away
		await browser.performActions([
			{
				type: 'pointer',
				id: 'finger2',
				parameters: { pointerType: 'mouse' },
				actions: [
					{ type: 'pointerMove', duration: 0, x: 500, y: 500 },
					{ type: 'pointerDown', button: 0 },
					{ type: 'pointerMove', duration: 500, x: -1000, y: -1000 },
					{ type: 'pointerUp', button: 0 }
				]
			}
		]);

		await browser.pause(500);

		// Check center position - it should be clamped
		// Since we are at minScale, it should be at (clusterCenter, clusterCenter - 28/scale)
		const debugData = await browser.execute(() => {
			const { viewport } = window.starMapDebug;
			// We need to know where the cluster center is
			// For simplicity we assume it's near 0, but we check for the offset
			return { x: viewport.center.x, y: viewport.center.y, scale: viewport.scale.x };
		});

		// x should be near 0 (or cluster center)
		expect(Math.abs(debugData.x)).toBeLessThan(100);
		// y should be near -28/scale (shifted for navigation bar)
		const expectedY = -28 / debugData.scale;
		expect(Math.abs(debugData.y - expectedY)).toBeLessThan(100);
	});

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
