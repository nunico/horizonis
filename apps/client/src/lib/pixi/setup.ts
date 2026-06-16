import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { MAP_COLORS } from '$lib/theme';

export interface PixiSetupOptions {
	container: HTMLElement;
	backgroundColor?: number;
	worldWidth?: number;
	worldHeight?: number;
	app?: PIXI.Application;
}

export async function setupPixi(options: PixiSetupOptions, onResize?: () => void) {
	const app = options.app ?? new PIXI.Application();
	try {
		await app.init({
			resizeTo: options.container,
			antialias: true,
			backgroundColor: options.backgroundColor ?? MAP_COLORS.background
		});
	} catch (e) {
		console.error('[PixiSetup] app.init failed:', e);
		throw e;
	}

	options.container.appendChild(app.canvas);

	const viewport = new Viewport({
		screenWidth: app.screen.width,
		screenHeight: app.screen.height,
		worldWidth: options.worldWidth ?? 10000,
		worldHeight: options.worldHeight ?? 10000,
		events: app.renderer.events
	});

	app.stage.addChild(viewport);
	viewport.drag().pinch().wheel().decelerate();

	const resizeHandler = () => {
		viewport.resize(app.screen.width, app.screen.height);
		onResize?.();
	};
	app.renderer.on('resize', resizeHandler);

	return { app, viewport, resizeHandler };
}
