<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import '../app.css';
	import { viewMode, activeSystemId, selectedEntity } from '$lib/stores/appState';
	import { helpOpen, searchResultsOpen, requestSearchFocus } from '$lib/stores/ui';
	import { resolveShortcut } from '$lib/actions/shortcuts';
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
			const target = e.target as HTMLElement | null;
			const inEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

			const action = resolveShortcut({
				key: e.key,
				inEditable,
				helpOpen: get(helpOpen),
				searchResultsOpen: get(searchResultsOpen),
				hasSelection: get(selectedEntity) !== null,
				viewMode: get(viewMode)
			});

			switch (action) {
				case 'toggle-help':
					e.preventDefault();
					helpOpen.update((v) => !v);
					break;
				case 'close-help':
					helpOpen.set(false);
					break;
				case 'focus-search':
					e.preventDefault();
					requestSearchFocus();
					break;
				case 'close-search':
					searchResultsOpen.set(false);
					(document.activeElement as HTMLElement | null)?.blur();
					break;
				case 'clear-selection':
					selectedEntity.set(null);
					break;
				case 'back-to-cluster':
					viewMode.set('cluster');
					activeSystemId.set(null);
					break;
				case 'none':
					break;
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

{@render children()}
