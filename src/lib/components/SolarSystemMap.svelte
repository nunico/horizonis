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
			worldWidth: 10000,
			worldHeight: 10000,
			events: app.renderer.events
		});

		app.stage.addChild(viewport);
		viewport.drag().pinch().wheel().decelerate();
		viewport.moveCenter(0, 0);

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
		if (app) app.destroy(true, { children: true });
	});

	function renderSystem() {
		if (!systemData || !viewport) return;
		viewport.removeChildren();

		// Render Stars at center
		for (const star of systemData.stars) {
			const g = new PIXI.Graphics();
			const color = star.spectral_class.startsWith('G')
				? 0xfde047
				: star.spectral_class.startsWith('M')
					? 0xf97316
					: 0x38bdf8;
			g.circle(0, 0, Math.max(10, star.radius_sol * 15)).fill(color);
			viewport.addChild(g);
		}

		// Render Orbital Bodies
		for (const body of systemData.orbital_bodies) {
			renderBody(body, 0, 0);
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
	}

	function renderBody(body: OrbitalBody, centerX: number, centerY: number) {
		const radius = auToPixels(body.orbit_au, scaleConfig);

		// Orbit Path
		const orbit = new PIXI.Graphics();
		orbit.circle(centerX, centerY, radius).stroke({ width: 1, color: 0x334155, alpha: 0.4 });
		viewport.addChild(orbit);

		// The Body
		const node = new PIXI.Graphics();
		const colors: Record<string, number> = {
			Planet: 0x60a5fa,
			Moon: 0x94a3b8,
			SpaceStation: 0xec4899,
			DwarfPlanet: 0xa78bfa,
			Comet: 0x2dd4bf
		};
		node.circle(0, 0, 6).fill(colors[body.body_type] || 0xffffff);

		// For now, place planets along the X axis
		node.x = centerX + radius;
		node.y = centerY;
		node.eventMode = 'static';
		node.cursor = 'pointer';
		node.on('pointerdown', (e) => {
			e.stopPropagation();
			selectedEntity.set(body);
		});

		viewport.addChild(node);

		// Label
		const label = new PIXI.Text({
			text: body.name,
			style: { fontFamily: 'sans-serif', fontSize: 12, fill: 0x94a3b8 }
		});
		label.anchor.set(0.5, 0);
		label.y = 10;
		node.addChild(label);

		// Recursive Satellites (Moons)
		for (const satellite of body.satellites) {
			renderBody(satellite, node.x, node.y);
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
