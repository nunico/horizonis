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
		viewport.on('zoomed', updateScales);
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
	}

	function renderCluster() {
		if (!$cluster || !viewport) return;

		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		systemNodes = [];

		// Render portals first (background)
		const portalGraphics = new PIXI.Graphics();
		viewport.addChild(portalGraphics);

		for (const system of $cluster.systems) {
			for (const portal of system.portals) {
				const target = $cluster.systems.find((s) => s.id === portal.target_system_id);
				if (target) {
					portalGraphics
						.moveTo(system.x, system.y)
						.lineTo(target.x, target.y)
						.stroke({ width: 2, color: 0x334155, alpha: 0.5 });
				}
			}
		}

		// Render systems
		for (const system of $cluster.systems) {
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
	}

	$: if ($cluster && viewport) {
		renderCluster();
	}
</script>

<div bind:this={container} data-testid="star-map" class="w-full h-full"></div>
