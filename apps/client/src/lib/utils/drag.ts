export interface ScreenPoint {
	x: number;
	y: number;
}

/**
 * True once the pointer has travelled more than `threshold` pixels from where
 * the press started — the signal to promote a press into a drag. Comparing in
 * screen space keeps the threshold zoom-independent.
 */
export function exceedsDragThreshold(
	start: ScreenPoint,
	current: ScreenPoint,
	threshold: number
): boolean {
	return Math.hypot(current.x - start.x, current.y - start.y) > threshold;
}
