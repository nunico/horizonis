<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { cluster } from '$lib/stores/clusterData';
	import { viewMode, activeSystemId, selectedEntity, type Entity } from '$lib/stores/appState';
	import type { SolarSystem } from '$lib/types/stellar';
	import { SpatialGrid } from '$lib/utils/spatial';
	import { getUniquePortals } from '$lib/utils/stellar';
	import { setupPixi } from '$lib/pixi/setup';
	const PUBLIC_E2E: string | undefined = import.meta.env?.PUBLIC_E2E as string | undefined;

	type WindowWithDebug = Window & {
		starMapDebug?: {
			viewport: Viewport;
		};
		e2eClusterReady?: boolean;
	};

	let container = $state<HTMLDivElement>();
	let app = $state<PIXI.Application>();
	let viewport = $state<Viewport>();
	let resizeHandler: () => void;
	let systemNodes: PIXI.Graphics[] = [];
	let portalNodes: {
		graphics: PIXI.Graphics;
		fromId: string;
		toId: string;
		fromPos: { x: number; y: number };
		toPos: { x: number; y: number };
		key: string;
	}[] = [];
	let hoveredSystemId = $state<string | null>(null);
	let hoveredPortalKey = $state<string | null>(null);

	let focusedSystem = $state<{ x: number; y: number; id: string } | null>(null);
	let lastScale = 1;
	let lastMinScale = 0;
	let lastMaxScale = 0;
	let maxClusterRadius = 0;
	let clusterCenter = { x: 0, y: 0 };
	let selectionGraphics: PIXI.Graphics;
	let hoverGraphics: PIXI.Graphics;

	// Optimization: System lookup Map
	let systemsById = $derived(new SvelteMap($cluster?.Systems?.map((s) => [s.Id, s]) || []));

	// Optimization: Spatial Grid for O(log n) lookups
	const GRID_SIZE = 200;
	let spatialGrid = $derived(new SpatialGrid($cluster?.Systems || [], GRID_SIZE));

	onMount(async () => {
		if (!container) return;
		const pixiApp = new PIXI.Application();
		app = pixiApp;
		try {
			const setup = await setupPixi({ container, app: pixiApp }, updateZoomLimits);
			viewport = setup.viewport;
			resizeHandler = setup.resizeHandler;

			if ($cluster) {
				renderCluster();
			}

			setup.viewport.on('zoomed', () => {
				const currentScale = setup.viewport.scale.x;
				const zoomingIn = currentScale > lastScale * 1.0001;

				updateFocus(currentScale);
				updateZoomLimits();
				updateScales();

				if (zoomingIn && focusedSystem && currentScale > 0.5) {
					const dx = (focusedSystem.x - setup.viewport.center.x) * 0.1;
					const dy = (focusedSystem.y - setup.viewport.center.y) * 0.1;
					setup.viewport.moveCenter(setup.viewport.center.x + dx, setup.viewport.center.y + dy);
				}

				lastScale = currentScale;
			});
			setup.viewport.on('moved', updateScales);

			const enableE2EDebug = PUBLIC_E2E === '1' || PUBLIC_E2E === 'true';
			if ((import.meta.env.DEV || enableE2EDebug) && typeof window !== 'undefined') {
				(window as WindowWithDebug).starMapDebug = {
					viewport: setup.viewport,
					get lastMinScale() {
						return lastMinScale;
					},
					get lastMaxScale() {
						return lastMaxScale;
					},
					updateZoomLimits
				};
			}
		} catch (e) {
			console.error('[StarMap] setupPixi failed:', e);
			return;
		}
	});

	onDestroy(() => {
		if (app) {
			if (resizeHandler) app.renderer.off('resize', resizeHandler);
			app.destroy(true, { children: true, texture: true });
		}
	});

	function updateScales() {
		if (!viewport) return;
		const s = 1 / viewport.scale.x;
		for (const node of systemNodes) {
			node.scale.set(s);
		}
		drawPortals();
		drawSystemHighlights();
		drawSelection();
	}

	function drawSystemHighlights() {
		if (!hoverGraphics || !viewport) return;
		hoverGraphics.clear();
		const s = 1 / viewport.scale.x;

		if (hoveredPortalKey) {
			const portal = portalNodes.find((p) => p.key === hoveredPortalKey);
			if (portal) {
				[portal.fromPos, portal.toPos].forEach((pos) => {
					hoverGraphics
						.circle(pos.x, pos.y, 14 * s)
						.stroke({ width: 2 * s, color: 0xffffff, alpha: 0.6 });
				});
			}
		}

		if (hoveredSystemId) {
			const system = systemsById.get(hoveredSystemId);
			if (system) {
				hoverGraphics
					.circle((system as SolarSystem).X, (system as SolarSystem).Y, 14 * s)
					.stroke({ width: 2 * s, color: 0xffffff, alpha: 0.4 });
			}
		}
	}

	function drawSelection() {
		if (!selectionGraphics || !viewport) return;
		selectionGraphics.clear();

		const entity = untrack(() => $selectedEntity as Entity | null);
		if (!entity || !('X' in entity) || !('Y' in entity)) return;

		const system = entity as SolarSystem;
		const s = 1 / viewport.scale.x;
		selectionGraphics
			.circle(system.X, system.Y, 18 * s)
			.stroke({ width: 2 * s, color: 0x38bdf8, alpha: 0.8 });
	}

	function updateFocus(currentScale: number) {
		if (!viewport || !app || !$cluster) return;
		const mouseGlobal = app.renderer.events.pointer.global;
		if (!mouseGlobal) return;
		const mouseWorld = viewport.toWorld(mouseGlobal);

		let minDist = Infinity;
		let closest = null;

		// Use spatial grid for faster lookup
		const cellSystems = spatialGrid.getNearby(mouseWorld.x, mouseWorld.y);
		for (const system of cellSystems) {
			const dist = Math.hypot(system.X - mouseWorld.x, system.Y - mouseWorld.y);
			if (dist < minDist) {
				minDist = dist;
				closest = system;
			}
		}

		if (closest) {
			const threshold = currentScale > lastScale * 1.001 ? 0.6 : 0.8;
			if (
				!focusedSystem ||
				closest.Id === focusedSystem.id ||
				minDist <
					Math.hypot(focusedSystem.x - mouseWorld.x, focusedSystem.y - mouseWorld.y) * threshold
			) {
				focusedSystem = { x: closest.X, y: closest.Y, id: closest.Id };
			}
		} else {
			focusedSystem = null;
		}
	}

	function updateZoomLimits() {
		if (!viewport || !$cluster) return;
		const sw = viewport.screenWidth;
		const sh = viewport.screenHeight;
		const scale = viewport.scale.x;

		const visibleHeight = sh - 56;
		const minScale = (0.8 * (Math.min(sw, visibleHeight) / 2)) / Math.max(maxClusterRadius, 100);

		let maxScale = 10;
		if (focusedSystem) {
			maxScale = Math.min(sw, sh) / 2 / 20;
		}

		if (Math.abs(minScale - lastMinScale) > 0.0001 || Math.abs(maxScale - lastMaxScale) > 0.0001) {
			viewport.clampZoom({ minScale, maxScale });
			lastMinScale = minScale;
			lastMaxScale = maxScale;
		}

		const hwx = sw / 2 / scale;
		const hwy = sh / 2 / scale;
		const offY = 28 / scale;

		viewport.clamp({
			left: Math.min(clusterCenter.x - hwx, clusterCenter.x - maxClusterRadius),
			right: Math.max(clusterCenter.x + hwx, clusterCenter.x + maxClusterRadius),
			top: Math.min(clusterCenter.y - offY - hwy, clusterCenter.y - maxClusterRadius - 56 / scale),
			bottom: Math.max(clusterCenter.y - offY + hwy, clusterCenter.y + maxClusterRadius)
		});
	}

	function drawPortals() {
		if (!$cluster || !viewport) return;

		const s = 1 / viewport.scale.x;
		const selectedEntityVal = untrack(() => $selectedEntity) as Entity | null;
		const selectedId = selectedEntityVal?.Id;

		for (const portal of portalNodes) {
			const isHovered = hoveredPortalKey === portal.key;
			const isConnectedToHoveredSystem =
				hoveredSystemId === portal.fromId || hoveredSystemId === portal.toId;
			const isConnectedToSelectedSystem =
				selectedId === portal.fromId || selectedId === portal.toId;

			const isHighlighted = isHovered || isConnectedToHoveredSystem || isConnectedToSelectedSystem;

			const color = isHighlighted ? 0x38bdf8 : 0x334155;
			const alpha = isHighlighted ? 0.8 : 0.5;
			const width = (isHighlighted ? 3 : 2) * s;

			portal.graphics
				.clear()
				.moveTo(portal.fromPos.x, portal.fromPos.y)
				.lineTo(portal.toPos.x, portal.toPos.y)
				.stroke({ width, color, alpha });

			const hitWidth = Math.max(10, 5 / viewport.scale.x);
			// Cache hitArea object if possible, but it depends on viewport scale here
			portal.graphics.hitArea = {
				contains(x: number, y: number) {
					const { x: x1, y: y1 } = portal.fromPos;
					const { x: x2, y: y2 } = portal.toPos;
					const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
					if (L2 === 0) return Math.hypot(x - x1, y - y1) < hitWidth;
					let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2;
					t = Math.max(0, Math.min(1, t));
					const dist = Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)));
					return dist < hitWidth;
				}
			} as PIXI.IHitArea;
		}
	}

	function setClusterReady(ready: boolean) {
		const enableE2EDebug = PUBLIC_E2E === '1' || PUBLIC_E2E === 'true';
		if ((import.meta.env.DEV || enableE2EDebug) && typeof window !== 'undefined') {
			if (ready) {
				queueMicrotask(() => {
					(window as WindowWithDebug).e2eClusterReady = true;
				});
			} else {
				(window as WindowWithDebug).e2eClusterReady = false;
			}
		}
	}

	function calculateClusterBounds() {
		const { center, maxRadius } = SpatialGrid.calculateBounds($cluster?.Systems || []);
		clusterCenter = center;
		maxClusterRadius = maxRadius + 40;
	}

	function createPortals() {
		if (!viewport || !$cluster) return;
		const portals = getUniquePortals($cluster.Systems);

		for (const portal of portals) {
			const sys1 = systemsById.get(portal.from) as SolarSystem | undefined;
			const sys2 = systemsById.get(portal.to) as SolarSystem | undefined;
			if (sys1 && sys2) {
				const g = new PIXI.Graphics();
				g.eventMode = 'static';
				g.cursor = 'pointer';

				g.on('pointerover', () => {
					hoveredPortalKey = portal.key;
					updateScales();
				});
				g.on('pointerout', () => {
					hoveredPortalKey = null;
					updateScales();
				});

				viewport.addChild(g);
				portalNodes.push({
					graphics: g,
					fromId: portal.from,
					toId: portal.to,
					fromPos: { x: sys1.X, y: sys1.Y },
					toPos: { x: sys2.X, y: sys2.Y },
					key: portal.key
				});
			}
		}
	}

	function createSystems() {
		if (!viewport) return;
		for (const system of $cluster?.Systems || []) {
			const node = new PIXI.Graphics();
			node.circle(0, 0, 10).fill(0x38bdf8);

			node.x = system.X;
			node.y = system.Y;
			node.eventMode = 'static';
			node.cursor = 'pointer';

			node.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
				e.stopPropagation();
				selectedEntity.set(system);
			});

			node.on('pointerover', () => {
				hoveredSystemId = system.Id;
				updateScales();
			});

			node.on('pointerout', () => {
				hoveredSystemId = null;
				updateScales();
			});

			let lastClickTime = 0;
			node.on('pointertap', (e: PIXI.FederatedPointerEvent) => {
				e.stopPropagation();
				const now = Date.now();
				if (now - lastClickTime < 350) {
					activeSystemId.set(system.Id);
					viewMode.set('system');
				}
				lastClickTime = now;
			});

			const label = new PIXI.Text({
				text: system.Name,
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
	}

	function renderCluster() {
		if (!$cluster || !viewport) return;

		setClusterReady(false);

		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		systemNodes = [];
		portalNodes = [];

		calculateClusterBounds();
		createPortals();

		selectionGraphics = new PIXI.Graphics();
		viewport.addChild(selectionGraphics);

		hoverGraphics = new PIXI.Graphics();
		viewport.addChild(hoverGraphics);

		createSystems();

		updateScales();
		updateZoomLimits();

		viewport.setZoom(lastMinScale, true);
		viewport.moveCenter(clusterCenter.x, clusterCenter.y - 28 / lastMinScale);

		setClusterReady(true);
	}

	$effect(() => {
		if ($cluster && viewport) {
			// Defer heavy draw to avoid first-frame races while stores settle
			queueMicrotask(() => renderCluster());
		}
	});

	$effect(() => {
		if ($selectedEntity !== undefined) {
			drawSelection();
		}
	});
</script>

<div bind:this={container} data-testid="star-map" class="absolute inset-0"></div>
