import type {
	StyleDefinition,
	StarShape,
	BodyShape,
	NodeShape,
	SpectralClass,
	RampShade,
	RampOverride
} from './types';
import { SPECTRAL_CLASSES, RAMP_SHADES } from './types';
import type { BodyType } from '$lib/types/stellar';

/**
 * Result of validating untrusted (imported) style JSON. Hand-written rather than
 * schema-library backed to avoid a new dependency; swap to zod if the schema
 * grows. Returns a typed `StyleDefinition` on success or a human-readable path
 * to the first offending field.
 */
export type ValidationResult = { ok: true; value: StyleDefinition } | { ok: false; error: string };

const BODY_TYPES: readonly BodyType[] = ['Planet', 'Moon', 'SpaceStation', 'DwarfPlanet', 'Comet'];

const STAR_SHAPES: readonly StarShape[] = ['disc', 'ring', 'gradient', 'sphere'];
const BODY_SHAPES: readonly BodyShape[] = ['disc', 'ring', 'banded', 'sphere'];
const NODE_SHAPES: readonly NodeShape[] = ['disc', 'ring'];

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

class ValidationError extends Error {}

function fail(path: string, detail = 'is missing or invalid'): never {
	throw new ValidationError(`${path} ${detail}`);
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'must be an object');
	}
	return value as Record<string, unknown>;
}

function str(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.length === 0) fail(path, 'must be a string');
	return value;
}

function optionalStr(value: unknown, path: string): string | undefined {
	if (value === undefined) return undefined;
	return str(value, path);
}

function num(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a number');
	return value;
}

function optionalNum(value: unknown, path: string): number | undefined {
	if (value === undefined) return undefined;
	return num(value, path);
}

function hex(value: unknown, path: string): string {
	const s = str(value, path);
	if (!HEX_RE.test(s)) fail(path, 'must be a #RRGGBB color');
	return s;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
	const s = str(value, path);
	if (!allowed.includes(s as T)) {
		fail(path, `must be one of ${allowed.join(', ')}`);
	}
	return s as T;
}

function stroke(value: unknown, path: string) {
	const r = asRecord(value, path);
	return { width: num(r.width, `${path}.width`), alpha: num(r.alpha, `${path}.alpha`) };
}

function glow(value: unknown, path: string) {
	if (value === undefined) return undefined;
	const r = asRecord(value, path);
	return {
		radiusFactor: num(r.radiusFactor, `${path}.radiusFactor`),
		alpha: num(r.alpha, `${path}.alpha`)
	};
}

function hexArray(value: unknown, path: string): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		fail(path, 'must be a non-empty array');
	}
	return (value as unknown[]).map((c, i) => hex(c, `${path}[${i}]`));
}

function numArray(value: unknown, path: string): number[] {
	if (!Array.isArray(value) || value.length === 0) {
		fail(path, 'must be a non-empty array');
	}
	return (value as unknown[]).map((n, i) => num(n, `${path}[${i}]`));
}

function background(value: unknown, path: string) {
	if (value === undefined) return undefined;
	const r = asRecord(value, path);
	return {
		kind: oneOf(r.kind, ['parallax-starfield'] as const, `${path}.kind`),
		seed: num(r.seed, `${path}.seed`),
		density: num(r.density, `${path}.density`),
		nebulaColors: hexArray(r.nebulaColors, `${path}.nebulaColors`),
		parallaxFactors: numArray(r.parallaxFactors, `${path}.parallaxFactors`)
	};
}

