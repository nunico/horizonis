<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { invoke } from '@tauri-apps/api/core';
	import { cluster } from '../stores/clusterData';
	import { activeSystemId, viewMode, selectedEntity } from '../stores/appState';
	import type { SolarSystem, OrbitalBody, Star } from '../types/stellar';
	import { auToPixels, getVisualRadius, getClampedScale, type ScaleConfig } from '../pixi/scaling';

	let container: HTMLDivElement;
	let app: PIXI.Application;
	let viewport: Viewport;
	let systemData: SolarSystem | null = null;
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
	let orbitNodes: { graphics: PIXI.Graphics; radius: number }[] = [];

	let scaleConfig: ScaleConfig = { auToPixels: 200, mode: 'log' };
	let focusedObject: {
		id: string;
		worldX: number;
		worldY: number;
		maxSatRadius: number;
		baseRadius: number;
	} | null = null;
	let lastScale = 1;
	let lastMinScale = 0;
	let lastMaxScale = 0;
	let maxSystemRadius = 0;


	onMount(async () => {
		app = new PIXI.Application();
		await app.init({
			resizeTo: container,
			antialias: true,
			backgroundColor: 0x020617
		});
		// eslint-disable-next-line svelte/no-dom-manipulating
		container.appendChild(app.canvas);

		viewport = new Viewport({
			screenWidth: app.screen.width,
			screenHeight: app.screen.height,
			worldWidth: 20000,
			worldHeight: 20000,
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
			// Use a small epsilon to avoid jitter at limits
			const zoomingIn = currentScale > lastScale * 1.0001;

			updateFocus(currentScale);
			updateZoomLimits();
			updateScales();

			if (zoomingIn && focusedObject && currentScale > 0.1) {
				// Smoothly nudge towards focused object instead of using a long snap plugin
				// that fights with the wheel interaction.
				const dx = (focusedObject.worldX - viewport.center.x) * 0.1;
				const dy = (focusedObject.worldY - viewport.center.y) * 0.1;
				viewport.moveCenter(viewport.center.x + dx, viewport.center.y + dy);
			}

			lastScale = currentScale;
		});
		viewport.on('moved', updateScales);

		if ($activeSystemId) {
			// First check if we have the system in the cluster store
			let foundSystem: SolarSystem | undefined;
			cluster.subscribe((c) => {
				if (c) {
					foundSystem = c.systems.find((s) => s.id === $activeSystemId);
				}
			})();

			if (foundSystem) {
				systemData = foundSystem;
				renderSystem();
			} else {
				try {
					systemData = await invoke<SolarSystem>('get_system', { systemId: $activeSystemId });
					renderSystem();
				} catch (e) {
					console.error('Failed to load system:', e);
				}
			}
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

		// 1. Update satellite visibility first
		for (const sat of satelliteContainers) {
			const screenDistance = sat.radius * viewport.scale.x;
			sat.container.visible = screenDistance > 10;
		}

		for (const star of starNodes) {
			// Find min visible satellite orbit for this star
			let minVisibleSatOrbit = Infinity;
			for (const sat of star.star.satellites) {
				const r = auToPixels(sat.orbit_au, scaleConfig);
				if (r * viewport.scale.x > 10) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}
			for (const region of star.star.orbital_regions) {
				const r = auToPixels(region.inner_radius_au, scaleConfig);
				if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
			}

			// Also consider system-wide bodies for the star's clamping if it's at the center
			if (star.star.orbit_au === 0) {
				for (const body of systemData.orbital_bodies) {
					const r = auToPixels(body.orbit_au, scaleConfig);
					if (r * viewport.scale.x > 10) {
						if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
					}
				}
				for (const region of systemData.orbital_regions) {
					const r = auToPixels(region.inner_radius_au, scaleConfig);
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			// Clamp star scale so screen radius doesn't exceed 45% of screen min orbit
			const targetScale = getClampedScale(star.baseRadius, minVisibleSatOrbit, viewport.scale.x);
			star.container.scale.set(targetScale);
			// Keep label readable (scale 1 in screen space)
			star.label.scale.set(s / targetScale);

			visualRadii.set(star.star.id, star.baseRadius * targetScale);
		}

		for (const bodyNode of bodyNodes) {
			// Find min visible satellite orbit for this body
			let minVisibleSatOrbit = Infinity;
			for (const sat of bodyNode.body.satellites) {
				const r = auToPixels(sat.orbit_au, scaleConfig);
				if (r * viewport.scale.x > 10) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			// Avoid overlap with satellites AND parent, and never be bigger than parent
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

			visualRadii.set(bodyNode.body.id, bodyNode.baseRadius * targetScale);
		}

		for (const orbit of orbitNodes) {
			orbit.graphics.clear().circle(0, 0, orbit.radius).stroke({ width: s, color: 0x334155, alpha: 0.4 });
		}
	}

	function getEntityMaxSatRadius(body: OrbitalBody | Star): number {
		let maxR = 0;
		if ('radius_km' in body) {
			maxR = getVisualRadius(body.radius_km);
		} else {
 		// Star radius is radius_sol, convert to km for visual radius logic
 		maxR = getVisualRadius(body.radius_sol * 695700);
		}

		if (body.satellites) {
			for (const sat of body.satellites) {
				const orbitR = auToPixels(sat.orbit_au, scaleConfig);
				const satBoundary = orbitR + getEntityMaxSatRadius(sat);
				if (satBoundary > maxR) maxR = satBoundary;
			}
		}
		if ('orbital_regions' in body && body.orbital_regions) {
			for (const reg of body.orbital_regions) {
				const regR = auToPixels(reg.outer_radius_au, scaleConfig);
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
					id: node.star.id,
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
					id: node.body.id,
					worldX: node.worldX,
					worldY: node.worldY,
					maxSatRadius: node.maxSatRadius,
					baseRadius: node.baseRadius
				};
			}
		}

		if (closest) {
			// Hysteresis: only switch focus if the new one is significantly closer
			// than the current one to the mouse, preventing flip-flopping jitter.
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
		const minViewportSize = Math.min(viewport.screenWidth, viewport.screenHeight);

		// Zoom out limit: outer objects > 60% to center
		const minScale = (0.6 * (minViewportSize / 2)) / Math.max(maxSystemRadius, 100);

		// Zoom in limit: focused object itself occupies at most 80% of viewport
		let maxScale = 50; // Default
		if (focusedObject) {
			maxScale = (minViewportSize * 0.8) / (2 * focusedObject.baseRadius);
		}

		if (
			Math.abs(minScale - lastMinScale) > 0.0001 ||
			Math.abs(maxScale - lastMaxScale) > 0.0001
		) {
			viewport.clampZoom({ minScale, maxScale });
			lastMinScale = minScale;
			lastMaxScale = maxScale;
		}

		if (viewport.scale.x <= minScale * 1.01) {
			viewport.moveCenter(0, 0);
			viewport.plugins.pause('drag');
		} else {
			viewport.plugins.resume('drag');
		}
	}

	function renderSystem() {
		if (!systemData || !viewport) return;
		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		starNodes = [];
		bodyNodes = [];
		satelliteContainers = [];
		orbitNodes = [];
		maxSystemRadius = 0;

		// Render Stars
		systemData.stars.forEach((star, i) => {
			renderStar(star, i, systemData!.stars.length);
		});

		// Render Orbital Bodies (Circumbinary)
		systemData.orbital_bodies.forEach((body, i) => {
			renderBody(body, viewport, i, systemData!.orbital_bodies.length);
		});

		// Render Regions (e.g. Asteroid Belts)
		for (const region of systemData.orbital_regions) {
			const r = new PIXI.Graphics();
			const inner = auToPixels(region.inner_radius_au, scaleConfig);
			const outer = auToPixels(region.outer_radius_au, scaleConfig);

			if (outer > maxSystemRadius) maxSystemRadius = outer;

			// Render as a thick ring
			r.circle(0, 0, outer).stroke({ width: outer - inner, color: 0x475569, alpha: 0.2 });
			viewport.addChild(r);
		}

		updateScales();
		updateZoomLimits();

		// Initial fit: ensure the whole system is visible
		viewport.setZoom(lastMinScale, true);
		viewport.moveCenter(0, 0);

		if (typeof window !== 'undefined') {
			(window as any).solarSystemMapDebug = {
				viewport,
				starNodes,
				bodyNodes,
				scaleConfig,
				get lastMinScale() {
					return lastMinScale;
				},
				get lastMaxScale() {
					return lastMaxScale;
				}
			};
		}
	}

	function renderStar(star: Star, index: number, total: number) {
		const radius = auToPixels(star.orbit_au, scaleConfig);
		const angle = total > 1 ? (index / total) * Math.PI * 2 : 0;
		const worldX = Math.cos(angle) * radius;
		const worldY = Math.sin(angle) * radius;
		const maxSatRadius = getEntityMaxSatRadius(star);

		if (Math.hypot(worldX, worldY) + maxSatRadius > maxSystemRadius) {
			maxSystemRadius = Math.hypot(worldX, worldY) + maxSatRadius;
		}

		const orbitContainer = new PIXI.Container();
		viewport.addChild(orbitContainer);

		if (star.orbit_au > 0) {
			const orbit = new PIXI.Graphics();
			const s = 1 / viewport.scale.x;
			orbit.circle(0, 0, radius).stroke({ width: s, color: 0x334155, alpha: 0.4 });
			orbitContainer.addChild(orbit);
			orbitNodes.push({ graphics: orbit, radius });
		}

		const starCenter = new PIXI.Container();
		starCenter.x = worldX;
		starCenter.y = worldY;
		orbitContainer.addChild(starCenter);

		const starVisual = new PIXI.Container();
		starCenter.addChild(starVisual);

		const g = new PIXI.Graphics();
		const color = star.spectral_class.startsWith('G')
			? 0xfde047
			: star.spectral_class.startsWith('M')
				? 0xf97316
				: 0x38bdf8;
		const baseRadius = getVisualRadius(star.radius_sol * 695700);
		g.circle(0, 0, baseRadius).fill(color);
		starVisual.addChild(g);

		starVisual.eventMode = 'static';
		starVisual.cursor = 'pointer';
		starVisual.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(star);
		});

		// Label for star
		const label = new PIXI.Text({
			text: star.name,
			style: { fontFamily: 'sans-serif', fontSize: 14, fill: 0xf1f5f9 }
		});
		label.anchor.set(0.5, 0);
		label.y = baseRadius + 5;
		starVisual.addChild(label);

		starNodes.push({ container: starVisual, label, baseRadius, star, worldX, worldY, maxSatRadius });

		// Render star's satellites
		star.satellites.forEach((body, i) => {
			renderBody(body, starCenter, i, star.satellites.length, worldX, worldY, star.id);
		});

		// Render star's regions
		for (const region of star.orbital_regions) {
			const r = new PIXI.Graphics();
			const inner = auToPixels(region.inner_radius_au, scaleConfig);
			const outer = auToPixels(region.outer_radius_au, scaleConfig);
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
		const radius = auToPixels(body.orbit_au, scaleConfig);
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

		// Orbit Path
		const orbit = new PIXI.Graphics();
		const s = 1 / viewport.scale.x;
		orbit.circle(0, 0, radius).stroke({ width: s, color: 0x334155, alpha: 0.4 });
		orbitContainer.addChild(orbit);
		orbitNodes.push({ graphics: orbit, radius });

		// The Body Node
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
		const baseRadius = getVisualRadius(body.radius_km);
		g.circle(0, 0, baseRadius).fill(colors[body.body_type] || 0xffffff);
		bodyVisual.addChild(g);

		bodyVisual.eventMode = 'static';
		bodyVisual.cursor = 'pointer';
		bodyVisual.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(body);
		});

		// Label
		const label = new PIXI.Text({
			text: body.name,
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

		// Recursive Satellites (Moons)
		body.satellites.forEach((satellite, i) => {
			renderBody(satellite, bodyCenter, i, body.satellites.length, worldX, worldY, body.id);
		});
	}

	function setMode(mode: 'linear' | 'log') {
		scaleConfig.mode = mode;
		renderSystem();
	}
</script>

<div class="w-full h-full relative" data-testid="solar-system-view">
	<div bind:this={container} data-testid="solar-system-map" class="w-full h-full"></div>
	<div class="absolute top-4 left-4 flex gap-2">
		<button
			class="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 border border-slate-700 transition-colors"
			on:click={() => viewMode.set('cluster')}
		>
			Back to Cluster
		</button>
		<div class="bg-slate-800 p-1 rounded-lg border border-slate-700 flex gap-1">
			<button
				class="px-3 py-1 rounded-md text-sm transition-colors {scaleConfig.mode === 'linear'
					? 'bg-sky-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
				on:click={() => setMode('linear')}>Linear</button
			>
			<button
				class="px-3 py-1 rounded-md text-sm transition-colors {scaleConfig.mode === 'log'
					? 'bg-sky-600 text-white'
					: 'text-slate-400 hover:text-slate-200'}"
				on:click={() => setMode('log')}>Log</button
			>
		</div>
	</div>
	{#if systemData}
		<div class="absolute bottom-4 left-4 pointer-events-none">
			<h1 class="text-3xl font-bold text-slate-100 tracking-tight">{systemData.name} System</h1>
			<p class="text-slate-500 uppercase text-xs tracking-widest font-semibold mt-1">
				Solar Scale: {scaleConfig.mode}
			</p>
		</div>
	{/if}
</div>
