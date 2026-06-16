<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { cluster, saveCluster } from '$lib/stores/clusterData';
	import { viewMode, activeSystemId, selectedEntity, type Entity } from '$lib/stores/appState';
	import type { SolarSystem } from '$lib/types/stellar';
	import { SpatialGrid } from '$lib/utils/spatial';
	import { getUniquePortals } from '$lib/utils/stellar';
	import { setupPixi } from '$lib/pixi/setup';
	import { MAP_COLORS, LAYOUT, INTERACTION } from '$lib/theme';
	import { recordSnapshot } from '$lib/stores/history';
	import { exceedsDragThreshold } from '$lib/utils/drag';
	import { isE2EDebugEnabled } from '$lib/utils/e2e';

	type WindowWithDebug = Window & {
		starMapDebug?: {
			viewport: Viewport;
		};
		e2eClusterReady?: boolean;
	};

	let container = $state<HTMLDivElement>();
	let app = $state<PIXI.Application>();
	let viewport = $state<Viewport>();
	let isDragging = $state(false);
	let draggedSystemId = $state<string | null>(null);
	let dragStartGlobal = { x: 0, y: 0 };
	let resizeHandler: () => void;
	// Imperative PIXI node lookups (not used in reactive contexts); SvelteMap
	// satisfies the prefer-svelte-reactivity rule without changing semantics.
	let systemNodesById = new SvelteMap<string, PIXI.Graphics & { systemId: string }>();
	let portalsBySystemId = new SvelteMap<string, typeof portalNodes>();
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
	let spatialGrid = $derived(new SpatialGrid($cluster?.Systems || [], LAYOUT.spatialGridSize));

	onMount(async () => {
		if (!container) return;
		const pixiApp = new PIXI.Application();
		app = pixiApp;
		try {
			const setup = await setupPixi({ container, app: pixiApp }, updateZoomLimits);
			viewport = setup.viewport;
			resizeHandler = setup.resizeHandler;

			setup.viewport.on('zoomed', () => {
				const currentScale = setup.viewport.scale.x;

				// Track the nearest system (used for zoom-limit clamping) but let
				// pixi-viewport's wheel zoom-to-cursor drive the camera — nudging
				// the center here made the map feel like it was fighting the user.
				updateFocus(currentScale);
				updateZoomLimits();
				updateScales();

				lastScale = currentScale;
			});
			setup.viewport.on('moved', updateScales);

			setup.viewport.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
				if (!draggedSystemId || !viewport) return;

				// Promote the press into a drag only once the pointer travels past
				// the threshold, so a plain click selects without nudging the node.
				if (!isDragging) {
					if (!exceedsDragThreshold(dragStartGlobal, e.global, INTERACTION.dragThresholdPx)) {
						return;
					}
					isDragging = true;
					viewport.plugins.pause('drag');
					const draggedNode = systemNodesById.get(draggedSystemId);
					if (draggedNode) {
						draggedNode.cursor = 'grabbing';
						draggedNode.alpha = 0.7;
					}
				}

				const worldPos = viewport.toWorld(e.global);

				const node = systemNodesById.get(draggedSystemId);
				if (node) {
					node.x = worldPos.x;
					node.y = worldPos.y;
				}

				const relatedPortals = portalsBySystemId.get(draggedSystemId) || [];
				for (const portal of relatedPortals) {
					if (portal.fromId === draggedSystemId) {
						portal.fromPos = { x: worldPos.x, y: worldPos.y };
					} else if (portal.toId === draggedSystemId) {
						portal.toPos = { x: worldPos.x, y: worldPos.y };
					}
				}

				drawPortals();
				drawSystemHighlights();
				drawSelection();
			});

			const endDrag = async () => {
				// A press that never crossed the drag threshold is just a click/select.
				if (!isDragging || !draggedSystemId || !viewport || !$cluster) {
					const pressedNode = draggedSystemId
						? systemNodesById.get(draggedSystemId)
						: undefined;
					if (pressedNode) {
						pressedNode.cursor = 'pointer';
						pressedNode.alpha = 1;
					}
					isDragging = false;
					draggedSystemId = null;
					if (viewport) viewport.plugins.resume('drag');
					return;
				}

				const node = systemNodesById.get(draggedSystemId);
				if (node) {
					const newCluster = structuredClone($cluster);
					const system = newCluster.Systems.find((s) => s.Id === draggedSystemId);
					if (system && (system.X !== node.x || system.Y !== node.y)) {
						recordSnapshot($cluster);
						system.X = node.x;
						system.Y = node.y;
						await saveCluster(newCluster);
					}
					node.cursor = 'pointer';
					node.alpha = 1;
				}

				isDragging = false;
				draggedSystemId = null;
				viewport.plugins.resume('drag');

				drawPortals();
				drawSystemHighlights();
				drawSelection();
			};

			setup.viewport.on('pointerup', endDrag);
			setup.viewport.on('pointerupoutside', endDrag);

			if (isE2EDebugEnabled()) {
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
		for (const node of systemNodesById.values()) {
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
						.stroke({ width: 2 * s, color: MAP_COLORS.hover, alpha: 0.6 });
				});
			}
		}

		if (hoveredSystemId) {
			const system = systemsById.get(hoveredSystemId);
			if (system) {
				let x = (system as SolarSystem).X;
				let y = (system as SolarSystem).Y;
				if (isDragging && draggedSystemId === hoveredSystemId) {
					const node = systemNodesById.get(hoveredSystemId);
					if (node) {
						x = node.x;
						y = node.y;
					}
				}
				hoverGraphics.circle(x, y, 14 * s).stroke({ width: 2 * s, color: MAP_COLORS.hover, alpha: 0.4 });
			}
		}
	}

	function drawSelection() {
		if (!selectionGraphics || !viewport) return;
		selectionGraphics.clear();

		const entity = untrack(() => $selectedEntity as Entity | null);
		if (!entity || !('X' in entity) || !('Y' in entity)) return;

		const system = entity as SolarSystem;
		let x = system.X;
		let y = system.Y;
		if (isDragging && draggedSystemId === system.Id) {
			const node = systemNodesById.get(system.Id);
			if (node) {
				x = node.x;
				y = node.y;
			}
		}

		const s = 1 / viewport.scale.x;
		selectionGraphics.circle(x, y, 18 * s).stroke({ width: 2 * s, color: MAP_COLORS.accent, alpha: 0.8 });
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

		const visibleHeight = sh - LAYOUT.navbarHeightPx;
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
			top: Math.min(
				clusterCenter.y - offY - hwy,
				clusterCenter.y - maxClusterRadius - LAYOUT.navbarHeightPx / scale
			),
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

			const color = isHighlighted ? MAP_COLORS.accent : MAP_COLORS.linkIdle;
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
		if (isE2EDebugEnabled()) {
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
				g.zIndex = 0;

				g.on('pointerover', () => {
					hoveredPortalKey = portal.key;
					updateScales();
				});
				g.on('pointerout', () => {
					hoveredPortalKey = null;
					updateScales();
				});

				viewport.addChild(g);
				const pNode = {
					graphics: g,
					fromId: portal.from,
					toId: portal.to,
					fromPos: { x: sys1.X, y: sys1.Y },
					toPos: { x: sys2.X, y: sys2.Y },
					key: portal.key
				};
				portalNodes.push(pNode);

				if (!portalsBySystemId.has(portal.from)) portalsBySystemId.set(portal.from, []);
				if (!portalsBySystemId.has(portal.to)) portalsBySystemId.set(portal.to, []);
				portalsBySystemId.get(portal.from)!.push(pNode);
				portalsBySystemId.get(portal.to)!.push(pNode);
			}
		}
	}

	function createSystems() {
		if (!viewport) return;
		for (const system of $cluster?.Systems || []) {
			const node = new PIXI.Graphics() as PIXI.Graphics & { systemId: string };
			node.systemId = system.Id;
			node.zIndex = 10;
			node.circle(0, 0, 10).fill(MAP_COLORS.systemFill);

			node.x = system.X;
			node.y = system.Y;
			node.eventMode = 'static';
			node.cursor = 'pointer';

			node.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
				e.stopPropagation();
				selectedEntity.set(system);

				// Arm a potential drag; it only begins once the pointer moves past
				// the threshold (see the viewport pointermove handler).
				draggedSystemId = system.Id;
				dragStartGlobal = { x: e.global.x, y: e.global.y };
				isDragging = false;
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
				if (now - lastClickTime < INTERACTION.doubleClickMs) {
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
					fill: MAP_COLORS.labelPrimary
				}
			});
			label.anchor.set(0.5, 0);
			label.y = 15;
			node.addChild(label);

			systemNodesById.set(system.Id, node);
			viewport.addChild(node);
		}
	}

	function renderCluster(resetCamera = true) {
		if (!$cluster || !viewport) return;

		const prevCenter = resetCamera ? null : { x: viewport.center.x, y: viewport.center.y };
		const prevZoom = resetCamera ? null : viewport.scale.x;

		setClusterReady(false);

		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		systemNodesById.clear();
		portalsBySystemId.clear();
		portalNodes = [];

		// Explicit layering so system nodes and their labels always sit above
		// portal/selection/hover graphics regardless of add order.
		viewport.sortableChildren = true;

		calculateClusterBounds();
		createPortals();

		selectionGraphics = new PIXI.Graphics();
		selectionGraphics.zIndex = 1;
		viewport.addChild(selectionGraphics);

		hoverGraphics = new PIXI.Graphics();
		hoverGraphics.zIndex = 2;
		viewport.addChild(hoverGraphics);

		createSystems();

		updateScales();
		updateZoomLimits();

		if (resetCamera) {
			viewport.setZoom(lastMinScale, true);
			viewport.moveCenter(clusterCenter.x, clusterCenter.y - 28 / lastMinScale);
		} else if (prevCenter && prevZoom !== null) {
			viewport.setZoom(prevZoom);
			viewport.moveCenter(prevCenter.x, prevCenter.y);
		}

		setClusterReady(true);
	}

	let lastClusterName: string | null = null;

	$effect(() => {
		if ($cluster && viewport) {
			const name = $cluster.Name;
			const shouldReset = name !== lastClusterName;
			lastClusterName = name;
			// Defer heavy draw to avoid first-frame races while stores settle
			queueMicrotask(() => renderCluster(shouldReset));
		}
	});

	$effect(() => {
		if ($selectedEntity !== undefined) {
			drawSelection();
		}
	});
</script>

<div bind:this={container} data-testid="star-map" class="absolute inset-0"></div>
