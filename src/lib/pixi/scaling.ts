export type ScaleMode = 'linear' | 'log';

export interface ScaleConfig {
	auToPixels: number;
	mode: ScaleMode;
}

export function auToPixels(au: number, config: ScaleConfig): number {
	if (config.mode === 'linear') {
		return au * config.auToPixels;
	} else {
		// Log scale: useful for viewing distant planets
		// log10(1) = 0, log10(10) = 1, etc.
		// We add 1 to au so that 0 AU is 0 and 1 AU is some base value.
		// Multiply by 10 to give it some spread.
		return Math.log10(au + 1) * config.auToPixels * 5;
	}
}
