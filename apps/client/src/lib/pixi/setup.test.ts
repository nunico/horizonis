import { describe, it, expect, vi } from 'vitest';
import { setupPixi } from './setup';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

// Mock PIXI.js
vi.mock('pixi.js', () => {
	const Application = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.init = vi.fn().mockResolvedValue(undefined);
		this.destroy = vi.fn();
		this.stage = { addChild: vi.fn() };
		this.screen = { width: 800, height: 600 };
		this.renderer = {
			on: vi.fn(),
			off: vi.fn(),
			events: {}
		};
		this.canvas = document.createElement('canvas');
		return this;
	});
	return { Application };
});

// Mock pixi-viewport
vi.mock('pixi-viewport', () => ({
	Viewport: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.drag = vi.fn().mockReturnThis();
		this.pinch = vi.fn().mockReturnThis();
		this.wheel = vi.fn().mockReturnThis();
		this.decelerate = vi.fn().mockReturnThis();
		this.addChild = vi.fn();
		this.resize = vi.fn();
		return this;
	})
}));

describe('setupPixi', () => {
	it('should initialize PIXI and Viewport', async () => {
		const container = document.createElement('div');
		const { app, viewport } = await setupPixi({ container });

		expect(PIXI.Application).toHaveBeenCalled();
		expect(app.init).toHaveBeenCalled();
		expect(Viewport).toHaveBeenCalled();
		expect(container.contains(app.canvas)).toBe(true);
		expect(app.stage.addChild).toHaveBeenCalledWith(viewport);
	});

	it('should call onResize when renderer resizes', async () => {
		const container = document.createElement('div');
		const onResize = vi.fn();
		const { app, viewport } = await setupPixi({ container }, onResize);

		// Trigger resize
		const resizeHandler = vi
			.mocked(app.renderer.on)
			.mock.calls.find((c) => c[0] === 'resize')?.[1] as () => void;
		resizeHandler();

		expect(viewport.resize).toHaveBeenCalled();
		expect(onResize).toHaveBeenCalled();
	});
});
