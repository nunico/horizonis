<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { cluster } from '../stores/clusterData';
	import { activeSystemId, viewMode, selectedEntity } from '../stores/appState';
	import type { SolarSystem, OrbitalBody, Star } from '../types/stellar';
	import { auToPixels, getVisualRadius, getClampedScale, type ScaleConfig } from '../pixi/scaling';

	let container = $state<HTMLDivElement>();
	let app = $state<PIXI.Application>();
	let viewport = $state<Viewport>();
	let systemData = $state<SolarSystem | null>(null);
	let resizeHandler: () => void;
	let starNodes: {
		container: PIXI.Container;
		label: PIXI.Text;
		baseRadius: number;
		star: Star;
		worldX: number;
		worldY: number;
		maxSatRadius: number;
	}[] = [];
	let bodyNodes: {
		container: PIXI.Container;
		label: PIXI.Text;
		baseRadius: number;
		body: OrbitalBody;
		orbitRadiusWorld: number;
		worldX: number;
		worldY: number;
		maxSatRadius: number;
		parentId?: string;
	}[] = [];
	let satelliteContainers: { container: PIXI.Container; radius: number }[] = [];
	let orbitNodes: { graphics: PIXI.Graphics; radius: number; entityId: string }[] = [];
	let hoveredEntityId = $state<string | null>(null);

	let scaleConfig = $state<ScaleConfig>({ auToPixels: 200, mode: 'log' });
	let focusedObject = $state<{
		id: string;
		worldX: number;
		worldY: number;
		maxSatRadius: number;
		baseRadius: number;
	} | null>(null);
	let lastScale = 1;
	let lastMinScale = 0;
	let lastMaxScale = 0;
	let maxSystemRadius = 0;
	let selectionGraphics: PIXI.Graphics;
	let hoverGraphics: PIXI.Graphics;

	onMount(async () => {
		if (!container) return;
		const pixiApp = new PIXI.Application();
		await pixiApp.init({
			resizeTo: container,
			antialias: true,
			backgroundColor: 0x020617
		});
		app = pixiApp;
		container.appendChild(pixiApp.canvas);

		const v = new Viewport({
			screenWidth: pixiApp.screen.width,
			screenHeight: pixiApp.screen.height,
			worldWidth: 100000,
			worldHeight: 100000,
			events: pixiApp.renderer.events
		});

		viewport = v;

		pixiApp.stage.addChild(v);
		v.drag().pinch().wheel().decelerate();
		v.moveCenter(0, 0);

		resizeHandler = () => {
			if (v && pixiApp.renderer) {
				v.resize(pixiApp.screen.width, pixiApp.screen.height);
				updateZoomLimits();
			}
		};
		pixiApp.renderer.on('resize', resizeHandler);
		v.on('zoomed', () => {
			const currentScale = v.scale.x;
			const zoomingIn = currentScale > lastScale * 1.0001;

			updateFocus(currentScale);
			updateZoomLimits();
			updateScales();

			if (zoomingIn && focusedObject && currentScale > 0.1) {
				const dx = (focusedObject.worldX - v.center.x) * 0.1;
				const dy = (focusedObject.worldY - v.center.y) * 0.1;
				v.moveCenter(v.center.x + dx, v.center.y + dy);
			}

			lastScale = currentScale;
		});
		v.on('moved', updateScales);

		if (import.meta.env.DEV && typeof window !== 'undefined') {
			(window as any).solarSystemDebug = {
				viewport: v,
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
		if (!viewport || !systemData) return;
		const s = 1 / viewport.scale.x;
		const visualRadii = new Map<string, number>();

		for (const sat of satelliteContainers) {
			const screenDistance = sat.radius * viewport.scale.x;
			sat.container.visible = screenDistance > 10;
		}

		for (const star of starNodes) {
			let minVisibleSatOrbit = Infinity;
			for (const sat of star.star.Satellites) {
				const r = auToPixels(sat.OrbitAu, scaleConfig);
				if (r * viewport.scale.x > 10) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}
			for (const region of star.star.OrbitalRegions) {
				const r = auToPixels(region.InnerRadiusAu, scaleConfig);
				if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
			}

			if (star.star.OrbitAu === 0) {
				for (const body of systemData.OrbitalBodies) {
					const r = auToPixels(body.OrbitAu, scaleConfig);
					if (r * viewport.scale.x > 10) {
						if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
					}
				}
				for (const region of systemData.OrbitalRegions) {
					const r = auToPixels(region.InnerRadiusAu, scaleConfig);
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			const targetScale = getClampedScale(star.baseRadius, minVisibleSatOrbit, viewport.scale.x);
			star.container.scale.set(targetScale);
			star.label.scale.set(s / targetScale);

			visualRadii.set(star.star.Id, star.baseRadius * targetScale);
		}

		for (const bodyNode of bodyNodes) {
			let minVisibleSatOrbit = Infinity;
			for (const sat of bodyNode.body.Satellites) {
				const r = auToPixels(sat.OrbitAu, scaleConfig);
				if (r * viewport.scale.x > 10) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			const parentVisRadius = bodyNode.parentId ? visualRadii.get(bodyNode.parentId) : undefined;
			const targetScale = getClampedScale(
				bodyNode.baseRadius,
				minVisibleSatOrbit,
				viewport.scale.x,
				bodyNode.orbitRadiusWorld,
				parentVisRadius
			);

			bodyNode.container.scale.set(targetScale);
			bodyNode.label.scale.set(s / targetScale);

			visualRadii.set(bodyNode.body.Id, bodyNode.baseRadius * targetScale);
		}

		for (const orbit of orbitNodes) {
			const isHovered = hoveredEntityId === orbit.entityId;
			const isSelected = ($selectedEntity as any)?.Id === orbit.entityId;
			const color = isSelected ? 0x38bdf8 : isHovered ? 0xf1f5f9 : 0x334155;
			const alpha = isSelected || isHovered ? 0.8 : 0.4;
			const width = (isSelected || isHovered ? 2 : 1) * s;

			orbit.graphics.clear().circle(0, 0, orbit.radius).stroke({ width, color, alpha });

			const hitWidth = Math.max(10, 5 / viewport.scale.x);
			orbit.graphics.hitArea = {
				contains(x: number, y: number) {
					const dist = Math.hypot(x, y);
					return Math.abs(dist - orbit.radius) < hitWidth;
				}
			} as PIXI.IHitArea;
		}
		drawSelection();
	}

	function drawSelection() {
		if (!selectionGraphics || !viewport) return;
		selectionGraphics.clear();

		const entity: any = $selectedEntity;
		if (!entity) return;

		let worldX = 0;
		let worldY = 0;
		let radius = 0;

		const starNode = starNodes.find((n) => n.star.Id === entity.Id);
		if (starNode) {
			worldX = starNode.worldX;
			worldY = starNode.worldY;
			radius = starNode.baseRadius * starNode.container.scale.x;
		} else {
			const bodyNode = bodyNodes.find((n) => n.body.Id === entity.Id);
			if (bodyNode) {
				worldX = bodyNode.worldX;
				worldY = bodyNode.worldY;
				radius = bodyNode.baseRadius * bodyNode.container.scale.x;
			}
		}

		if (radius > 0) {
			const s = 1 / viewport.scale.x;
			selectionGraphics
				.circle(worldX, worldY, radius + 8 * s)
				.stroke({ width: 2 * s, color: 0x38bdf8, alpha: 0.8 });
		}
	}

	function getEntityMaxSatRadius(body: OrbitalBody | Star): number {
		let maxR: number;
		if ('RadiusKm' in body) {
			maxR = getVisualRadius(body.RadiusKm);
		} else {
			maxR = getVisualRadius(body.RadiusSol * 695700);
		}

		if (body.Satellites) {
			for (const sat of body.Satellites) {
				const orbitR = auToPixels(sat.OrbitAu, scaleConfig);
				const satBoundary = orbitR + getEntityMaxSatRadius(sat);
				if (satBoundary > maxR) maxR = satBoundary;
			}
		}
		if ('OrbitalRegions' in body && body.OrbitalRegions) {
			for (const reg of body.OrbitalRegions) {
				const regR = auToPixels(reg.OuterRadiusAu, scaleConfig);
				if (regR > maxR) maxR = regR;
			}
		}
		return maxR;
	}

	function updateFocus(currentScale: number) {
		if (!viewport || !app) return;
		const mouseGlobal = app.renderer.events.pointer.global;
		if (!mouseGlobal) return;
		const mouseWorld = viewport.toWorld(mouseGlobal);

		let minDist = Infinity;
		let closest: {
			id: string;
			worldX: number;
			worldY: number;
			maxSatRadius: number;
			baseRadius: number;
		} | null = null;

		for (const node of starNodes) {
			const dist = Math.hypot(node.worldX - mouseWorld.x, node.worldY - mouseWorld.y);
			if (dist < minDist) {
				minDist = dist;
				closest = {
					id: node.star.Id,
					worldX: node.worldX,
					worldY: node.worldY,
					maxSatRadius: node.maxSatRadius,
					baseRadius: node.baseRadius
				};
			}
		}
		for (const node of bodyNodes) {
			const dist = Math.hypot(node.worldX - mouseWorld.x, node.worldY - mouseWorld.y);
			if (dist < minDist) {
				minDist = dist;
				closest = {
					id: node.body.Id,
					worldX: node.worldX,
					worldY: node.worldY,
					maxSatRadius: node.maxSatRadius,
					baseRadius: node.baseRadius
				};
			}
		}

		if (closest) {
			const threshold = currentScale > lastScale * 1.001 ? 0.5 : 0.8;
			if (
				!focusedObject ||
				closest.id === focusedObject.id ||
				minDist <
					Math.hypot(focusedObject.worldX - mouseWorld.x, focusedObject.worldY - mouseWorld.y) *
						threshold
			) {
				focusedObject = closest;
			}
		} else {
			focusedObject = null;
		}
	}

	function updateZoomLimits() {
		if (!viewport || !systemData) return;
		const sw = viewport.screenWidth;
		const sh = viewport.screenHeight;
		const scale = viewport.scale.x;

		const visibleHeight = sh - 56;
		const minScale = (0.8 * (Math.min(sw, visibleHeight) / 2)) / Math.max(maxSystemRadius, 100);

		let maxScale = 50;
		if (focusedObject) {
			maxScale = (Math.min(sw, sh) * 0.8) / (2 * focusedObject.baseRadius);
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
			left: Math.min(0 - hwx, -maxSystemRadius),
			right: Math.max(0 + hwx, maxSystemRadius),
			top: Math.min(0 - offY - hwy, -maxSystemRadius - 56 / scale),
			bottom: Math.max(0 - offY + hwy, maxSystemRadius)
		});
	}

	function renderSystem() {
		const v = viewport;
		if (!systemData || !v) return;
		v.removeChildren().forEach((child) => child.destroy({ children: true }));
		starNodes = [];
		bodyNodes = [];
		satelliteContainers = [];
		orbitNodes = [];
		maxSystemRadius = 0;

		selectionGraphics = new PIXI.Graphics();
		v.addChild(selectionGraphics);

		hoverGraphics = new PIXI.Graphics();
		v.addChild(hoverGraphics);

		systemData.Stars.forEach((star, i) => {
			renderStar(star, i, systemData!.Stars.length);
		});

		systemData.OrbitalBodies.forEach((body, i) => {
			renderBody(body, v, i, systemData!.OrbitalBodies.length);
		});

		for (const region of systemData.OrbitalRegions) {
			const r = new PIXI.Graphics();
			const inner = auToPixels(region.InnerRadiusAu, scaleConfig);
			const outer = auToPixels(region.OuterRadiusAu, scaleConfig);

			if (outer > maxSystemRadius) maxSystemRadius = outer;

			r.circle(0, 0, outer).stroke({ width: outer - inner, color: 0x475569, alpha: 0.2 });
			v.addChild(r);
		}

		updateScales();
		updateZoomLimits();

		v.setZoom(lastMinScale, true);
		v.moveCenter(0, 0 - 28 / lastMinScale);

		if (import.meta.env.DEV && typeof window !== 'undefined') {
			(window as any).solarSystemMapDebug = {
				viewport: v,
				starNodes,
				bodyNodes,
				scaleConfig,
				get lastMinScale() { return lastMinScale; },
				get lastMaxScale() { return lastMaxScale; }
			};
		}
	}

	function renderStar(star: Star, index: number, total: number) {
		const radius = auToPixels(star.OrbitAu, scaleConfig);
		const angle = total > 1 ? (index / total) * Math.PI * 2 : 0;
		const worldX = Math.cos(angle) * radius;
		const worldY = Math.sin(angle) * radius;
		const maxSatRadius = getEntityMaxSatRadius(star);

		if (Math.hypot(worldX, worldY) + maxSatRadius > maxSystemRadius) {
			maxSystemRadius = Math.hypot(worldX, worldY) + maxSatRadius;
		}

		const v = viewport;
		if (!v) return;
		const orbitContainer = new PIXI.Container();
		v.addChild(orbitContainer);

		if (star.OrbitAu > 0) {
			const orbit = new PIXI.Graphics();
			orbit.eventMode = 'static';
			orbit.cursor = 'pointer';
			orbit.on('pointerover', () => {
				hoveredEntityId = star.Id;
				updateScales();
			});
			orbit.on('pointerout', () => {
				hoveredEntityId = null;
				updateScales();
			});
			orbit.on('pointerdown', (e) => {
				e.stopPropagation();
				selectedEntity.set(star);
			});

			orbitContainer.addChild(orbit);
			orbitNodes.push({ graphics: orbit, radius, entityId: star.Id });
		}

		const starCenter = new PIXI.Container();
		starCenter.x = worldX;
		starCenter.y = worldY;
		orbitContainer.addChild(starCenter);

		const starVisual = new PIXI.Container();
		starCenter.addChild(starVisual);

		const g = new PIXI.Graphics();
		const color = star.SpectralClass.startsWith('G')
			? 0xfde047
			: star.SpectralClass.startsWith('M')
				? 0xf97316
				: 0x38bdf8;
		const baseRadius = getVisualRadius(star.RadiusSol * 695700);
		g.circle(0, 0, baseRadius).fill(color);
		starVisual.addChild(g);

		starVisual.eventMode = 'static';
		starVisual.cursor = 'pointer';
		starVisual.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(star);
		});

		starVisual.on('pointerover', () => {
			hoveredEntityId = star.Id;
			updateScales();
			if (!viewport) return;
			const s = 1 / viewport.scale.x;
			hoverGraphics
				.clear()
				.circle(worldX, worldY, baseRadius * starVisual.scale.x + 4 * s)
				.stroke({ width: 2 * s, color: 0xffffff, alpha: 0.4 });
		});

		starVisual.on('pointerout', () => {
			hoveredEntityId = null;
			updateScales();
			hoverGraphics.clear();
		});

		const label = new PIXI.Text({
			text: star.Name,
			style: { fontFamily: 'sans-serif', fontSize: 14, fill: 0xf1f5f9 }
		});
		label.anchor.set(0.5, 0);
		label.y = baseRadius + 5;
		starVisual.addChild(label);

		starNodes.push({
			container: starVisual,
			label,
			baseRadius,
			star,
			worldX,
			worldY,
			maxSatRadius
		});

		star.Satellites.forEach((body, i) => {
			renderBody(body, starCenter, i, star.Satellites.length, worldX, worldY, star.Id);
		});

		for (const region of star.OrbitalRegions) {
			const r = new PIXI.Graphics();
			const inner = auToPixels(region.InnerRadiusAu, scaleConfig);
			const outer = auToPixels(region.OuterRadiusAu, scaleConfig);
			r.circle(0, 0, outer).stroke({ width: outer - inner, color: 0x475569, alpha: 0.2 });
			starCenter.addChild(r);
		}
	}

	function renderBody(
		body: OrbitalBody,
		parent: PIXI.Container,
		index: number,
		total: number,
		parentX = 0,
		parentY = 0,
		parentId?: string
	) {
		const radius = auToPixels(body.OrbitAu, scaleConfig);
		const angle = total > 1 ? (index / total) * Math.PI * 2 : 0;
		const worldX = parentX + Math.cos(angle) * radius;
		const worldY = parentY + Math.sin(angle) * radius;
		const maxSatRadius = getEntityMaxSatRadius(body);

		if (Math.hypot(worldX, worldY) + maxSatRadius > maxSystemRadius) {
			maxSystemRadius = Math.hypot(worldX, worldY) + maxSatRadius;
		}

		const orbitContainer = new PIXI.Container();
		parent.addChild(orbitContainer);

		if (parent !== viewport) {
			satelliteContainers.push({ container: orbitContainer, radius });
		}

		const orbit = new PIXI.Graphics();
		orbit.eventMode = 'static';
		orbit.cursor = 'pointer';
		orbit.on('pointerover', () => {
			hoveredEntityId = body.Id;
			updateScales();
		});
		orbit.on('pointerout', () => {
			hoveredEntityId = null;
			updateScales();
		});
		orbit.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(body);
		});

		orbitContainer.addChild(orbit);
		orbitNodes.push({ graphics: orbit, radius, entityId: body.Id });

		const bodyCenter = new PIXI.Container();
		bodyCenter.x = Math.cos(angle) * radius;
		bodyCenter.y = Math.sin(angle) * radius;
		orbitContainer.addChild(bodyCenter);

		const bodyVisual = new PIXI.Container();
		bodyCenter.addChild(bodyVisual);

		const g = new PIXI.Graphics();
		const colors: Record<string, number> = {
			Planet: 0x60a5fa,
			Moon: 0x94a3b8,
			SpaceStation: 0xec4899,
			DwarfPlanet: 0xa78bfa,
			Comet: 0x2dd4bf
		};
		const baseRadius = getVisualRadius(body.RadiusKm);
		g.circle(0, 0, baseRadius).fill(colors[body.BodyType] || 0xffffff);
		bodyVisual.addChild(g);

		bodyVisual.eventMode = 'static';
		bodyVisual.cursor = 'pointer';
		bodyVisual.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(body);
		});

		bodyVisual.on('pointerover', () => {
			hoveredEntityId = body.Id;
			updateScales();
			if (!viewport) return;
			const s = 1 / viewport.scale.x;
			hoverGraphics
				.clear()
				.circle(worldX, worldY, baseRadius * bodyVisual.scale.x + 4 * s)
				.stroke({ width: 2 * s, color: 0xffffff, alpha: 0.4 });
		});

		bodyVisual.on('pointerout', () => {
			hoveredEntityId = null;
			updateScales();
			hoverGraphics.clear();
		});

		const label = new PIXI.Text({
			text: body.Name,
			style: { fontFamily: 'sans-serif', fontSize: 12, fill: 0x94a3b8 }
		});
		label.anchor.set(0.5, 0);
		label.y = baseRadius + 4;
		bodyVisual.addChild(label);

		bodyNodes.push({
			container: bodyVisual,
			label,
			baseRadius,
			body,
			orbitRadiusWorld: radius,
			worldX,
			worldY,
			maxSatRadius,
			parentId
		});

		body.Satellites.forEach((satellite, i) => {
			renderBody(satellite, bodyCenter, i, body.Satellites.length, worldX, worldY, body.Id);
		});
	}

	function setMode(mode: 'linear' | 'log') {
		scaleConfig.mode = mode;
		renderSystem();
	}

	$effect(() => {
		if ($activeSystemId && $cluster && viewport) {
			const found = $cluster.Systems.find((s) => s.Id === $activeSystemId);
			if (found) {
				systemData = found;
				renderSystem();
			}
		}
	});

	$effect(() => {
		if ($selectedEntity !== undefined) {
			drawSelection();
		}
	});
</script>

<div class="w-full h-full relative" data-testid="solar-system-view">
	<div bind:this={container} data-testid="solar-system-map" class="w-full h-full"></div>
	<div class="absolute top-4 left-4 flex gap-2">
		<button
			class="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
			onclick={() => viewMode.set('cluster')}
		>
			Back to Cluster
		</button>
		<div class="bg-slate-800 p-1 rounded-lg border border-slate-700 flex gap-1">
			<button
				class="px-3 py-1 rounded-md text-sm transition-colors {scaleConfig.mode === 'linear'
					? 'bg-sky-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
				onclick={() => setMode('linear')}>Linear</button
			>
			<button
				class="px-3 py-1 rounded-md text-sm transition-colors {scaleConfig.mode === 'log'
					? 'bg-sky-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
				onclick={() => setMode('log')}>Log</button
			>
		</div>
	</div>
	{#if systemData}
		<div class="absolute bottom-4 left-4 pointer-events-none">
			<h1 class="text-3xl font-bold text-slate-100 tracking-tight">{systemData.Name} System</h1>
			<p class="text-slate-500 uppercase text-xs tracking-widest font-semibold mt-1">
				Solar Scale: {scaleConfig.mode}
			</p>
		</div>
	{/if}
</div>
