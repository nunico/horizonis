<script lang="ts">
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		busy?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		busy = false,
		onconfirm,
		oncancel
	}: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !busy) {
			e.stopPropagation();
			oncancel();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		tabindex="-1"
		onkeydown={handleKeydown}
		onclick={(e) => {
			if (e.target === e.currentTarget && !busy) oncancel();
		}}
	>
		<div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
			<h2 id="confirm-title" class="text-lg font-bold text-slate-100 mb-2">{title}</h2>
			<p class="text-sm text-slate-400 mb-6">{message}</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={oncancel}
					disabled={busy}
					class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
				>
					{cancelLabel}
				</button>
				<button
					onclick={onconfirm}
					disabled={busy}
					class="px-4 py-2 rounded-lg text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-60 flex items-center gap-2"
				>
					{#if busy}
						<Loader2 size={16} class="animate-spin" />
					{/if}
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
