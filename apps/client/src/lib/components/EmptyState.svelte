<script lang="ts">
	import { Sparkles, Loader2 } from 'lucide-svelte';
	import { generateNewCluster } from '$lib/stores/clusterData';
	import { toast } from '$lib/stores/toast';

	let generating = $state(false);

	async function generate() {
		generating = true;
		try {
			await generateNewCluster();
			toast.success('New cluster generated');
		} catch {
			// generateNewCluster already surfaces an error toast.
		} finally {
			generating = false;
		}
	}
</script>

<div
	data-testid="empty-state"
	class="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none"
>
	<div class="pointer-events-auto flex flex-col items-center max-w-sm">
		<div class="text-slate-600 mb-4">
			<Sparkles size={48} />
		</div>
		<h2 class="text-slate-200 font-bold text-xl mb-2">No systems yet</h2>
		<p class="text-slate-500 text-sm mb-6">
			This cluster is empty. Generate a procedural star cluster to start exploring.
		</p>
		<button
			onclick={generate}
			disabled={generating}
			class="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60"
		>
			{#if generating}
				<Loader2 size={16} class="animate-spin" />
				Generating…
			{:else}
				<Sparkles size={16} />
				Generate a cluster
			{/if}
		</button>
	</div>
</div>
