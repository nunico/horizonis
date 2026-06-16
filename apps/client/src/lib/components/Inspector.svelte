<script lang="ts">
	import { selectedEntity } from '$lib/stores/appState';
	import { cluster, saveCluster } from '$lib/stores/clusterData';
	import { toast } from '$lib/stores/toast';
	import { X, Save, Tag } from 'lucide-svelte';
	import type { SolarSystem, Star, OrbitalBody, StarCluster } from '$lib/types/stellar';

	type Entity = SolarSystem | Star | OrbitalBody;

	// eslint-disable-next-line svelte/prefer-writable-derived
	let entity = $state<Entity | null>(null);

	$effect(() => {
		entity = $selectedEntity ? { ...$selectedEntity } : null;
	});
	let nameInput = $state<HTMLInputElement>();

	$effect(() => {
		if (entity && nameInput) {
			nameInput.focus();
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSave();
		} else if (e.key === 'Escape') {
			selectedEntity.set(null);
		}
	}

	function isStar(e: Entity): e is Star {
		return 'SpectralClass' in e;
	}

	function isOrbitalBody(e: Entity): e is OrbitalBody {
		return 'BodyType' in e;
	}

	function isSolarSystem(e: Entity): e is SolarSystem {
		return !isStar(e) && !isOrbitalBody(e);
	}

	async function handleSave() {
		if (!$cluster || !entity) return;

		const newCluster = structuredClone($cluster) as StarCluster;
		let found = false;

		const updateBody = (bodies: OrbitalBody[]): boolean => {
			for (const b of bodies) {
				if (b.Id === entity!.Id && isOrbitalBody(entity!)) {
					Object.assign(b, entity);
					return true;
				}
				if (b.Satellites && updateBody(b.Satellites)) return true;
			}
			return false;
		};

		for (const system of newCluster.Systems || []) {
			if (system.Id === entity.Id && isSolarSystem(entity)) {
				Object.assign(system, entity);
				found = true;
				break;
			}

			// Search in stars and their satellites
			for (const star of system.Stars || []) {
				if (star.Id === entity.Id && isStar(entity)) {
					Object.assign(star, entity);
					found = true;
					break;
				}
				if (star.Satellites && updateBody(star.Satellites)) {
					found = true;
					break;
				}
			}
			if (found) break;

			if (updateBody(system.OrbitalBodies || [])) {
				found = true;
				break;
			}
		}

		if (found) {
			const saved = await saveCluster(newCluster);
			if (saved) {
				toast.success('Changes saved');
			}
		}
		selectedEntity.set(null);
	}
</script>

{#if entity}
	<div
		onkeydown={handleKeydown}
		role="dialog"
		tabindex="-1"
		aria-labelledby="inspector-title"
		class="fixed top-20 right-4 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-5rem)] z-40"
	>
		<div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
			<h2 id="inspector-title" class="font-bold text-slate-100 uppercase text-xs tracking-widest">
				Inspector
			</h2>
			<button
				onclick={() => selectedEntity.set(null)}
				class="text-slate-500 hover:text-slate-300 transition-colors"
				title="Close (Esc)"
				aria-label="Close"
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
					bind:this={nameInput}
					bind:value={entity.Name}
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
						{entity.SpectralClass}
					</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Mass</span
					>
					<p class="text-slate-300 font-mono">{entity.MassSol?.toFixed(2)} M☉</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.RadiusSol?.toFixed(2)} R☉</p>
				</div>
			{/if}

			{#if isOrbitalBody(entity)}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Type</span
					>
					<p class="text-slate-300">{entity.BodyType}</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Mass</span
					>
					<p class="text-slate-300 font-mono">{entity.MassEarth?.toFixed(2)} M⊕</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.RadiusKm?.toFixed(0)} km</p>
				</div>
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Gravity</span
					>
					{#if entity.MassEarth && entity.RadiusKm}
						<p class="text-slate-300 font-mono">
							{(entity.MassEarth / (entity.RadiusKm / 6371) ** 2).toFixed(2)} g
						</p>
					{/if}
				</div>
			{/if}

			{#if !isSolarSystem(entity)}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Orbit Radius</span
					>
					<p class="text-slate-300 font-mono">{entity.OrbitAu} AU</p>
				</div>
			{/if}

			{#if isOrbitalBody(entity) && entity.Tags && entity.Tags.length > 0}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Tags</span
					>
					<div class="flex flex-wrap gap-1 mt-1">
						{#each entity.Tags as tag (tag)}
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

			{#if 'OrbitalRegions' in entity && entity.OrbitalRegions && entity.OrbitalRegions.length > 0}
				<div>
					<span class="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1"
						>Orbital Regions</span
					>
					<ul class="text-slate-300 text-xs space-y-1">
						{#each entity.OrbitalRegions as region (region.Name)}
							<li class="bg-slate-950/30 px-2 py-1 rounded border border-slate-800/50">
								{region.Name} ({region.InnerRadiusAu} - {region.OuterRadiusAu} AU)
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="p-4 border-t border-slate-700 bg-slate-800/30">
			<button
				onclick={handleSave}
				class="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-lg transition-colors shadow-lg shadow-sky-900/20"
				title="Save changes (Enter)"
			>
				<Save size={16} /> Save Changes
			</button>
		</div>
	</div>
{/if}
