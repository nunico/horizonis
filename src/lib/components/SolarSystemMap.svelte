<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { invoke } from '@tauri-apps/api/core';
	import { cluster } from '../stores/clusterData';
	import { activeSystemId, viewMode, selectedEntity } from '../stores/appState';
	import type { SolarSystem, OrbitalBody, Star } from '../types/stellar';
	import { auToPixels, type ScaleConfig } from '../pixi/scaling';

	let container: HTMLDivElement;
	let app: PIXI.Application;
	let viewport: Viewport;
	let systemData: SolarSystem | null = null;
	let resizeHandler: () => void;
	let starNodes: { container: PIXI.Container; label: PIXI.Text; baseRadius: number; star: Star }[] = [];
	let bodyNodes: {
		container: PIXI.Container;
		label: PIXI.Text;
		baseRadius: number;
		body: OrbitalBody;
		orbitRadiusWorld: number;
	}[] = [];
	let satelliteContainers: { container: PIXI.Container; radius: number }[] = [];
	let orbitNodes: { graphics: PIXI.Graphics; radius: number }[] = [];

	let scaleConfig: ScaleConfig = { auToPixels: 200, mode: 'linear' };

	function getVisualRadius(radius_km: number): number {
		// Non-linear scaling to give an idea of relative sizes
		// Baseline: Earth (6371km) -> ~6px, Moon (1737km) -> ~4px, Jupiter (70000km) -> ~15px
		return 2 + Math.sqrt(radius_km) / 20;
	}

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
		viewport.on('zoomed', updateScales);
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

		// 1. Update satellite visibility first
		for (const sat of satelliteContainers) {
			const screenDistance = sat.radius * viewport.scale.x;
			sat.container.visible = screenDistance > 30;
		}

		for (const star of starNodes) {
			// Find min visible satellite orbit for this star
			let minVisibleSatOrbit = Infinity;
			for (const sat of star.star.satellites) {
				const r = auToPixels(sat.orbit_au, scaleConfig);
				if (r * viewport.scale.x > 30) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			// Also consider system-wide bodies for the star's clamping if it's at the center
			if (star.star.orbit_au === 0) {
				for (const body of systemData.orbital_bodies) {
					const r = auToPixels(body.orbit_au, scaleConfig);
					if (r * viewport.scale.x > 30) {
						if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
					}
				}
				for (const region of systemData.orbital_regions) {
					const r = auToPixels(region.inner_radius_au, scaleConfig);
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			// Clamp star scale so screen radius doesn't exceed 45% of screen min orbit
			const maxScaleSat = (minVisibleSatOrbit * 0.45) / star.baseRadius;
			// If star has its own orbit, also avoid overlap with barycenter?
			// Actually, just avoid overlap with its own satellites.
			const targetScale = Math.min(s, maxScaleSat);
			star.container.scale.set(targetScale);
			// Keep label readable (scale 1 in screen space)
			star.label.scale.set(s / targetScale);
		}

		for (const body of bodyNodes) {
			// Find min visible satellite orbit for this body
			let minVisibleSatOrbit = Infinity;
			for (const sat of body.body.satellites) {
				const r = auToPixels(sat.orbit_au, scaleConfig);
				if (r * viewport.scale.x > 30) {
					if (r < minVisibleSatOrbit) minVisibleSatOrbit = r;
				}
			}

			// Avoid overlap with satellites AND parent
			const maxScaleSat = (minVisibleSatOrbit * 0.45) / body.baseRadius;
			const maxScaleParent = (body.orbitRadiusWorld * 0.45) / body.baseRadius;

			const maxScale = Math.min(maxScaleSat, maxScaleParent);
			const targetScale = Math.min(s, maxScale);
			body.container.scale.set(targetScale);
			body.label.scale.set(s / targetScale);
		}

		for (const orbit of orbitNodes) {
			orbit.graphics.clear().circle(0, 0, orbit.radius).stroke({ width: s, color: 0x334155, alpha: 0.4 });
		}
	}

	function renderSystem() {
		if (!systemData || !viewport) return;
		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		starNodes = [];
		bodyNodes = [];
		satelliteContainers = [];
		orbitNodes = [];

		// Render Stars
		for (const star of systemData.stars) {
			renderStar(star);
		}

		// Render Orbital Bodies (Circumbinary)
		for (const body of systemData.orbital_bodies) {
			renderBody(body, viewport);
		}

		// Render Regions (e.g. Asteroid Belts)
		for (const region of systemData.orbital_regions) {
			const r = new PIXI.Graphics();
			const inner = auToPixels(region.inner_radius_au, scaleConfig);
			const outer = auToPixels(region.outer_radius_au, scaleConfig);

 		// Render as a thick ring
			r.circle(0, 0, outer).stroke({ width: outer - inner, color: 0x475569, alpha: 0.2 });
			viewport.addChild(r);
		}

		updateScales();
	}

	function renderStar(star: Star) {
		const radius = auToPixels(star.orbit_au, scaleConfig);

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
		starCenter.x = radius;
		starCenter.y = 0;
		orbitContainer.addChild(starCenter);

		const starVisual = new PIXI.Container();
		starCenter.addChild(starVisual);

		const g = new PIXI.Graphics();
		const color = star.spectral_class.startsWith('G')
			? 0xfde047
			: star.spectral_class.startsWith('M')
				? 0xf97316
				: 0x38bdf8;
		const baseRadius = Math.max(10, star.radius_sol * 15);
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

		starNodes.push({ container: starVisual, label, baseRadius, star });

		// Render star's satellites
		for (const body of star.satellites) {
			renderBody(body, starCenter);
		}
	}

	function renderBody(body: OrbitalBody, parent: PIXI.Container) {
		const radius = auToPixels(body.orbit_au, scaleConfig);

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
		bodyCenter.x = radius;
		bodyCenter.y = 0;
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
			orbitRadiusWorld: radius
		});

		// Recursive Satellites (Moons)
		for (const satellite of body.satellites) {
			renderBody(satellite, bodyCenter);
		}
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
