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
	const createdTexts: Array<{
		text: string;
		y: number;
		anchor: { set: ReturnType<typeof vi.fn> };
	}> = [];
	const createdContainers: Array<Record<string, unknown>> = [];
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
		this.hitArea = {};
		return this;
	});
	const Text = vi.fn().mockImplementation(function (
		this: Record<string, unknown>,
		options?: { text?: string }
	) {
		this.anchor = { set: vi.fn() };
		this.addChild = vi.fn();
		this.scale = { set: vi.fn() };
		this.y = 0;
		this.text = options?.text ?? '';
		createdTexts.push(
			this as { text: string; y: number; anchor: { set: ReturnType<typeof vi.fn> } }
		);
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
		createdContainers.push(this);
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
	return {
		Application,
		Graphics,
		Text,
		Container,
		Circle,
		__createdTexts: createdTexts,
		__createdContainers: createdContainers
	};
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
		this.screenWidth = 800;
		this.screenHeight = 600;
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
							CompanionDistanceAu: 0.0,
							CompanionAngleRad: 0.0,
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

	it('centers the initial camera on the system origin before interaction', async () => {
		// Arrange / Act
		render(SolarSystemMap);

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
		};
		const clampConfig = viewportMock.clamp.mock.lastCall?.[0] as {
			underflow?: string;
			left: number;
			right: number;
			top: number;
			bottom: number;
		};

		expect(viewportMock.setZoom.mock.invocationCallOrder.at(-1)!).toBeLessThan(
			viewportMock.clamp.mock.invocationCallOrder.at(-1)!
		);
		expect(viewportMock.moveCenter).toHaveBeenLastCalledWith(
			expect.closeTo(0, 2),
			expect.closeTo(-14.11, 2)
		);
		expect(clampConfig).toEqual(
			expect.objectContaining({
				underflow: 'center'
			})
		);
		expect(clampConfig.left).toBeLessThan(0);
		expect(clampConfig.right).toBeGreaterThan(0);
		expect(clampConfig.top).toBeLessThan(-14.11);
		expect(clampConfig.bottom).toBeGreaterThan(-14.11);
	});

	it('keeps zoomed-in pan bounds clear of the fixed object overlay', async () => {
		// Arrange / Act
		render(SolarSystemMap);

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
				left: expect.closeTo(-115.05, 2),
				top: expect.closeTo(-82, 2)
			})
		);
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

	it('renders a multi-star system overview using main-star-relative positions', async () => {
		// Arrange
		const stars = [
			{
				Id: 'main',
				Name: 'Main Star',
				SpectralClass: 'G2V',
				MassSol: 1,
				RadiusSol: 1,
				OrbitAu: 0,
				CompanionDistanceAu: 0,
				CompanionAngleRad: 0,
				Satellites: [],
				OrbitalRegions: []
			},
			{
				Id: 'companion',
				Name: 'Companion Star',
				SpectralClass: 'M5V',
				MassSol: 0.2,
				RadiusSol: 0.2,
				OrbitAu: 75,
				CompanionDistanceAu: 75,
				CompanionAngleRad: Math.PI / 2,
				Satellites: [],
				OrbitalRegions: []
			}
		];
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: stars,
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});

		// Act
		render(SolarSystemMap);

		// Assert
		await vi.waitFor(() => {
			const containers = (
				PIXI as unknown as { __createdContainers: Array<{ x: number; y: number }> }
			).__createdContainers;
			expect(containers.some((container) => Math.abs(container.x) < 0.001 && container.y > 0)).toBe(
				true
			);
		});
	});

	it('keeps system-wide orbital bodies visible in overview mode', async () => {
		// Arrange
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [
						{
							Id: 'main',
							Name: 'Main Star',
							SpectralClass: 'G2V',
							MassSol: 1,
							RadiusSol: 1,
							OrbitAu: 0,
							CompanionDistanceAu: 0,
							CompanionAngleRad: 0,
							Satellites: [],
							OrbitalRegions: []
						}
					],
					OrbitalBodies: [
						{
							Id: 'circumbinary-planet',
							Name: 'Circumbinary Planet',
							BodyType: 'Planet' as const,
							OrbitAu: 8,
							RadiusKm: 6371,
							MassEarth: 1,
							Satellites: [],
							Tags: []
						}
					],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});

		// Act
		render(SolarSystemMap);

		// Assert
		await vi.waitFor(() => {
			const texts = (PIXI as unknown as { __createdTexts: Array<{ text: string }> }).__createdTexts;
			expect(texts.some((text) => text.text.includes('Circumbinary Planet'))).toBe(true);
		});
	});

	it('defaults single-star systems to visible detail rendering', async () => {
		// Arrange
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [
						{
							Id: 'main',
							Name: 'Main Star',
							SpectralClass: 'G2V',
							MassSol: 1,
							RadiusSol: 1,
							OrbitAu: 0,
							CompanionDistanceAu: 0,
							CompanionAngleRad: 0,
							Satellites: [
								{
									Id: 'planet-1',
									Name: 'Planet One',
									BodyType: 'Planet' as const,
									OrbitAu: 2,
									RadiusKm: 6371,
									MassEarth: 1,
									Satellites: [],
									Tags: []
								}
							],
							OrbitalRegions: []
						}
					],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
		selectedEntity.set(null);

		// Act
		render(SolarSystemMap);

		// Assert
		await vi.waitFor(() => {
			const texts = (PIXI as unknown as { __createdTexts: Array<{ text: string }> }).__createdTexts;
			expect(texts.some((text) => text.text.includes('Main Star'))).toBe(true);
			expect(texts.some((text) => text.text.includes('Planet One'))).toBe(true);
		});
	});

	it('renders only the selected star detail view and its satellites', async () => {
		// Arrange
		const selectedStar = {
			Id: 'selected-star',
			Name: 'Selected Star',
			SpectralClass: 'K0V',
			MassSol: 0.8,
			RadiusSol: 0.8,
			OrbitAu: 40,
			CompanionDistanceAu: 40,
			CompanionAngleRad: 0,
			Satellites: [
				{
					Id: 'planet-1',
					Name: 'Planet One',
					BodyType: 'Planet' as const,
					OrbitAu: 2,
					RadiusKm: 6371,
					MassEarth: 1,
					Satellites: [],
					Tags: []
				}
			],
			OrbitalRegions: []
		};
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [
						{
							...selectedStar,
							Id: 'overview-only',
							Name: 'Overview Only',
							Satellites: []
						},
						selectedStar
					],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
		selectedEntity.set(selectedStar);

		// Act
		render(SolarSystemMap);

		// Assert
		await vi.waitFor(() => {
			const texts = (PIXI as unknown as { __createdTexts: Array<{ text: string }> }).__createdTexts;
			expect(texts.some((text) => text.text.includes('Selected Star'))).toBe(true);
			expect(texts.some((text) => text.text.includes('Planet One'))).toBe(true);
			expect(texts.some((text) => text.text.includes('Overview Only'))).toBe(false);
		});
	});

	it('includes orbital radius in AU labels', async () => {
		// Arrange
		cluster.set({
			Name: 'Test Cluster',
			Systems: [
				{
					Id: 'sys1',
					Name: 'System 1',
					X: 0,
					Y: 0,
					Stars: [
						{
							Id: 'main',
							Name: 'Main Star',
							SpectralClass: 'G2V',
							MassSol: 1,
							RadiusSol: 1,
							OrbitAu: 0,
							CompanionDistanceAu: 0,
							CompanionAngleRad: 0,
							Satellites: [
								{
									Id: 'planet-1',
									Name: 'Planet One',
									BodyType: 'Planet' as const,
									OrbitAu: 2,
									RadiusKm: 6371,
									MassEarth: 1,
									Satellites: [],
									Tags: []
								}
							],
							OrbitalRegions: []
						}
					],
					OrbitalBodies: [],
					OrbitalRegions: [],
					Portals: []
				}
			]
		});
		selectedEntity.set(clusterValue().Systems[0].Stars[0]);

		// Act
		render(SolarSystemMap);

		// Assert
		await vi.waitFor(() => {
			const texts = (PIXI as unknown as { __createdTexts: Array<{ text: string }> }).__createdTexts;
			expect(
				texts.some((text) => text.text.includes('Planet One') && text.text.includes('2 AU'))
			).toBe(true);
		});
	});
});

function clusterValue() {
	return get(cluster)!;
}
