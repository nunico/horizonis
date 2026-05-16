<script lang="ts">
	import { selectedEntity } from '../stores/appState';
	import { cluster, saveCluster } from '../stores/clusterData';
	import { X, Save, Tag } from 'lucide-svelte';
	import type { SolarSystem, Star, OrbitalBody } from '../types/stellar';

	type Entity = SolarSystem | Star | OrbitalBody;

	let entity: Entity | null = null;
	selectedEntity.subscribe((v) => (entity = v ? { ...v } : null));

	function isStar(e: Entity): e is Star {
		return 'spectral_class' in e;
	}

	function isOrbitalBody(e: Entity): e is OrbitalBody {
		return 'body_type' in e;
	}

	function isSolarSystem(e: Entity): e is SolarSystem {
		return !isStar(e) && !isOrbitalBody(e);
	}

	async function handleSave() {
		if (!$cluster || !entity) return;

		const newCluster = JSON.parse(JSON.stringify($cluster));
		let found = false;

		const updateBody = (bodies: OrbitalBody[]): boolean => {
			for (const b of bodies) {
				if (b.id === entity!.id) {
					Object.assign(b, entity);
					return true;
				}
				if (b.satellites && updateBody(b.satellites)) return true;
			}
			return false;
		};

		for (const system of newCluster.systems) {
			if (system.id === entity.id) {
				Object.assign(system, entity);
				found = true;
				break;
			}

			// Search in stars and their satellites
			for (const star of system.stars) {
				if (star.id === entity.id) {
					Object.assign(star, entity);
					found = true;
					break;
				}
				if (star.satellites && updateBody(star.satellites)) {
					found = true;
					break;
				}
			}
			if (found) break;

			if (updateBody(system.orbital_bodies)) {
				found = true;
				break;
			}
		}

		if (found) {
			await saveCluster(newCluster);
		}
		selectedEntity.set(null);
	}
</script>

{#if entity}
	<div
		class="absolute top-4 right-4 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]"
	>
		<div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
			<h2 class="font-bold text-slate-100 uppercase text-xs tracking-widest">Inspector</h2>
			<button
				on:click={() => selectedEntity.set(null)}
				class="text-slate-500 hover:text-slate-300 transition-colors"
			>
				<X size={18} />
			</button>
		</div>

		<div class="p-4 space-y-4 overflow-y-auto">
			<div>
				<label
					class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
					for="name">Name</label
				>
				<input
					id="name"
					bind:value={entity.name}
					class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
				/>
			</div>

			{#if isStar(entity)}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Spectral Class</span
					>
					<p
						class="text-slate-300 font-mono bg-slate-950/50 px-2 py-1 rounded border border-slate-800"
					>
						{entity.spectral_class}
					</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Mass</span
					>
					<p class="text-slate-300 font-mono">{entity.mass_sol?.toFixed(2)} M☉</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.radius_sol?.toFixed(2)} R☉</p>
				</div>
			{/if}

			{#if isOrbitalBody(entity)}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Type</span
					>
					<p class="text-slate-300">{entity.body_type}</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Mass</span
					>
					<p class="text-slate-300 font-mono">{entity.mass_earth?.toFixed(2)} M⊕</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.radius_km?.toFixed(0)} km</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Gravity</span
					>
					{#if entity.mass_earth && entity.radius_km}
						<p class="text-slate-300 font-mono">
							{(entity.mass_earth / (entity.radius_km / 6371) ** 2).toFixed(2)} g
						</p>
					{/if}
				</div>
			{/if}

			{#if !isSolarSystem(entity)}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Orbit Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.orbit_au} AU</p>
				</div>
			{/if}

			{#if isOrbitalBody(entity) && entity.tags && entity.tags.length > 0}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Tags</span
					>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each entity.tags as tag (tag)}
							<span
								class="flex items-center gap-1 bg-sky-900/30 text-sky-400 border border-sky-800/50 px-2 py-0.5 rounded text-[10px] font-medium"
							>
								<Tag size={10} />
								{tag}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if 'orbital_regions' in entity && entity.orbital_regions && entity.orbital_regions.length > 0}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Orbital Regions</span
					>
					<ul class="text-slate-300 text-xs space-y-1">
						{#each entity.orbital_regions as region (region.name)}
							<li class="bg-slate-950/30 px-2 py-1 rounded border border-slate-800/50">
								{region.name} ({region.inner_radius_au} - {region.outer_radius_au} AU)
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="p-4 border-t border-slate-700 bg-slate-800/30">
			<button
				on:click={handleSave}
				class="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg transition-colors shadow-lg shadow-sky-900/20"
			>
				<Save size={16} /> Save Changes
			</button>
		</div>
	</div>
{/if}
