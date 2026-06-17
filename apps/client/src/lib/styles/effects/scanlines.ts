import { Container, Graphics } from 'pixi.js';
import { hexToNumber } from '../palette';
import type { ScanlinesSpec } from '../types';

/**
 * Build a screen-space CRT scanline overlay: evenly spaced dark horizontal
 * bands across the whole canvas. Implemented as a single {@link Graphics} so it
 * is cheap and renderer-agnostic. An optional subtle flicker modulates opacity
 * via the container's per-frame `onRender` hook (no external ticker wiring).
 */
export function createScanlineOverlay(
	screen: { width: number; height: number },
	spec: ScanlinesSpec,
	color: string
): Container {
	const overlay = new Container();
	// Never intercept pointer input meant for the map below it.
	overlay.eventMode = 'none';
	overlay.interactiveChildren = false;

	const lines = new Graphics();
	const spacing = Math.max(2, spec.lineSpacing);
	const thickness = Math.max(1, Math.floor(spacing / 2));
	for (let y = 0; y < screen.height; y += spacing) {
		lines.rect(0, y, screen.width, thickness);
	}
	lines.fill({ color: hexToNumber(color), alpha: Math.min(1, Math.max(0, spec.intensity)) });
	overlay.addChild(lines);

	const flicker = spec.flicker ?? 0;
	if (flicker > 0) {
		let t = 0;
		overlay.onRender = () => {
			t += 0.08;
			lines.alpha = 1 + Math.sin(t) * flicker;
		};
	}

	return overlay;
}
