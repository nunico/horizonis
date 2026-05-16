<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { cluster } from '../stores/clusterData';
	import { viewMode, activeSystemId, selectedEntity } from '../stores/appState';

	let container: HTMLDivElement;
	let app: PIXI.Application;
	let viewport: Viewport;
	let resizeHandler: () => void;
	let systemNodes: PIXI.Container[] = [];
	let portalGraphics: PIXI.Graphics;
	let focusedSystem: { x: number; y: number; id: string } | null = null;
	let lastScale = 1;
	let maxClusterRadius = 0;

	onMount(async () => {
		app = new PIXI.Application();
		await app.init({
			resizeTo: container,
			antialias: true,
			backgroundColor: 0x020617 // slate-950
		});
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(app.canvas);

		viewport = new Viewport({
			screenWidth: app.screen.width,
			screenHeight: app.screen.height,
			worldWidth: 4000,
			worldHeight: 4000,
			events: app.renderer.events
		});

		app.stage.addChild(viewport);

		viewport.drag().pinch().wheel().decelerate();

		viewport.moveCenter(0, 0);

		// Handle resizes
		resizeHandler = () => {
			if (viewport && app.renderer) {
				viewport.resize(app.screen.width, app.screen.height);
			}
		};
		app.renderer.on('resize', resizeHandler);
		viewport.on('zoomed', () => {
			const currentScale = viewport.scale.x;
			const zoomingIn = currentScale > lastScale;

			updateFocus();
			updateZoomLimits();
			updateScales();

			if (zoomingIn && focusedSystem && currentScale > 0.5) {
				// Smoothly move towards focused system
				viewport.snap(focusedSystem.x, focusedSystem.y, {
					time: 500,
					removeOnInterrupt: true,
					forceStart: false
				});
			}

			lastScale = currentScale;
		});
		viewport.on('moved', updateScales);
	});

	onDestroy(() => {
		if (app) {
			if (resizeHandler) app.renderer.off('resize', resizeHandler);
			app.destroy(true, { children: true });
		}
	});

	function updateScales() {
		if (!viewport) return;
		const s = 1 / viewport.scale.x;
		for (const node of systemNodes) {
			node.scale.set(s);
		}
		drawPortals();
	}

	function updateFocus() {
		if (!viewport || !app || !$cluster) return;
		const mouseGlobal = app.renderer.events.pointer.global;
		if (!mouseGlobal) return;
		const mouseWorld = viewport.toWorld(mouseGlobal);

		let minDist = Infinity;
		let closest = null;

		for (const system of $cluster.systems) {
			const dist = Math.hypot(system.x - mouseWorld.x, system.y - mouseWorld.y);
			if (dist < minDist) {
				minDist = dist;
				closest = system;
			}
		}

		if (closest) {
			focusedSystem = { x: closest.x, y: closest.y, id: closest.id };
		} else {
			focusedSystem = null;
		}
	}

	function updateZoomLimits() {
		if (!viewport || !$cluster) return;
		const minViewportSize = Math.min(viewport.screenWidth, viewport.screenHeight);

		// Zoom out limit: outer objects > 60% to center
		const minScale = (0.6 * (minViewportSize / 2)) / Math.max(maxClusterRadius, 100);

		// Zoom in limit: focused object boundaries never exceed viewport
		let maxScale = 10; // Default max zoom for cluster
		if (focusedSystem) {
			// Boundaries for a system node are roughly 20px (icon + label)
			maxScale = minViewportSize / 2 / 20;
		}

		viewport.clampZoom({ minScale, maxScale });

		if (viewport.scale.x <= minScale * 1.01) {
			viewport.moveCenter(0, 0);
			viewport.plugins.pause('drag');
		} else {
			viewport.plugins.resume('drag');
		}
	}

	function drawPortals() {
		if (!$cluster || !portalGraphics || !viewport) return;

		portalGraphics.clear();
		const s = 1 / viewport.scale.x;

		for (const system of $cluster.systems) {
			for (const portal of system.portals) {
				const target = $cluster.systems.find((s) => s.id === portal.target_system_id);
				if (target) {
					portalGraphics
						.moveTo(system.x, system.y)
						.lineTo(target.x, target.y)
						.stroke({ width: 2 * s, color: 0x334155, alpha: 0.5 });
				}
			}
		}
	}

	function renderCluster() {
		if (!$cluster || !viewport) return;

		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		systemNodes = [];
		maxClusterRadius = 0;

		// Render portals first (background)
		portalGraphics = new PIXI.Graphics();
		viewport.addChild(portalGraphics);
		drawPortals();

		// Render systems
		for (const system of $cluster.systems) {
			const dist = Math.hypot(system.x, system.y);
			if (dist + 20 > maxClusterRadius) maxClusterRadius = dist + 20;

			const node = new PIXI.Graphics();
			node.circle(0, 0, 10).fill(0x38bdf8);

			node.x = system.x;
			node.y = system.y;
			node.eventMode = 'static';
			node.cursor = 'pointer';

			node.on('pointerdown', (e) => {
				e.stopPropagation();
				selectedEntity.set(system);
			});

			// Double click logic
			let lastClickTime = 0;
			node.on('pointertap', (e) => {
				e.stopPropagation();
				const now = Date.now();
				if (now - lastClickTime < 350) {
					activeSystemId.set(system.id);
					viewMode.set('system');
				}
				lastClickTime = now;
			});

			// Label
			const label = new PIXI.Text({
				text: system.name,
				style: {
					fontFamily: 'sans-serif',
					fontSize: 14,
					fill: 0xf1f5f9
				}
			});
			label.anchor.set(0.5, 0);
			label.y = 15;
			node.addChild(label);

			systemNodes.push(node);
			viewport.addChild(node);
		}

		updateScales();
		updateZoomLimits();
	}

	$: if ($cluster && viewport) {
		renderCluster();
	}
</script>

<div bind:this={container} data-testid="star-map" class="w-full h-full"></div>
