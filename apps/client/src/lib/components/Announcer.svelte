<script lang="ts">
	import { cluster } from '$lib/stores/clusterData';
	import { activeSystemId, viewMode } from '$lib/stores/appState';

	// A single polite live region that narrates the current view for screen
	// readers, since the maps themselves are canvas and convey nothing to AT.
	let activeSystem = $derived($cluster?.Systems?.find((s) => s.Id === $activeSystemId));
	let message = $derived(
		$viewMode === 'system' && activeSystem
			? `Viewing ${activeSystem.Name} system`
			: 'Viewing star cluster'
	);
</script>

<div class="sr-only" role="status" aria-live="polite" data-testid="announcer">{message}</div>
