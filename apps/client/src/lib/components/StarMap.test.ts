import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import StarMap from './StarMap.svelte';
import { cluster } from '$lib/stores/clusterData';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

// ---------------------------------------------------------------------------
// Mock $lib/stores/style so tests never touch real PIXI renderer code paths.
// vi.hoisted ensures the object is available when vi.mock factory runs.
// ---------------------------------------------------------------------------
const { mockActiveStyle } = vi.hoisted(() => {
	const mockActiveStyle = {
		meta: { id: 'test-style', name: 'Test', version: '1' },
		colors: {
			background: 0x000000,
			accent: 0xffffff,
			hover: 0xaaaaaa,
			linkIdle: 0x555555,
			orbitHover: 0x888888,
			region: 0x333333,
			labelPrimary: 0xffffff,
			labelSecondary: 0xaaaaaa,
			systemFill: 0x0088ff
		},
		labelStyle: vi.fn(() => ({})),
		createSystemNodeVisual: vi.fn(() => ({ anchor: { set: vi.fn() }, addChild: vi.fn() })),
		createStageOverlay: vi.fn(() => null),
		createBackground: vi.fn(() => null),
		parallaxBackground: vi.fn(),
		stylePortal: vi.fn(),
		styleOrbit: vi.fn(),
		styleRegion: vi.fn(),
		createStarVisual: vi.fn(() => ({ anchor: { set: vi.fn() }, addChild: vi.fn() })),
		createBodyVisual: vi.fn(() => ({ anchor: { set: vi.fn() }, addChild: vi.fn() }))
	};
	return { mockActiveStyle };
});

vi.mock('$lib/stores/style', () => {
	return {
		activeStyle: {
			subscribe: (run: (value: typeof mockActiveStyle) => void) => {
				run(mockActiveStyle);
				return () => {};
			}
		},
		activeStyleId: { subscribe: vi.fn() },
		availableStyles: { subscribe: vi.fn() },
		setActiveStyle: vi.fn(),
		DEFAULT_STYLE_ID: 'test-style'
	};
});

