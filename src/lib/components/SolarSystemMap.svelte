<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as PIXI from 'pixi.js';
	import { Viewport } from 'pixi-viewport';
	import { invoke } from '@tauri-apps/api/core';
	import { cluster } from '../stores/clusterData';
	import { activeSystemId, viewMode, selectedEntity } from '../stores/appState';
	import type { SolarSystem, OrbitalBody } from '../types/stellar';
	import { auToPixels, type ScaleConfig } from '../pixi/scaling';

	let container: HTMLDivElement;
	let app: PIXI.Application;
	let viewport: Viewport;
	let systemData: SolarSystem | null = null;
	let resizeHandler: () => void;
	let constantSizeNodes: PIXI.Container[] = [];
	let satelliteContainers: { container: PIXI.Container; radius: number }[] = [];

	let scaleConfig: ScaleConfig = { auToPixels: 200, mode: 'linear' };

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
		if (!viewport) return;
		const s = 1 / viewport.scale.x;
		for (const node of constantSizeNodes) {
			node.scale.set(s);
		}

		for (const sat of satelliteContainers) {
			const screenDistance = sat.radius * viewport.scale.x;
			sat.container.visible = screenDistance > 30;
		}
	}

	function renderSystem() {
		if (!systemData || !viewport) return;
		viewport.removeChildren().forEach((child) => child.destroy({ children: true }));
		constantSizeNodes = [];
		satelliteContainers = [];

		// Render Stars at center
		for (const star of systemData.stars) {
			const node = new PIXI.Container();
			const g = new PIXI.Graphics();
			const color = star.spectral_class.startsWith('G')
				? 0xfde047
				: star.spectral_class.startsWith('M')
					? 0xf97316
					: 0x38bdf8;
			g.circle(0, 0, Math.max(10, star.radius_sol * 15)).fill(color);
			node.addChild(g);

			// Label for star
			const label = new PIXI.Text({
				text: star.name,
				style: { fontFamily: 'sans-serif', fontSize: 14, fill: 0xf1f5f9 }
			});
			label.anchor.set(0.5, 0);
			label.y = Math.max(12, star.radius_sol * 15) + 5;
			node.addChild(label);

			constantSizeNodes.push(node);
			viewport.addChild(node);
		}

		// Render Orbital Bodies
		for (const body of systemData.orbital_bodies) {
			renderBody(body, 0, 0, false);
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

	function renderBody(body: OrbitalBody, centerX: number, centerY: number, isSatellite: boolean) {
		const radius = auToPixels(body.orbit_au, scaleConfig);

		const container = new PIXI.Container();
		container.x = centerX;
		container.y = centerY;
		viewport.addChild(container);

		if (isSatellite) {
			satelliteContainers.push({ container, radius });
		}

		// Orbit Path
		const orbit = new PIXI.Graphics();
		orbit.circle(0, 0, radius).stroke({ width: 1, color: 0x334155, alpha: 0.4 });
		container.addChild(orbit);

		// The Body Node (stays constant size)
		const bodyNode = new PIXI.Container();
		bodyNode.x = radius;
		bodyNode.y = 0;

		const g = new PIXI.Graphics();
		const colors: Record<string, number> = {
			Planet: 0x60a5fa,
			Moon: 0x94a3b8,
			SpaceStation: 0xec4899,
			DwarfPlanet: 0xa78bfa,
			Comet: 0x2dd4bf
		};
		g.circle(0, 0, 6).fill(colors[body.body_type] || 0xffffff);
		bodyNode.addChild(g);

		bodyNode.eventMode = 'static';
		bodyNode.cursor = 'pointer';
		bodyNode.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(body);
		});

		// Label
		const label = new PIXI.Text({
			text: body.name,
			style: { fontFamily: 'sans-serif', fontSize: 12, fill: 0x94a3b8 }
		});
		label.anchor.set(0.5, 0);
		label.y = 10;
		bodyNode.addChild(label);

		constantSizeNodes.push(bodyNode);
		container.addChild(bodyNode);

		// Recursive Satellites (Moons)
		for (const satellite of body.satellites) {
			renderBody(satellite, container.x + bodyNode.x, container.y + bodyNode.y, true);
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
