<script lang="ts">
	import { viewMode, activeSystemId, selectedEntity } from '$lib/stores/appState';
	import { cluster } from '$lib/stores/clusterData';
	import type { Star, OrbitalBody } from '$lib/types/stellar';
	import { ChevronRight, ArrowLeft, Home, Search, HelpCircle } from 'lucide-svelte';

	let { showHelp = $bindable(false) } = $props();

	let system = $derived($cluster?.Systems?.find((s) => s.Id === $activeSystemId));
	let entity = $derived($selectedEntity);

	let searchQuery = $state('');
	let debouncedQuery = $state('');
	let showResults = $state(false);
	let searchInput = $state<HTMLInputElement>();

	$effect(() => {
		const timeout = setTimeout(() => {
			debouncedQuery = searchQuery;
		}, 200);
		return () => clearTimeout(timeout);
	});

	interface SearchResult {
		id: string;
		name: string;
		type: 'system' | 'star' | 'body';
		systemId: string;
		entity: Star | OrbitalBody | null;
	}

	let searchResults = $derived(debouncedQuery.length > 1 ? getSearchResults(debouncedQuery) : []);

	function getSearchResults(query: string): SearchResult[] {
		if (!$cluster?.Systems) return [];
		const results: SearchResult[] = [];
		const q = query.toLowerCase();

		$cluster.Systems.forEach((sys) => {
			if (sys.Name.toLowerCase().includes(q)) {
				results.push({
					id: sys.Id,
					name: sys.Name,
					type: 'system',
					systemId: sys.Id,
					entity: null
				});
			}

			sys.Stars?.forEach((star) => {
				if (star.Name.toLowerCase().includes(q)) {
					results.push({
						id: star.Id,
						name: star.Name,
						type: 'star',
						systemId: sys.Id,
						entity: star
					});
				}
				flattenBodies(star.Satellites || [], sys.Id, q, results);
			});

			flattenBodies(sys.OrbitalBodies || [], sys.Id, q, results);
		});

		return results.slice(0, 10);
	}

	function flattenBodies(
		bodies: OrbitalBody[],
		systemId: string,
		q: string,
		results: SearchResult[]
	) {
		bodies.forEach((body) => {
			if (body.Name.toLowerCase().includes(q)) {
				results.push({ id: body.Id, name: body.Name, type: 'body', systemId, entity: body });
			}
			if (body.Satellites) {
				flattenBodies(body.Satellites, systemId, q, results);
			}
		});
	}

	function selectResult(result: SearchResult) {
		activeSystemId.set(result.systemId);
		viewMode.set('system');
		selectedEntity.set(result.entity);
		searchQuery = '';
		showResults = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement !== searchInput) {
			e.preventDefault();
			searchInput?.focus();
		} else if (e.key === 'Escape') {
			showResults = false;
			searchInput?.blur();
		}
	}

	function goBack() {
		if ($selectedEntity) {
			selectedEntity.set(null);
		} else if ($viewMode === 'system') {
			viewMode.set('cluster');
			activeSystemId.set(null);
		}
	}

	function goToCluster() {
		selectedEntity.set(null);
		activeSystemId.set(null);
		viewMode.set('cluster');
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<nav
	class="absolute top-0 left-0 right-0 h-14 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center px-4 justify-between z-50"
>
	<div class="flex items-center gap-4">
		{#if $viewMode === 'system' || $selectedEntity}
			<button
				onclick={goBack}
				class="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
				aria-label="Go back"
			>
				<ArrowLeft size={20} />
			</button>
		{/if}

		<div class="flex items-center gap-2 text-sm font-medium">
			<button
				onclick={goToCluster}
				class="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 transition-colors"
			>
				<Home size={16} />
				<span>Cluster</span>
			</button>

			{#if system}
				<ChevronRight size={14} class="text-slate-600" />
				<button
					onclick={() => selectedEntity.set(null)}
					class="text-slate-400 hover:text-slate-100 transition-colors"
					class:text-slate-100={!entity}
				>
					{system.Name}
				</button>
			{/if}

			{#if entity}
				<ChevronRight size={14} class="text-slate-600" />
				<span class="text-slate-100">{entity.Name}</span>
			{/if}
		</div>
	</div>

	<div class="flex items-center gap-4 relative">
		<div class="relative group">
			<Search
				size={16}
				class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors"
			/>
			<input
				bind:this={searchInput}
				bind:value={searchQuery}
				onfocus={() => (showResults = true)}
				type="text"
				placeholder="Search systems..."
				class="w-64 bg-slate-950/50 border border-slate-800 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all placeholder:text-slate-600"
			/>
			<div
				class="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-500 border border-slate-700 pointer-events-none group-focus-within:hidden"
			>
				/
			</div>
		</div>

		{#if showResults && searchResults.length > 0}
			<div
				class="absolute top-full mt-2 left-0 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden z-[60]"
			>
				{#each searchResults as result (result.id)}
					<button
						onclick={() => selectResult(result)}
						class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors text-left border-b border-slate-800/50 last:border-0"
					>
						<div>
							<div class="text-sm font-medium text-slate-200">{result.name}</div>
							<div class="text-[10px] uppercase tracking-wider text-slate-500">
								{result.type}
							</div>
						</div>
						<ChevronRight size={14} class="text-slate-600" />
					</button>
				{/each}
			</div>
		{/if}

		{#if showResults && searchQuery.length > 1 && searchResults.length === 0}
			<div
				class="absolute top-full mt-2 left-0 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-4 text-center z-[60]"
			>
				<p class="text-sm text-slate-500">No results found for "{searchQuery}"</p>
			</div>
		{/if}

		<button
			onclick={() => (showHelp = true)}
			class="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
			class:text-sky-400={showHelp}
			title="Help (?)"
			aria-label="Help"
		>
			<HelpCircle size={20} />
		</button>
	</div>
</nav>
