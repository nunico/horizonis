<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { cluster } from '../stores/clusterData';
	import { viewMode, activeSystemId, selectedEntity } from '../stores/appState';

	let container: HTMLDivElement;
	let app: PIXI.Application;
	let viewport: Viewport;
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
	let hoveredSystemId: string | null = null;
	let hoveredPortalKey: string | null = null;

	let focusedSystem: { x: number; y: number; id: string } | null = null;
	let lastScale = 1;
	let lastMinScale = 0;
	let lastMaxScale = 0;
	let maxClusterRadius = 0;
	let selectionGraphics: PIXI.Graphics;
	let hoverGraphics: PIXI.Graphics;

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
				updateZoomLimits();
			}
		};
		app.renderer.on('resize', resizeHandler);
		viewport.on('zoomed', () => {
			const currentScale = viewport.scale.x;
			// Use a small epsilon to avoid jitter at limits
			const zoomingIn = currentScale > lastScale * 1.0001;

			updateFocus(currentScale);
			updateZoomLimits();
			updateScales();

			if (zoomingIn && focusedSystem && currentScale > 0.5) {
				const dx = (focusedSystem.x - viewport.center.x) * 0.1;
				const dy = (focusedSystem.y - viewport.center.y) * 0.1;
				viewport.moveCenter(viewport.center.x + dx, viewport.center.y + dy);
			}

			lastScale = currentScale;
		});
		viewport.on('moved', updateScales);

		if (typeof window !== 'undefined') {
			(window as unknown as Record<string, unknown>).starMapDebug = {
				viewport,
				get lastMinScale() {
					return lastMinScale;
				},
				get lastMaxScale() {
					return lastMaxScale;
				},
				updateZoomLimits
			};
		}
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
		drawSystemHighlights();
		drawSelection();
	}

	function drawSystemHighlights() {
		if (!hoverGraphics || !viewport) return;
		hoverGraphics.clear();
		const s = 1 / viewport.scale.x;

		// If a portal is hovered, highlight its systems
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

		// If a system is hovered, highlight it
		if (hoveredSystemId) {
			const system = $cluster?.systems.find((s) => s.id === hoveredSystemId);
			if (system) {
				hoverGraphics
					.circle(system.x, system.y, 14 * s)
					.stroke({ width: 2 * s, color: 0xffffff, alpha: 0.4 });
			}
		}
	}

	function drawSelection() {
		if (!selectionGraphics || !viewport) return;
		selectionGraphics.clear();

		const entity = $selectedEntity;
		if (!entity || !('x' in entity) || !('y' in entity)) return;

		const s = 1 / viewport.scale.x;
		selectionGraphics
			.circle(entity.x, entity.y, 18 * s)
			.stroke({ width: 2 * s, color: 0x38bdf8, alpha: 0.8 });
	}

	function updateFocus(currentScale: number) {
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
			// Hysteresis: only switch focus if the new one is significantly closer
			// than the current one to the mouse, preventing flip-flopping jitter.
			const threshold = currentScale > lastScale * 1.001 ? 0.6 : 0.8;
			if (
				!focusedSystem ||
				closest.id === focusedSystem.id ||
				minDist <
					Math.hypot(focusedSystem.x - mouseWorld.x, focusedSystem.y - mouseWorld.y) * threshold
			) {
				focusedSystem = { x: closest.x, y: closest.y, id: closest.id };
			}
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

		if (Math.abs(minScale - lastMinScale) > 0.0001 || Math.abs(maxScale - lastMaxScale) > 0.0001) {
			viewport.clampZoom({ minScale, maxScale });
			lastMinScale = minScale;
			lastMaxScale = maxScale;
		}

		viewport.clamp({
			direction: 'all',
			underflow: 'center',
			left: -maxClusterRadius,
			right: maxClusterRadius,
			top: -maxClusterRadius,
			bottom: maxClusterRadius
		});
	}

	function drawPortals() {
		if (!$cluster || !viewport) return;

		const s = 1 / viewport.scale.x;
		const selectedId = $selectedEntity?.id;

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

			// Custom hit area for the line
			const hitWidth = Math.max(10, 5 / viewport.scale.x);
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

	function renderCluster() {
		if (!$cluster || !viewport) return;

		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		systemNodes = [];
		portalNodes = [];
		maxClusterRadius = 0;

		// Deduplicate and Create Portal Nodes
		const uniquePortals = new SvelteMap<string, { from: string; to: string }>();
		for (const system of $cluster.systems) {
			for (const portal of system.portals) {
				const id1 = system.id;
				const id2 = portal.target_system_id;
				const key = [id1, id2].sort().join('-');
				if (!uniquePortals.has(key)) {
					uniquePortals.set(key, { from: id1, to: id2 });
				}
			}
		}

		for (const [key, pair] of uniquePortals) {
			const sys1 = $cluster.systems.find((s) => s.id === pair.from);
			const sys2 = $cluster.systems.find((s) => s.id === pair.to);
			if (sys1 && sys2) {
				const g = new PIXI.Graphics();
				g.eventMode = 'static';
				g.cursor = 'pointer';

				g.on('pointerover', () => {
					hoveredPortalKey = key;
					updateScales();
				});
				g.on('pointerout', () => {
					hoveredPortalKey = null;
					updateScales();
				});

				viewport.addChild(g);
				portalNodes.push({
					graphics: g,
					fromId: pair.from,
					toId: pair.to,
					fromPos: { x: sys1.x, y: sys1.y },
					toPos: { x: sys2.x, y: sys2.y },
					key
				});
			}
		}

		// Selection and Hover graphics
		selectionGraphics = new PIXI.Graphics();
		viewport.addChild(selectionGraphics);

		hoverGraphics = new PIXI.Graphics();
		viewport.addChild(hoverGraphics);

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

			node.on('pointerover', () => {
				hoveredSystemId = system.id;
				updateScales();
			});

			node.on('pointerout', () => {
				hoveredSystemId = null;
				updateScales();
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

		// Initial fit
		viewport.setZoom(lastMinScale, true);
		viewport.moveCenter(0, 0);
	}

	$: if ($cluster && viewport) {
		renderCluster();
	}

	$: if ($selectedEntity !== undefined) {
		drawSelection();
	}
</script>

<div bind:this={container} data-testid="star-map" class="w-full h-full"></div>
