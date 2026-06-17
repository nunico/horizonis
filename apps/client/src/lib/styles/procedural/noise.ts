/**
 * Deterministic pseudo-random generator (mulberry32). Returns a function that
 * yields the next value in [0, 1). The same seed always produces the same
 * sequence, so procedural star fields are stable across reloads and users.
 * Time complexity: O(1) per call.
 */
export function createRng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
