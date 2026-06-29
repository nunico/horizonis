import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SolarSystemMap from './SolarSystemMap.svelte';
import { cluster } from '$lib/stores/clusterData';
import { activeSystemId, selectedEntity, viewMode } from '$lib/stores/appState';
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
			events: {},
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
		this.hitArea = {};
		return this;
	});
	const Text = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.anchor = { set: vi.fn() };
		this.addChild = vi.fn();
		this.scale = { set: vi.fn() };
		this.y = 0;
		return this;
	});
	const Container = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
		this.addChild = vi.fn();
		this.removeChild = vi.fn();
		this.destroy = vi.fn();
		this.on = vi.fn();
		this.x = 0;
		this.y = 0;
		this.scale = { set: vi.fn() };
		this.eventMode = 'none';
		this.cursor = 'default';
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

describe('SolarSystemMap component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		const mockCluster = {
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [
						{
							Id: 'star1',
							Name: 'Star 1',
							SpectralClass: 'G2V',
							MassSol: 1.0,
							RadiusSol: 1.0,
							OrbitAu: 0.0,
							Satellites: [],
							OrbitalRegions: []
						}
					],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		};
		cluster.set(mockCluster);
		activeSystemId.set('sys1');
		selectedEntity.set(null);
		viewMode.set('system');
	});

	it('initializes PIXI application and viewport on mount', async () => {
		render(SolarSystemMap);

		await vi.waitFor(() => {
			expect(PIXI.Application).toHaveBeenCalled();
			expect(Viewport).toHaveBeenCalled();
		});
	});

	it('destroys PIXI application on unmount', async () => {
		const { unmount } = render(SolarSystemMap);

		let appInstance: unknown;
		await vi.waitFor(() => {
			appInstance = vi.mocked(PIXI.Application).mock.results[0].value;
			expect(appInstance).toBeDefined();
		});

		unmount();

		expect((appInstance as { destroy: () => void }).destroy).toHaveBeenCalled();
	});

	it('handles resize events', async () => {
		render(SolarSystemMap);

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

	it('asks the active style for a background on mount', async () => {
		render(SolarSystemMap);
		await vi.waitFor(() => {
			expect(mockActiveStyle.createBackground).toHaveBeenCalled();
		});
	});

	it('clears system state when returning to the cluster', async () => {
		const selectedStar = get(cluster)?.Systems?.[0]?.Stars?.[0] ?? null;
		selectedEntity.set(selectedStar);

		const { getByRole } = render(SolarSystemMap);

		await fireEvent.click(getByRole('button', { name: 'Back to Cluster' }));

		expect(get(viewMode)).toBe('cluster');
		expect(get(activeSystemId)).toBeNull();
		expect(get(selectedEntity)).toBeNull();
	});
});
