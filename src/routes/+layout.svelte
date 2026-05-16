<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { viewMode, selectedEntity, activeSystemId } from '$lib/stores/appState';
	import { cluster } from '$lib/stores/clusterData';
	let { children } = $props();

	onMount(() => {
		if (typeof window !== 'undefined') {
			(window as any).stores = { viewMode, selectedEntity, activeSystemId, cluster };
		}
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				selectedEntity.set(null);
			}
			if (e.key === 'Backspace' && e.target === document.body) {
				viewMode.set('cluster');
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

{@render children()}
