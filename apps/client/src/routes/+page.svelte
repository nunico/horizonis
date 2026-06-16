<script lang="ts">
	import { onMount } from 'svelte';
	import { loadCluster, cluster, initWasm, isInitialized } from '$lib/stores/clusterData';
	import { viewMode } from '$lib/stores/appState';
	import StarMap from '$lib/components/StarMap.svelte';
	import SolarSystemMap from '$lib/components/SolarSystemMap.svelte';
	import Inspector from '$lib/components/Inspector.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SystemList from '$lib/components/SystemList.svelte';
	import Announcer from '$lib/components/Announcer.svelte';

	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			await initWasm();
			await loadCluster();
			if (typeof window !== 'undefined') {
				// Signal to E2E tests that the app is ready for interactions
				// without peeking into internals.
				window.e2eReady = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			console.error('Initialization failed:', e);
		}
	});
</script>

<main class="w-screen h-screen relative bg-slate-950 overflow-hidden">
	{#if $cluster && $isInitialized}
		<Navigation />
		{#if $viewMode === 'cluster'}
			<StarMap />
			{#if ($cluster.Systems?.length ?? 0) === 0}
				<EmptyState />
			{:else}
				<SystemList />
			{/if}
		{:else}
			<SolarSystemMap />
		{/if}
		<Inspector />
		<HelpOverlay />
		<Announcer />
	{:else if error}
		<div
			class="flex flex-col items-center justify-center w-full h-full bg-slate-950 p-8 text-center"
		>
			<div class="text-rose-500 mb-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
						x1="12"
						y1="16"
						x2="12.01"
						y2="16"
					/></svg
				>
			</div>
			<h1 class="text-slate-100 font-bold text-xl mb-2">Initialization Failed</h1>
			<p class="text-slate-400 text-sm max-w-md mb-6">{error}</p>
			<button
				onclick={() => window.location.reload()}
				class="bg-slate-800 hover:bg-slate-700 text-slate-100 px-6 py-2 rounded-lg transition-colors"
			>
				Retry
			</button>
		</div>
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
			<p class="text-slate-500 text-xs animate-pulse tracking-widest">
				Initializing Stellar Data...
			</p>
		</div>
	{/if}

	<Toast />
</main>