function parse(input: unknown): StyleDefinition {
	const root = asRecord(input, 'style');

	const meta = asRecord(root.meta, 'meta');
	const metaOut = {
		id: str(meta.id, 'meta.id'),
		name: str(meta.name, 'meta.name'),
		version: str(meta.version, 'meta.version'),
		author: optionalStr(meta.author, 'meta.author'),
		description: optionalStr(meta.description, 'meta.description')
	};

	const palette = asRecord(root.palette, 'palette');
	const spectralIn = asRecord(palette.spectral, 'palette.spectral');
	const spectral = { default: hex(spectralIn.default, 'palette.spectral.default') } as Record<
		SpectralClass | 'default',
		string
	>;
	for (const cls of SPECTRAL_CLASSES) {
		spectral[cls] = hex(spectralIn[cls], `palette.spectral.${cls}`);
	}

	const bodyIn = asRecord(palette.body, 'palette.body');
	const body = { default: hex(bodyIn.default, 'palette.body.default') } as Record<
		BodyType | 'default',
		string
	>;
	for (const t of BODY_TYPES) {
		body[t] = hex(bodyIn[t], `palette.body.${t}`);
	}

	const paletteOut = {
		accent: hex(palette.accent, 'palette.accent'),
		hover: hex(palette.hover, 'palette.hover'),
		linkIdle: hex(palette.linkIdle, 'palette.linkIdle'),
		orbitHover: hex(palette.orbitHover, 'palette.orbitHover'),
		region: hex(palette.region, 'palette.region'),
		labelPrimary: hex(palette.labelPrimary, 'palette.labelPrimary'),
		labelSecondary: hex(palette.labelSecondary, 'palette.labelSecondary'),
		systemFill: hex(palette.systemFill, 'palette.systemFill'),
		spectral,
		body
	};

	const star = asRecord(root.star, 'star');
	const bodyShape = asRecord(root.body, 'body');
	const systemNode = asRecord(root.systemNode, 'systemNode');
	const strokeIn = asRecord(root.stroke, 'stroke');
	const label = asRecord(root.label, 'label');

	const result: StyleDefinition = {
		meta: metaOut,
		backgroundColor: hex(root.backgroundColor, 'backgroundColor'),
		palette: paletteOut,
		star: {
			shape: oneOf(star.shape, STAR_SHAPES, 'star.shape'),
			glow: glow(star.glow, 'star.glow')
		},
		body: {
			shape: oneOf(bodyShape.shape, BODY_SHAPES, 'body.shape'),
			glow: glow(bodyShape.glow, 'body.glow')
		},
		systemNode: {
			shape: oneOf(systemNode.shape, NODE_SHAPES, 'systemNode.shape'),
			glow: glow(systemNode.glow, 'systemNode.glow')
		},
		stroke: {
			orbit: stroke(strokeIn.orbit, 'stroke.orbit'),
			portal: stroke(strokeIn.portal, 'stroke.portal'),
			region: stroke(strokeIn.region, 'stroke.region')
		},
		label: {
			fontFamily: str(label.fontFamily, 'label.fontFamily'),
			fontSize: num(label.fontSize, 'label.fontSize'),
			letterSpacing: optionalNum(label.letterSpacing, 'label.letterSpacing')
		}
	};

	if (root.ui !== undefined) {
		const ui = asRecord(root.ui, 'ui');
		const uiOut: StyleDefinition['ui'] = { fontFamily: str(ui.fontFamily, 'ui.fontFamily') };
		if (ui.ramps !== undefined) {
			const ramps = asRecord(ui.ramps, 'ui.ramps');
			const parseRamp = (value: unknown, name: string): RampOverride | undefined => {
				if (value === undefined) return undefined;
				const r = asRecord(value, name);
				const out: RampOverride = {};
				for (const shade of RAMP_SHADES) {
					if (r[shade] !== undefined) {
						out[shade as RampShade] = hex(r[shade], `${name}.${shade}`);
					}
				}
				return out;
			};
			uiOut.ramps = {
				slate: parseRamp(ramps.slate, 'ui.ramps.slate'),
				sky: parseRamp(ramps.sky, 'ui.ramps.sky')
			};
		}
		result.ui = uiOut;
	}

	if (root.effects !== undefined) {
		const effects = asRecord(root.effects, 'effects');
		result.effects = {};
		if (effects.scanlines !== undefined) {
			const s = asRecord(effects.scanlines, 'effects.scanlines');
			result.effects.scanlines = {
				intensity: num(s.intensity, 'effects.scanlines.intensity'),
				lineSpacing: num(s.lineSpacing, 'effects.scanlines.lineSpacing'),
				flicker: optionalNum(s.flicker, 'effects.scanlines.flicker')
			};
		}
		if (effects.bloom !== undefined) {
			const b = asRecord(effects.bloom, 'effects.bloom');
			result.effects.bloom = { strength: num(b.strength, 'effects.bloom.strength') };
		}
	}

	if (root.background !== undefined) {
		result.background = background(root.background, 'background');
	}

	return result;
}

export function validateStyleDefinition(input: unknown): ValidationResult {
	try {
		return { ok: true, value: parse(input) };
	} catch (e) {
		if (e instanceof ValidationError) return { ok: false, error: e.message };
		throw e;
	}
}