// Mock PIXI.js
vi.mock('pixi.js', () => {
	const Application = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.init = vi.fn().mockResolvedValue(undefined);
		this.destroy = vi.fn();
		this.stage = { addChild: vi.fn(), addChildAt: vi.fn() };
		this.screen = { width: 800, height: 600 };
		this.renderer = {
			on: vi.fn(),
			off: vi.fn(),
			events: { pointer: { global: null } },
			background: { color: 0 },
			generateTexture: vi.fn(() => ({}))
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
		this.moveTo = vi.fn().mockReturnThis();
		this.lineTo = vi.fn().mockReturnThis();
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
	const Circle = vi.fn().mockImplementation(function (
		this: Record<string, unknown>,
		x: number,
		y: number,
		radius: number
	) {
		this.x = x;
		this.y = y;
		this.radius = radius;
		return this;
	});
	return { Application, Graphics, Text, Container, Circle };
});

// Mock pixi-viewport
vi.mock('pixi-viewport', () => ({
	Viewport: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.drag = vi.fn().mockReturnThis();
		this.pinch = vi.fn().mockReturnThis();
		this.wheel = vi.fn().mockReturnThis();
		this.decelerate = vi.fn().mockReturnThis();
		this.moveCenter = vi.fn((x: number, y: number) => {
			this.center = { x, y };
		});
		this.on = vi.fn();
		this.addChild = vi.fn();
		this.removeChildren = vi.fn().mockReturnValue([]);
		this.resize = vi.fn();
		this.setZoom = vi.fn((scale: number) => {
			this.scale = { x: scale, y: scale };
		});
		this.clampZoom = vi.fn();
		this.clamp = vi.fn();
		this.toWorld = vi.fn((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
		this.plugins = {
			pause: vi.fn(),
			resume: vi.fn(),
			remove: vi.fn()
		};
		this.screenWidth = 800;
		this.screenHeight = 600;
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

	it('makes system nodes interactive', async () => {
		render(StarMap);

		await vi.waitFor(() => {
			// Find the graphics instance that has systemId (the solar system node)
			const graphicsInstances = vi.mocked(PIXI.Graphics).mock.results.map((r) => r.value);
			const systemNode = graphicsInstances.find((g) => g.systemId === 'sys1');
			expect(systemNode).toBeDefined();
		});

		const graphicsInstances = vi.mocked(PIXI.Graphics).mock.results.map((r) => r.value);
		const systemNode = graphicsInstances.find((g) => g.systemId === 'sys1');

		expect(systemNode.eventMode).toBe('static');
		expect(systemNode.cursor).toBe('pointer');
		expect(systemNode.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
	});

	it('centers the initial camera on the rendered cluster before interaction', async () => {
		// Arrange
		cluster.set({
			Name: 'Wide Cluster',
			Systems: [
				{
					Id: 'left',
					Name: 'Left',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				},
				{
					Id: 'right',
					Name: 'Right',
					X: 1000,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});

		// Act
		render(StarMap);

		// Assert
		let viewportInstance: unknown;
		await vi.waitFor(() => {
			viewportInstance = vi.mocked(Viewport).mock.results[0].value;
			expect(
				(viewportInstance as { moveCenter: ReturnType<typeof vi.fn> }).moveCenter
			).toHaveBeenCalled();
		});

		const viewportMock = viewportInstance as {
			moveCenter: ReturnType<typeof vi.fn>;
			setZoom: ReturnType<typeof vi.fn>;
			clamp: ReturnType<typeof vi.fn>;
			plugins: { remove: ReturnType<typeof vi.fn> };
			scale: { x: number };
		};

		// Stale clamp must be removed before setZoom (which calls moveCenter internally)
		// to prevent a clamp set during a pre-render resize from snapping the camera.
		expect(viewportMock.plugins.remove).toHaveBeenCalledWith('clamp');
		expect(viewportMock.plugins.remove.mock.invocationCallOrder.at(-1)!).toBeLessThan(
			viewportMock.setZoom.mock.invocationCallOrder.at(-1)!
		);
		expect(viewportMock.setZoom.mock.invocationCallOrder.at(-1)!).toBeLessThan(
			viewportMock.clamp.mock.invocationCallOrder.at(-1)!
		);
		expect(viewportMock.moveCenter).toHaveBeenLastCalledWith(
			expect.closeTo(500, 2),
			expect.closeTo(-69.49, 2)
		);
		expect(viewportMock.clamp).toHaveBeenLastCalledWith(
			expect.objectContaining({
				underflow: 'center',
				left: expect.closeTo(-675.29, 2),
				right: expect.closeTo(1492.65, 2),
				top: expect.closeTo(-813.97, 2),
				bottom: expect.closeTo(675.0, 2)
			})
		);
	});

	it('keeps zoomed-in pan bounds clear of the fixed cluster overlay', async () => {
		// Arrange
		cluster.set({
			Name: 'Wide Cluster',
			Systems: [
				{
					Id: 'left',
					Name: 'Left',
					X: 0,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				},
				{
					Id: 'right',
					Name: 'Right',
					X: 1000,
					Y: 0,
					Stars: [],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});

		// Act
		render(StarMap);

		let viewportInstance: unknown;
		await vi.waitFor(() => {
			viewportInstance = vi.mocked(Viewport).mock.results[0].value;
			expect((viewportInstance as { clamp: ReturnType<typeof vi.fn> }).clamp).toHaveBeenCalled();
		});

		const viewportMock = viewportInstance as {
			on: ReturnType<typeof vi.fn>;
			clamp: ReturnType<typeof vi.fn>;
			scale: { x: number; y: number };
		};
		viewportMock.clamp.mockClear();
		viewportMock.scale = { x: 4, y: 4 };
		const zoomedHandler = viewportMock.on.mock.calls.find(([event]) => event === 'zoomed')?.[1] as
			| (() => void)
			| undefined;
		zoomedHandler?.();

		// Assert
		expect(viewportMock.clamp).toHaveBeenLastCalledWith(
			expect.objectContaining({
				left: expect.closeTo(-104, 2),
				top: expect.closeTo(-554, 2)
			})
		);
	});

	it('gives system nodes an explicit hit area so they stay clickable regardless of style', async () => {
		render(StarMap);

		await vi.waitFor(() => {
			const graphicsInstances = vi.mocked(PIXI.Graphics).mock.results.map((r) => r.value);
			const systemNode = graphicsInstances.find((g) => g.systemId === 'sys1');
			expect(systemNode).toBeDefined();
		});

		const graphicsInstances = vi.mocked(PIXI.Graphics).mock.results.map((r) => r.value);
		const systemNode = graphicsInstances.find((g) => g.systemId === 'sys1');

		// A style may draw the node as a stroke-only ring (no fill); hit testing
		// must not depend on the drawn geometry.
		expect(systemNode.hitArea).toBeDefined();
		expect(systemNode.hitArea.radius).toBeGreaterThan(0);
	});

	it('asks the active style for a background on mount', async () => {
		render(StarMap);
		await vi.waitFor(() => {
			expect(mockActiveStyle.createBackground).toHaveBeenCalled();
		});
	});

	it('arms a drag on pointerdown but only starts dragging past the threshold', async () => {
		render(StarMap);

		type MockNode = Record<string, unknown> & { on: ReturnType<typeof vi.fn> };
		let systemNode: MockNode | undefined;
		await vi.waitFor(() => {
			const graphicsInstances = vi.mocked(PIXI.Graphics).mock.results.map((r) => r.value);
			systemNode = graphicsInstances.find((g) => g.systemId === 'sys1') as MockNode | undefined;
			expect(systemNode).toBeDefined();
		});

		const viewportInstance = vi.mocked(Viewport).mock.results[0].value as Record<
			string,
			unknown
		> & {
			on: ReturnType<typeof vi.fn>;
			plugins: { pause: ReturnType<typeof vi.fn> };
		};

		const pointerdownHandler = systemNode!.on.mock.calls.find(
			(call: unknown[]) => call[0] === 'pointerdown'
		)![1] as (e: { stopPropagation: () => void; global: { x: number; y: number } }) => void;

		const pointermoveHandler = viewportInstance.on.mock.calls.find(
			(call: unknown[]) => call[0] === 'pointermove'
		)![1] as (e: { global: { x: number; y: number } }) => void;

		// Press: selects and arms, but does not start dragging.
		pointerdownHandler({ stopPropagation: vi.fn(), global: { x: 100, y: 100 } });
		expect(viewportInstance.plugins.pause).not.toHaveBeenCalled();
		expect(systemNode!.cursor).toBe('pointer');

		// Tiny movement within the threshold: still not dragging.
		pointermoveHandler({ global: { x: 101, y: 101 } });
		expect(viewportInstance.plugins.pause).not.toHaveBeenCalled();

		// Movement past the threshold: dragging begins.
		pointermoveHandler({ global: { x: 130, y: 130 } });
		expect(viewportInstance.plugins.pause).toHaveBeenCalledWith('drag');
		expect(systemNode!.cursor).toBe('grabbing');
	});
});
