<script lang="ts">
	import { cluster } from '$lib/stores/clusterData';
	import { activeSystemId, viewMode, selectedEntity } from '$lib/stores/appState';
	import { List, ChevronDown, ChevronRight } from 'lucide-svelte';

	// A keyboard- and screen-reader-navigable alternative to the canvas: a
	// disclosure list of every system that can be opened without a pointer.
	let open = $state(false);
	let systems = $derived($cluster?.Systems ?? []);

	function openSystem(id: string) {
		activeSystemId.set(id);
		viewMode.set('system');
		selectedEntity.set(null);
	}
</script>

<nav
	aria-label="Systems"
	class="fixed top-20 left-4 z-30 w-60 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-lg overflow-hidden"
>
	<button
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls="system-list"
		class="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
	>
		<span class="flex items-center gap-2">
			<List size={16} aria-hidden="true" />
			Systems ({systems.length})
		</span>
		{#if open}
			<ChevronDown size={16} aria-hidden="true" />
		{:else}
			<ChevronRight size={16} aria-hidden="true" />
		{/if}
	</button>

	{#if open}
		<ul id="system-list" class="max-h-72 overflow-y-auto border-t border-slate-800">
			{#each systems as system (system.Id)}
				<li>
					<button
						onclick={() => openSystem(system.Id)}
						class="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors border-b border-slate-800/50 last:border-0"
					>
						{system.Name}
					</button>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-slate-500">No systems</li>
			{/each}
		</ul>
	{/if}
</nav>
