describe('Zoom UX Regression', () => {
	it('should fit the whole cluster on entry', async () => {
		await browser.url('http://localhost:1420');

		// Wait for app readiness signal (set after WASM init + cluster load)
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.e2eReady);
			},
			{ timeout: 20000, timeoutMsg: 'App not ready (e2eReady not set)' }
		);

		// Wait for cluster view
		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 20000 });

		// Wait for instrumentation
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.starMapDebug);
			},
			{ timeout: 20000, timeoutMsg: 'StarMap debug data not found' }
		);

		// Wait for cluster render completion to avoid races
		// First ensure cluster data is present
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					try {
						let data;
						window.stores?.cluster?.subscribe((v) => (data = v))?.();
						return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
					} catch {
						return false;
					}
				});
			},
			{ timeout: 10000, timeoutMsg: 'Cluster data not loaded' }
		);

		// Data-driven readiness: wait until cluster is fitted to min scale
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const { viewport, lastMinScale } = window.starMapDebug;
					return Math.abs(viewport.scale.x - lastMinScale) < 1e-3;
				});
			},
			{ timeout: 20000, timeoutMsg: 'Cluster not at min scale' }
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
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.starMapDebug);
			},
			{ timeout: 20000, timeoutMsg: 'StarMap debug data not found' }
		);

		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					try {
						let data;
						window.stores?.cluster?.subscribe((v) => (data = v))?.();
						return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
					} catch {
						return false;
					}
				});
			},
			{ timeout: 10000, timeoutMsg: 'Cluster data not loaded' }
		);

		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const { viewport, lastMinScale } = window.starMapDebug;
					return Math.abs(viewport.scale.x - lastMinScale) < 1e-3;
				});
			},
			{ timeout: 20000, timeoutMsg: 'Cluster not at min scale' }
		);

		// Try to pan far away
		await browser.performActions([
			{
				type: 'pointer',
				id: 'finger2',
				parameters: { pointerType: 'mouse' },
				actions: [
					{ type: 'pointerMove', duration: 0, x: 500, y: 500 },
					{ type: 'pointerDown', button: 0 },
					{ type: 'pointerMove', duration: 500, x: 10, y: 10 },
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

		// Wait for app readiness signal
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.e2eReady);
			},
			{ timeout: 20000, timeoutMsg: 'App not ready (e2eReady not set)' }
		);

		// Wait for cluster and select first system
		const starMap = await $('[data-testid="star-map"]');
		await starMap.waitForDisplayed({ timeout: 20000 });

		// Ensure cluster data and render completed before querying stores
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					try {
						let data;
						window.stores?.cluster?.subscribe((v) => (data = v))?.();
						return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
					} catch {
						return false;
					}
				});
			},
			{ timeout: 10000, timeoutMsg: 'Cluster data not loaded before system switch' }
		);
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const { viewport, lastMinScale } = window.starMapDebug;
					return Math.abs(viewport.scale.x - lastMinScale) < 1e-3;
				});
			},
			{ timeout: 20000, timeoutMsg: 'Cluster not at min scale before system switch' }
		);

		const clusterData = await browser.execute(() => {
			let data;
			window.stores.cluster.subscribe((v) => (data = v))();
			return data;
		});
		const targetSystemId = clusterData.Systems[0].Id;

		await browser.execute((id) => {
			window.stores.activeSystemId.set(id);
			window.stores.viewMode.set('system');
		}, targetSystemId);

		const solarSystemMap = await $('[data-testid="solar-system-map"]');
		await solarSystemMap.waitForDisplayed({ timeout: 20000 });

		// Wait for explicit system-view readiness signal to avoid races
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.e2eSystemReady);
			},
			{ timeout: 20000, timeoutMsg: 'System view not ready (e2eSystemReady not set)' }
		);

		// Wait for instrumentation to be ready
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => !!window.solarSystemMapDebug);
			},
			{ timeout: 20000, timeoutMsg: 'SolarSystemMap debug data not found' }
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
		// Ensure app ready
		await browser.waitUntil(async () => await browser.execute(() => !!window.e2eReady), {
			timeout: 20000,
			timeoutMsg: 'App not ready before max zoom test'
		});

		// Ensure we are in system view; if not, switch like in the previous test
		await browser
			.waitUntil(
				async () => {
					return await browser.execute(() => {
						try {
							let vm;
							window.stores?.viewMode?.subscribe((v) => (vm = v))?.();
							return vm === 'system';
						} catch {
							return false;
						}
					});
				},
				{ timeout: 1000, timeoutMsg: 'Not in system view yet (pre-check)' }
			)
			.catch(async () => {
				// If pre-check failed, navigate to a system view now
				// Ensure cluster data is available before accessing it
				await browser.waitUntil(
					async () => {
						return await browser.execute(() => {
							try {
								const data =
									typeof window.getClusterSnapshot === 'function'
										? window.getClusterSnapshot()
										: (() => {
												let d;
												window.stores?.cluster?.subscribe((v) => (d = v))?.();
												return d;
											})();
								return !!data && Array.isArray(data.Systems) && data.Systems.length > 0;
							} catch {
								return false;
							}
						});
					},
					{ timeout: 20000, timeoutMsg: 'Cluster data not loaded before entering system view' }
				);

				const clusterData = await browser.execute(() => {
					if (typeof window.getClusterSnapshot === 'function') {
						return window.getClusterSnapshot();
					}
					let data;
					// @ts-ignore
					window.stores.cluster.subscribe((v) => (data = v))();
					return data;
				});
				const targetSystemId = clusterData.Systems[0].Id;
				await browser.execute((id) => {
					window.stores.activeSystemId.set(id);
					window.stores.viewMode.set('system');
				}, targetSystemId);
			});

		const solarSystemMap2 = await $('[data-testid="solar-system-map"]');
		await solarSystemMap2.waitForDisplayed({ timeout: 20000 });

		// Wait for explicit system readiness and instrumentation
		await browser.waitUntil(async () => await browser.execute(() => !!window.e2eSystemReady), {
			timeout: 20000,
			timeoutMsg: 'System view not ready before max zoom test'
		});

		// One-time retry: if debug hook isn't ready after 10s, re-trigger system navigation once
		try {
			await browser.waitUntil(
				async () => {
					return await browser.execute(() => !!window.solarSystemMapDebug);
				},
				{ timeout: 10000, timeoutMsg: 'SolarSystemMap debug data not found (first attempt)' }
			);
		} catch {
			// Re-enter system view and wait again (up to another 10s)
			const targetSystemId2 = await browser.execute(() => {
				let data;
				// @ts-ignore
				window.stores.cluster.subscribe((v) => (data = v))();
				return data.Systems[0].Id;
			});
			await browser.execute((id) => {
				// @ts-ignore
				window.stores.activeSystemId.set(id);
				// @ts-ignore
				window.stores.viewMode.set('system');
			}, targetSystemId2);

			await browser.waitUntil(
				async () => {
					return await browser.execute(() => !!window.solarSystemMapDebug);
				},
				{ timeout: 10000, timeoutMsg: 'SolarSystemMap debug data not found for max zoom test' }
			);
		}

		// Ensure initial system view layout is applied
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const dbg = window.solarSystemMapDebug;
					return dbg && Math.abs(dbg.viewport.scale.x - dbg.lastMinScale) < 1e-3;
				});
			},
			{ timeout: 20000, timeoutMsg: 'System not at min scale before selecting target' }
		);

		// Ensure there is at least one entity to focus (body or star)
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const dbg = window.solarSystemMapDebug;
					const bodies = dbg?.bodyNodes?.length || 0;
					const stars = dbg?.starNodes?.length || 0;
					return bodies > 0 || stars > 0;
				});
			},
			{ timeout: 20000, timeoutMsg: 'No focusable bodies or stars found in system view' }
		);

		// Pick a focus target from bodies, or fall back to a star if no bodies exist
		const target = await browser.execute(() => {
			const dbg = window.solarSystemMapDebug;
			if (dbg.bodyNodes && dbg.bodyNodes.length > 0) {
				return { id: dbg.bodyNodes[0].body.Id, type: 'body' };
			}
			if (dbg.starNodes && dbg.starNodes.length > 0) {
				return { id: dbg.starNodes[0].star.Id, type: 'star' };
			}
			return null;
		});

		if (!target) {
			throw new Error('No focusable entities available after wait');
		}

		// Wait until the selected target node is present, then read its screen position
		await browser.waitUntil(
			async () => {
				return await browser.execute((t) => {
					const dbg = window.solarSystemMapDebug;
					if (!dbg) return false;
					const node =
						t.type === 'body'
							? dbg.bodyNodes.find((n) => n.body.Id === t.id)
							: dbg.starNodes.find((n) => n.star.Id === t.id);
					return !!node;
				}, target);
			},
			{ timeout: 20000, timeoutMsg: 'Target node not available in system view' }
		);

		const planetPos = await browser.execute((t) => {
			const dbg = window.solarSystemMapDebug;
			const node =
				t.type === 'body'
					? dbg.bodyNodes.find((n) => n.body.Id === t.id)
					: dbg.starNodes.find((n) => n.star.Id === t.id);
			const pos = dbg.viewport.toScreen(node.worldX, node.worldY);
			return { x: Math.round(pos.x), y: Math.round(pos.y) };
		}, target);

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

		// Ensure instrumentation still present after zoom-induced rerenders
		try {
			await browser.waitUntil(
				async () => await browser.execute(() => !!window.solarSystemMapDebug),
				{ timeout: 20000, timeoutMsg: 'SolarSystemMap debug lost after zoom-in (first attempt)' }
			);
		} catch {
			// One-time recovery: re-assert system view and wait again
			await browser.execute(() => {
				// @ts-ignore
				window.stores.viewMode.set('system');
			});
			await browser.waitUntil(
				async () => await browser.execute(() => !!window.solarSystemMapDebug),
				{ timeout: 10000, timeoutMsg: 'SolarSystemMap debug lost after zoom-in (retry)' }
			);
		}

		// Wait briefly for scale to stabilize after zoom
		await browser.waitUntil(
			async () => {
				const s1 = await browser.execute(() => window.solarSystemMapDebug.viewport.scale.x);
				await browser.pause(120);
				const s2 = await browser.execute(() => window.solarSystemMapDebug.viewport.scale.x);
				return Math.abs(s2 - s1) < 1e-4;
			},
			{ timeout: 5000, timeoutMsg: 'Viewport scale did not stabilize after zoom-in' }
		);

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

		// Ensure system view is ready after zoom-out (more stable than probing debug immediately)
		try {
			await browser.waitUntil(async () => await browser.execute(() => !!window.e2eSystemReady), {
				timeout: 20000,
				timeoutMsg: 'System view not ready after zoom-out (first attempt)'
			});
		} catch {
			// Re-assert system view and re-wait once
			await browser.execute(() => {
				try {
					// Try to keep/restore the active system id
					let currentId;
					// @ts-ignore
					window.stores.activeSystemId.subscribe((v) => (currentId = v))?.();
					// Fallback to first system from snapshot
					// @ts-ignore
					const snap =
						typeof window.getClusterSnapshot === 'function'
							? window.getClusterSnapshot()
							: (() => {
									let v;
									window.stores?.cluster?.subscribe((x) => (v = x))?.();
									return v;
								})();
					// @ts-ignore
					const fallbackId = snap?.Systems?.[0]?.Id;
					// @ts-ignore
					window.stores.activeSystemId.set(currentId ?? fallbackId);
					// @ts-ignore
					window.stores.viewMode.set('system');
				} catch {}
			});
			await browser.waitUntil(async () => await browser.execute(() => !!window.e2eSystemReady), {
				timeout: 10000,
				timeoutMsg: 'System view not ready after zoom-out (retry)'
			});
		}

		// Then ensure instrumentation becomes available shortly after readiness
		await browser.waitUntil(async () => await browser.execute(() => !!window.solarSystemMapDebug), {
			timeout: 20000,
			timeoutMsg: 'SolarSystemMap debug not available after zoom-out readiness'
		});

		// Ensure scale stabilized after zoom-out to avoid transient size checks
		await browser.waitUntil(
			async () => {
				const s1 = await browser.execute(() => window.solarSystemMapDebug.viewport.scale.x);
				await browser.pause(120);
				const s2 = await browser.execute(() => window.solarSystemMapDebug.viewport.scale.x);
				return Math.abs(s2 - s1) < 1e-4;
			},
			{ timeout: 5000, timeoutMsg: 'Viewport scale did not stabilize after zoom-out' }
		);

		// Verify for all parent-child pairs in the current view
		const violations = await browser.execute(() => {
			const { bodyNodes, starNodes } = window.solarSystemMapDebug;
			const errors = [];
			const allNodes = [...starNodes, ...bodyNodes];

			for (const node of bodyNodes) {
				if (node.parentId) {
					const parent = allNodes.find((n) => (n.star?.Id || n.body?.Id) === node.parentId);

					if (parent) {
						const childVisRadius = node.baseRadius * node.container.scale.x;
						const parentVisRadius = parent.baseRadius * parent.container.scale.x;
						// The constraint is 0.4. We allow a tiny epsilon for float math.
						if (childVisRadius > parentVisRadius * 0.4001) {
							errors.push(
								`${node.body.Name} (${childVisRadius.toFixed(2)}) is too large compared to parent (${parentVisRadius.toFixed(2)}) - ratio: ${(childVisRadius / parentVisRadius).toFixed(3)}`
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
