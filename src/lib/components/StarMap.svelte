<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as PIXI from 'pixi.js';
  import { Viewport } from 'pixi-viewport';
  import { cluster } from '../stores/clusterData';
  import { viewMode, activeSystemId, selectedEntity } from '../stores/appState';
  import type { SolarSystem } from '../types/stellar';

  let container: HTMLDivElement;
  let app: PIXI.Application;
  let viewport: Viewport;

  onMount(async () => {
    app = new PIXI.Application();
    await app.init({
      resizeTo: container,
      antialias: true,
      backgroundColor: 0x020617, // slate-950
    });
    container.appendChild(app.canvas);

    viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: 2000,
      worldHeight: 2000,
      events: app.renderer.events,
    });

    app.stage.addChild(viewport);

    viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate();

    viewport.moveCenter(0, 0);

    renderCluster();
  });

  onDestroy(() => {
    if (app) {
      app.destroy(true, { children: true });
    }
  });

  function renderCluster() {
    if (!$cluster || !viewport) return;

    viewport.removeChildren();

    // Render portals first (background)
    const portalGraphics = new PIXI.Graphics();
    viewport.addChild(portalGraphics);

    for (const system of $cluster.systems) {
      for (const portal of system.portals) {
        const target = $cluster.systems.find(s => s.id === portal.target_system_id);
        if (target) {
            portalGraphics
                .moveTo(system.x, system.y)
                .lineTo(target.x, target.y)
                .stroke({ width: 2, color: 0x334155, alpha: 0.5 });
        }
      }
    }

    // Render systems
    for (const system of $cluster.systems) {
      const node = new PIXI.Graphics();
      node.circle(0, 0, 10).fill(0x38bdf8);
      
      node.x = system.x;
      node.y = system.y;
      node.eventMode = 'static';
      node.cursor = 'pointer';

      node.on('pointerdown', () => {
        selectedEntity.set(system);
      });

      // Double click logic
      let lastClick = 0;
      node.on('pointerup', () => {
        const now = Date.now();
        if (now - lastClick < 300) {
          activeSystemId.set(system.id);
          viewMode.set('system');
        }
        lastClick = now;
      });

      // Label
      const label = new PIXI.Text({
        text: system.name,
        style: {
            fontFamily: 'sans-serif',
            fontSize: 14,
            fill: 0xf1f5f9,
        }
      });
      label.anchor.set(0.5, 0);
      label.y = 15;
      node.addChild(label);

      viewport.addChild(node);
    }
  }

  $: if ($cluster && viewport) {
    renderCluster();
  }
</script>

<div bind:this={container} class="w-full h-full"></div>
