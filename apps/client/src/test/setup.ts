import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Node 22+ exposes an experimental `localStorage` global getter that returns
// `undefined` unless `--localstorage-file` is set. Because vitest's jsdom
// environment shares a single global object (`window === globalThis`), that
// getter shadows jsdom's storage and breaks any code touching localStorage.
//
// Back the global `Storage.prototype` (provided by jsdom) with an in-memory
// Map keyed per instance, then expose an instance as `localStorage`. Routing
// through `Storage.prototype` keeps the spec contract intact, so tests that
// spy on `Storage.prototype.setItem` to simulate failures still work.
const backing = new WeakMap<Storage, Map<string, string>>();
const storeFor = (self: Storage): Map<string, string> => {
	let store = backing.get(self);
	if (!store) {
		store = new Map<string, string>();
		backing.set(self, store);
	}
	return store;
};

Object.defineProperties(Storage.prototype, {
	length: {
		configurable: true,
		get(this: Storage): number {
			return storeFor(this).size;
		}
	},
	clear: {
		configurable: true,
		writable: true,
		value(this: Storage): void {
			storeFor(this).clear();
		}
	},
	getItem: {
		configurable: true,
		writable: true,
		value(this: Storage, key: string): string | null {
			const store = storeFor(this);
			return store.has(key) ? store.get(key)! : null;
		}
	},
	key: {
		configurable: true,
		writable: true,
		value(this: Storage, index: number): string | null {
			return [...storeFor(this).keys()][index] ?? null;
		}
	},
	removeItem: {
		configurable: true,
		writable: true,
		value(this: Storage, key: string): void {
			storeFor(this).delete(key);
		}
	},
	setItem: {
		configurable: true,
		writable: true,
		value(this: Storage, key: string, value: string): void {
			storeFor(this).set(key, String(value));
		}
	}
});

Object.defineProperty(globalThis, 'localStorage', {
	configurable: true,
	value: Object.create(Storage.prototype) as Storage
});

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/path', () => ({
	appDataDir: vi.fn(() => Promise.resolve('/mock/app/data'))
}));
