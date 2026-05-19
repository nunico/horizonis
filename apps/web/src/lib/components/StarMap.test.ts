import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import StarMap from './StarMap.svelte';
import { cluster } from '../stores/clusterData';
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
	const Graphics = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.circle = vi.fn().mockReturnThis();
		this.fill = vi.fn().mockReturnThis();
		this.on = vi.fn();
		this.addChild = vi.fn();
		this.clear = vi.fn().mockReturnThis();
		this.lineStyle = vi.fn().mockReturnThis();
		this.drawCircle = vi.fn().mockReturnThis();
		this.rect = vi.fn().mockReturnThis();
		this.stroke = vi.fn().mockReturnThis();
		this.x = 0;
		this.y = 0;
		this.scale = { set: vi.fn() };
		this.eventMode = 'none';
		this.cursor = 'default';
		return this;
	});
	const Text = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.anchor = { set: vi.fn() };
		this.addChild = vi.fn();
		this.y = 0;
		return this;
	});
	const Container = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.addChild = vi.fn();
		this.removeChild = vi.fn();
		this.destroy = vi.fn();
		return this;
	});
	return { Application, Graphics, Text, Container };
});

// Mock pixi-viewport
vi.mock('pixi-viewport', () => ({
	Viewport: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.drag = vi.fn().mockReturnThis();
		this.pinch = vi.fn().mockReturnThis();
		this.wheel = vi.fn().mockReturnThis();
		this.decelerate = vi.fn().mockReturnThis();
		this.moveCenter = vi.fn();
		this.on = vi.fn();
		this.addChild = vi.fn();
		this.removeChildren = vi.fn().mockReturnValue([]);
		this.resize = vi.fn();
		this.setZoom = vi.fn();
		this.clampZoom = vi.fn();
		this.clamp = vi.fn();
		this.scale = { x: 1, y: 1 };
		this.center = { x: 0, y: 0 };
		return this;
	})
}));

describe('StarMap component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
	});

	it('initializes PIXI application and viewport on mount', async () => {
		render(StarMap);

		// Wait for onMount async calls
		await vi.waitFor(() => {
			expect(PIXI.Application).toHaveBeenCalled();
			expect(Viewport).toHaveBeenCalled();
		});
	});

	it('destroys PIXI application on unmount', async () => {
		const { unmount } = render(StarMap);

		let appInstance: unknown;
		await vi.waitFor(() => {
			appInstance = vi.mocked(PIXI.Application).mock.results[0].value;
			expect(appInstance).toBeDefined();
		});

		unmount();

		expect((appInstance as { destroy: () => void }).destroy).toHaveBeenCalled();
	});

	it('handles resize events', async () => {
		render(StarMap);

		let appInstance: unknown;
		let viewportInstance: unknown;
		await vi.waitFor(() => {
			appInstance = vi.mocked(PIXI.Application).mock.results[0].value;
			viewportInstance = vi.mocked(Viewport).mock.results[0].value;
			expect(
				(appInstance as { renderer: { on: (...args: unknown[]) => unknown } }).renderer.on
			).toHaveBeenCalledWith('resize', expect.any(Function));
		});

		const calls = vi.mocked(
			(appInstance as { renderer: { on: (...args: unknown[]) => unknown } }).renderer
				.on as unknown as {
				mock: { calls: unknown[][] };
			}
		).mock.calls as unknown[][];
		const resizeHandler = (
			calls.find((c) => (c as unknown[])[0] === 'resize') as unknown[]
		)[1] as () => void;

		resizeHandler();

		expect((viewportInstance as { resize: () => void }).resize).toHaveBeenCalled();
	});
});
