import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PIXI: Graphics/Container record draw calls; generateTexture returns a
// fresh sentinel object each call so we can prove the cache reuses instances.
vi.mock('pixi.js', () => {
	class Graphics {
		circle() {
			return this;
		}
		rect() {
			return this;
		}
		fill() {
			return this;
		}
	}
	class Container {
		children: unknown[] = [];
		addChild(c: unknown) {
			this.children.push(c);
			return c;
		}
	}
	class Texture {}
	return { Graphics, Container, Texture };
});

import {
	buildStarGlow,
	buildSphere,
	buildNebulaLayer,
	buildStarfieldLayer,
	clearTextureCache
} from './textures';

function fakeRenderer() {
	return { generateTexture: vi.fn(() => ({})) };
}

describe('procedural textures', () => {
	beforeEach(() => clearTextureCache());

	it('bakes a star glow texture via the renderer', () => {
		const r = fakeRenderer();
		const tex = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(tex).toBeDefined();
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
	});

	it('caches by params: identical params reuse the texture, changed params rebake', () => {
		const r = fakeRenderer();
		const a = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		const b = buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(b).toBe(a);
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
		buildStarGlow(r as never, { color: 0x00ff00, radius: 10, alpha: 0.3 });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});

	it('bakes a banded sphere from a multi-layer container', () => {
		const r = fakeRenderer();
		buildSphere(r as never, {
			radius: 8,
			color: 0x3366ff,
			surface: 'bands',
			lightAngle: 0.6,
			seed: 3
		});
		expect(r.generateTexture).toHaveBeenCalledTimes(1);
	});

	it('bakes nebula and starfield layers deterministically (no rebake on identical params)', () => {
		const r = fakeRenderer();
		buildNebulaLayer(r as never, { size: 512, seed: 1, colors: [0x112233], blobCount: 4 });
		buildNebulaLayer(r as never, { size: 512, seed: 1, colors: [0x112233], blobCount: 4 });
		buildStarfieldLayer(r as never, { size: 512, seed: 2, count: 50, tint: 0xffffff });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});

	it('clearTextureCache forces a rebake', () => {
		const r = fakeRenderer();
		buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		clearTextureCache();
		buildStarGlow(r as never, { color: 0xff0000, radius: 10, alpha: 0.3 });
		expect(r.generateTexture).toHaveBeenCalledTimes(2);
	});
});
