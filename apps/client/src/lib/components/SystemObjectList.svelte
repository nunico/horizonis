<script lang="ts">
	import { cluster } from '$lib/stores/clusterData';
	import { activeSystemId, selectedEntity, type Entity } from '$lib/stores/appState';
	import type { OrbitalBody, Star } from '$lib/types/stellar';
	import { ChevronDown, ChevronRight, ListTree } from 'lucide-svelte';

	type ObjectItem = {
		id: string;
		type: string;
		name: string;
		depth: number;
		entity: Entity;
	};

	let open = $state(false);
	let system = $derived($cluster?.Systems?.find((s) => s.Id === $activeSystemId) ?? null);
	let objects = $derived.by(() => {
		const items: ObjectItem[] = [];
		if (!system) return items;

		function addBody(body: OrbitalBody, depth: number) {
			items.push({
				id: body.Id,
				type: body.BodyType,
				name: body.Name,
				depth,
				entity: body
			});
			body.Satellites?.forEach((satellite) => addBody(satellite, depth + 1));
		}

		function addStar(star: Star) {
			items.push({
				id: star.Id,
				type: 'Star',
				name: star.Name,
				depth: 0,
				entity: star
			});
			star.Satellites?.forEach((satellite) => addBody(satellite, 1));
		}

		system.Stars?.forEach(addStar);
		system.OrbitalBodies?.forEach((body) => addBody(body, 0));
		return items;
	});

	function selectObject(entity: Entity) {
		selectedEntity.set(entity);
	}

	function objectLabel(object: ObjectItem) {
		const nested = object.depth > 0 ? `, nested level ${object.depth + 1}` : '';
		return `${object.type}: ${object.name}${nested}`;
	}
</script>

<nav
	aria-label="System objects"
	class="fixed top-20 left-4 z-30 w-72 max-w-[calc(100vw-2rem)] bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-lg overflow-hidden"
>
	<button
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls="system-object-list"
		class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
	>
		<span class="flex items-center gap-2">
			<ListTree size={16} aria-hidden="true" />
			System Objects ({objects.length})
		</span>
		{#if open}
			<ChevronDown size={16} aria-hidden="true" />
		{:else}
			<ChevronRight size={16} aria-hidden="true" />
		{/if}
	</button>

	{#if open}
		<ul id="system-object-list" class="max-h-80 overflow-y-auto border-t border-slate-800">
			{#each objects as object (object.id)}
				<li>
					<button
						onclick={() => selectObject(object.entity)}
						aria-label={objectLabel(object)}
						class="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors border-b border-slate-800/50 last:border-0"
						style:padding-left={`${0.75 + object.depth * 1}rem`}
					>
						<span class="text-xs uppercase tracking-wider text-slate-500">{object.type}:</span>
						<span>{object.name}</span>
					</button>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-slate-500">No objects</li>
			{/each}
		</ul>
	{/if}
</nav>
