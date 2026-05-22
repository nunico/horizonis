<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { viewMode, selectedEntity } from '$lib/stores/appState';
	import * as appState from '$lib/stores/appState';
	import * as clusterData from '$lib/stores/clusterData';
	let { children } = $props();

	if (typeof window !== 'undefined' && (import.meta.env.DEV || window.navigator.webdriver)) {
		window.stores = {
			...appState,
			...clusterData
		};

		// Provide a stable snapshot helper for E2E to synchronously read the cluster store
		// without relying on timing-sensitive effects.
		window.getClusterSnapshot = () => {
			let value: unknown = null;
			clusterData.cluster.subscribe((v) => (value = v))();
			return value;
		};
	}

	onMount(() => {
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
