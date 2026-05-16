<script lang="ts">
	import { X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	export let show = false;

	const shortcuts = [
		{ key: '?', description: 'Toggle this help overlay' },
		{ key: '/', description: 'Focus search' },
		{ key: 'Backspace', description: 'Go back to cluster view' },
		{ key: 'Escape', description: 'Clear selection / Close menus' },
		{ key: 'Enter', description: 'Save changes (in Inspector)' },
		{ key: 'Scroll', description: 'Zoom in/out' },
		{ key: 'Drag', description: 'Pan view' }
	];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
			show = !show;
		} else if (e.key === 'Escape' && show) {
			show = false;
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
		on:click|self={() => (show = false)}
	>
		<div
			role="dialog"
			aria-labelledby="help-title"
			class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
		>
			<div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
				<h2 id="help-title" class="text-lg font-bold text-slate-100">Keyboard Shortcuts</h2>
				<button
					on:click={() => (show = false)}
					class="text-slate-500 hover:text-slate-300 transition-colors"
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			<div class="p-6 space-y-4">
				{#each shortcuts as shortcut}
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
