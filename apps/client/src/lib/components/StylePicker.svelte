<script lang="ts">
	import { Palette, Check, Download, Upload } from 'lucide-svelte';
	import {
		availableStyles,
		activeStyleId,
		setActiveStyle,
		importStyle,
		exportStyle
	} from '$lib/stores/style';
	import { toast } from '$lib/stores/toast';

	let open = $state(false);
	let fileInput = $state<HTMLInputElement>();

	function choose(id: string) {
		setActiveStyle(id);
		open = false;
	}

	async function onFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const result = importStyle(await file.text());
		if (result.ok) {
			setActiveStyle(result.style.meta.id);
			toast.success(`Imported "${result.style.meta.name}"`);
			open = false;
		} else {
			toast.error(`Import failed: ${result.error}`);
		}
	}

	function exportActive() {
		const json = exportStyle($activeStyleId);
		if (!json) {
			toast.error('This style cannot be exported.');
			return;
		}
		const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `${$activeStyleId}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="relative">
	<button
		onclick={() => (open = !open)}
		class="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
		class:text-sky-400={open}
		title="Map style"
		aria-label="Map style"
		aria-haspopup="menu"
		aria-expanded={open}
	>
		<Palette size={20} aria-hidden="true" />
	</button>

	<input
		bind:this={fileInput}
		onchange={onFileChange}
		type="file"
		accept="application/json,.json"
		class="hidden"
		data-testid="style-import-input"
	/>

	{#if open}
		<!-- Click-away backdrop -->
		<button
			class="fixed inset-0 z-[55] cursor-default"
			aria-label="Close style menu"
			onclick={() => (open = false)}
		></button>

		<div
			role="menu"
			class="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden z-[60]"
		>
			<div
				class="px-3 py-2 text-xs uppercase tracking-widest text-slate-500 border-b border-slate-800"
			>
				Map Style
			</div>

			{#each $availableStyles as style (style.meta.id)}
				<button
					role="menuitemradio"
					aria-checked={style.meta.id === $activeStyleId}
					onclick={() => choose(style.meta.id)}
					class="w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors hover:bg-slate-800 {style
						.meta.id === $activeStyleId
						? 'bg-slate-800/60'
						: ''}"
				>
					<div>
						<div class="text-sm font-medium text-slate-200">{style.meta.name}</div>
						{#if style.meta.description}
							<div class="text-xs text-slate-500">{style.meta.description}</div>
						{/if}
					</div>
					{#if style.meta.id === $activeStyleId}
						<Check size={16} class="text-sky-400 shrink-0" aria-hidden="true" />
					{/if}
				</button>
			{/each}

			<div class="flex border-t border-slate-800">
				<button
					onclick={() => fileInput?.click()}
					class="flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
				>
					<Upload size={14} aria-hidden="true" />
					Import
				</button>
				<button
					onclick={exportActive}
					class="flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors border-l border-slate-800"
				>
					<Download size={14} aria-hidden="true" />
					Export
				</button>
			</div>
		</div>
	{/if}
</div>
