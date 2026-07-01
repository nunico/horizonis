<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { generationSettings, saveGenerationSettings } from '$lib/stores/generationSettings';
	import { defaultGenerationSettings } from '$lib/types/generationSettings';
	import type { GenerationSettings } from '$lib/types/generationSettings';
	import { performRegenerate, requestRegenerate } from '$lib/actions/regenerate';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let local = $state<GenerationSettings>({ ...$generationSettings });
	let showRegenerateConfirm = $state(false);
	let regenerating = $state(false);
	let saving = $state(false);

	let errors = $derived.by(() => {
		const list: string[] = [];
		if (local.SystemCountMin < 1) {
			list.push('Minimum systems must be at least 1.');
		}
		if (local.SystemCountMin > local.SystemCountMax) {
			list.push('Minimum must be less than or equal to maximum systems.');
		}
		if (local.MaxBodiesPerStar < 0) {
			list.push('Max planets per star cannot be negative.');
		}
		return list;
	});

	function toPercent(fraction: number): number {
		return Math.round(fraction * 100);
	}

	function fromPercent(percent: number): number {
		return percent / 100;
	}

	async function saveAndGenerate() {
		saving = true;
		try {
			await saveGenerationSettings(local);
			await requestRegenerate({
				onDone: () => goto(resolve('/')),
				onShowConfirm: () => (showRegenerateConfirm = true)
			});
		} finally {
			saving = false;
		}
	}

	async function confirmRegenerate() {
		regenerating = true;
		await performRegenerate(() => goto(resolve('/')));
		regenerating = false;
		showRegenerateConfirm = false;
	}

	function resetToDefaults() {
		local = { ...defaultGenerationSettings };
	}
</script>

<main
	class="w-screen h-screen overflow-y-auto bg-slate-950 text-slate-100 flex justify-center px-4 py-12"
>
	<div class="w-full max-w-xl">
		<h1 class="text-xl font-bold mb-1">Generation Settings</h1>
		<p class="text-sm text-slate-400 mb-8">
			These settings apply the next time you generate a new cluster.
		</p>

		<div class="space-y-6">
			<fieldset class="grid grid-cols-2 gap-4">
				<legend class="text-sm font-medium text-slate-300 mb-2 col-span-2">
					Systems in cluster
				</legend>
				<label class="flex flex-col gap-1 text-sm text-slate-400">
					Minimum systems
					<input
						type="number"
						min="1"
						bind:value={local.SystemCountMin}
						class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm text-slate-400">
					Maximum systems
					<input
						type="number"
						min="1"
						bind:value={local.SystemCountMax}
						class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
					/>
				</label>
			</fieldset>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Multi-star systems (%)
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.MultiStarChance)}
					oninput={(e) => (local.MultiStarChance = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Trinary systems, as % of multi-star systems
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.TrinaryRatio)}
					oninput={(e) => (local.TrinaryRatio = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Max planets per star
				<input
					type="number"
					min="0"
					bind:value={local.MaxBodiesPerStar}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex flex-col gap-1 text-sm text-slate-400">
				Asteroid belt frequency (%)
				<input
					type="number"
					min="0"
					max="100"
					value={toPercent(local.AsteroidBeltChance)}
					oninput={(e) => (local.AsteroidBeltChance = fromPercent(+e.currentTarget.value))}
					class="bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-slate-100"
				/>
			</label>

			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="checkbox" bind:checked={local.DisallowCircumbinaryBodies} />
				Never place planets around multi-star systems as a whole
			</label>

			{#if errors.length > 0}
				<ul class="text-sm text-rose-400 space-y-1" role="alert">
					{#each errors as error (error)}
						<li>{error}</li>
					{/each}
				</ul>
			{/if}

			<div class="flex flex-wrap gap-3 pt-4">
				<button
					onclick={saveAndGenerate}
					disabled={errors.length > 0 || saving}
					class="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
				>
					Save & Generate New Cluster
				</button>
				<button
					onclick={resetToDefaults}
					class="bg-slate-800 hover:bg-slate-700 text-slate-100 px-4 py-2 rounded-lg text-sm transition-colors"
				>
					Reset to Defaults
				</button>
				<a
					href={resolve('/')}
					class="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
				>
					Cancel
				</a>
			</div>
		</div>
	</div>
</main>

<ConfirmDialog
	open={showRegenerateConfirm}
	title="Generate a new cluster?"
	message="This replaces your current cluster. You can undo it right after."
	confirmLabel="Generate"
	busy={regenerating}
	onconfirm={confirmRegenerate}
	oncancel={() => (showRegenerateConfirm = false)}
/>
