<script lang="ts">
	import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';
	import { toasts, dismissToast, type ToastType } from '$lib/stores/toast';

	const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

	const styles: Record<ToastType, string> = {
		success: 'border-emerald-700/60 text-emerald-300',
		error: 'border-rose-700/60 text-rose-300',
		info: 'border-sky-700/60 text-sky-300'
	};
</script>

<div
	class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2"
	aria-live="polite"
	aria-atomic="false"
>
	{#each $toasts as item (item.id)}
		{@const Icon = icons[item.type]}
		<div
			role={item.type === 'error' ? 'alert' : 'status'}
			class="flex items-center gap-3 max-w-sm bg-slate-900/95 backdrop-blur-md border rounded-lg shadow-2xl px-4 py-2.5 {styles[
				item.type
			]}"
		>
			<Icon size={18} aria-hidden="true" />
			<span class="text-sm text-slate-100">{item.message}</span>
			<button
				onclick={() => dismissToast(item.id)}
				class="ml-1 text-slate-500 hover:text-slate-200 transition-colors"
				aria-label="Dismiss notification"
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
