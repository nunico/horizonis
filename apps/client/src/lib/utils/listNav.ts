/**
 * Compute the next highlighted index for a keyboard-navigable list.
 * ArrowDown/ArrowUp wrap around; any other key leaves the index unchanged.
 * Returns 0 when the list is empty.
 */
export function nextIndex(current: number, total: number, key: string): number {
	if (total <= 0) return 0;
	if (key === 'ArrowDown') return (current + 1) % total;
	if (key === 'ArrowUp') return (current - 1 + total) % total;
	return current;
}
