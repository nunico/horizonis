import { describe, it, expect, afterEach } from 'vitest';
import { isE2EDebugEnabled } from './e2e';

describe('isE2EDebugEnabled', () => {
	afterEach(() => {
		delete (window as { PUBLIC_E2E?: unknown }).PUBLIC_E2E;
	});

	it('is true when window.PUBLIC_E2E is the string "1"', () => {
		(window as { PUBLIC_E2E?: unknown }).PUBLIC_E2E = '1';
		expect(isE2EDebugEnabled()).toBe(true);
	});

	it('is true when window.PUBLIC_E2E is boolean true', () => {
		(window as { PUBLIC_E2E?: unknown }).PUBLIC_E2E = true;
		expect(isE2EDebugEnabled()).toBe(true);
	});

	it('always returns a boolean (never undefined)', () => {
		expect(typeof isE2EDebugEnabled()).toBe('boolean');
	});
});
