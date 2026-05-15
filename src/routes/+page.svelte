<script lang="ts">
  import { onMount } from 'svelte';
  import { loadCluster, cluster } from '../lib/stores/clusterData';
  import { viewMode } from '../lib/stores/appState';
  import StarMap from '../lib/components/StarMap.svelte';
  import SolarSystemMap from '../lib/components/SolarSystemMap.svelte';
  import Inspector from '../lib/components/Inspector.svelte';

  onMount(async () => {
    await loadCluster();
  });
</script>

<main class="w-screen h-screen relative bg-slate-950 overflow-hidden">
  {#if $cluster}
    {#if $viewMode === 'cluster'}
      <StarMap />
    {:else}
      <SolarSystemMap />
    {/if}
    <Inspector />
  {:else}
    <div class="flex items-center justify-center w-full h-full">
      <p class="text-slate-400 animate-pulse">Initializing Stellar Data...</p>
    </div>
  {/if}
</main>
