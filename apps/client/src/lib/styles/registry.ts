import type { MapStyle } from './types';

export interface RegisterOptions {
	/** Allow replacing a style already registered under the same id. */
	overwrite?: boolean;
}

/**
 * In-memory, insertion-ordered registry of available map styles. Holds runtime
 * {@link MapStyle} objects regardless of whether they came from a declarative
 * definition or a hand-written escape-hatch.
 */
export class StyleRegistry {
	#styles = new Map<string, MapStyle>();

	register(style: MapStyle, options: RegisterOptions = {}): void {
		const { id } = style.meta;
		if (this.#styles.has(id) && !options.overwrite) {
			throw new Error(`Style "${id}" is already registered`);
		}
		this.#styles.set(id, style);
	}

	get(id: string): MapStyle | undefined {
		return this.#styles.get(id);
	}

	has(id: string): boolean {
		return this.#styles.has(id);
	}

	list(): MapStyle[] {
		return [...this.#styles.values()];
	}
}
