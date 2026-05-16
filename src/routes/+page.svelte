<script lang="ts">
	import { onMount } from 'svelte';
	import { loadCluster, cluster } from '$lib/stores/clusterData';
	import { viewMode } from '$lib/stores/appState';
	import StarMap from '$lib/components/StarMap.svelte';
	import SolarSystemMap from '$lib/components/SolarSystemMap.svelte';
	import Inspector from '$lib/components/Inspector.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';

	let showHelp = false;

	onMount(async () => {
		await loadCluster();
	});
</script>

<main class="w-screen h-screen relative bg-slate-950 overflow-hidden">
	{#if $cluster}
		<Navigation bind:showHelp />
		{#if $viewMode === 'cluster'}
			<StarMap />
		{:else}
			<SolarSystemMap />
		{/if}
		<Inspector />
		<HelpOverlay bind:show={showHelp} />
	{:else}
		<div
			data-testid="loading-screen"
			class="flex flex-col items-center justify-center w-full h-full bg-slate-950"
		>
			<div class="relative w-24 h-24 mb-8">
				<div
					class="absolute inset-0 border-4 border-sky-500/20 rounded-full animate-[ping_3s_infinite]"
				></div>
				<div
					class="absolute inset-2 border-4 border-sky-500/40 rounded-full animate-[ping_2s_infinite]"
				></div>
				<div class="absolute inset-4 border-4 border-sky-500 rounded-full animate-pulse"></div>
			</div>
			<h1 class="text-sky-500 font-bold tracking-[0.3em] uppercase text-sm mb-2">Horizonis</h1>
			<p class="text-slate-500 text-xs animate-pulse tracking-widest">Initializing Stellar Data...</p>
		</div>
	{/if}
</main>
