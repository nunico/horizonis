<script lang="ts">
	import { X } from 'lucide-svelte';
	import { helpOpen } from '$lib/stores/ui';
	import { focusTrap } from '$lib/actions/focusTrap';

	const shortcuts = [
		{ key: '?', description: 'Toggle this help overlay' },
		{ key: '/', description: 'Focus search' },
		{ key: '↑ ↓ / Enter', description: 'Navigate / pick a search result' },
		{ key: 'Double-click', description: 'Open a system (Star Map)' },
		{ key: 'Backspace', description: 'Go back to cluster view' },
		{ key: 'Escape', description: 'Clear selection / Close menus' },
		{ key: 'Enter', description: 'Save changes (in Inspector)' },
		{ key: 'Ctrl/⌘ Z', description: 'Undo last change' },
		{ key: 'Scroll', description: 'Zoom in/out' },
		{ key: 'Drag', description: 'Pan view' },
		{ key: 'Drag a system', description: 'Rearrange it (Star Map only)' }
	];

	let show = $derived($helpOpen);
</script>

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget) helpOpen.set(false);
		}}
	>
		<div
			use:focusTrap
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="help-title"
			class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
		>
			<div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
				<h2 id="help-title" class="text-lg font-bold text-slate-100">Keyboard Shortcuts</h2>
				<button
					onclick={() => helpOpen.set(false)}
					class="text-slate-500 hover:text-slate-300 transition-colors"
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			<div class="p-6 space-y-4">
				{#each shortcuts as shortcut (shortcut.key)}
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-400">{shortcut.description}</span>
						<kbd
							class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-sky-400 shadow-sm"
						>
							{shortcut.key}
						</kbd>
					</div>
				{/each}
			</div>

			<div class="p-6 bg-slate-800/30 border-t border-slate-800 text-center">
				<p class="text-xs text-slate-500">
					Press <kbd class="px-1 bg-slate-800 rounded">?</kbd> at any time to toggle this guide.
				</p>
			</div>
		</div>
	</div>
{/if}
