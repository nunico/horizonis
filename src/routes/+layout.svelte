<script lang="ts">
  import { onMount } from 'svelte';
  import "../app.css";
  import { viewMode, selectedEntity } from '../lib/stores/appState';
  let { children } = $props();

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
