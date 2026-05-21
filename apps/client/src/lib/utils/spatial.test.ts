import { describe, it, expect } from 'vitest';
import { SpatialGrid } from './spatial';

interface MockItem {
	Id: string;
	X: number;
	Y: number;
}

describe('SpatialGrid', () => {
	const items: MockItem[] = [
		{ Id: '1', X: 0, Y: 0 },
		{ Id: '2', X: 100, Y: 100 },
		{ Id: '3', X: 200, Y: 200 },
		{ Id: '4', X: 1000, Y: 1000 }
	];
	const gridSize = 200;

	it('should find items in the same cell', () => {
		const grid = new SpatialGrid(items, gridSize);
		const nearby = grid.getNearby(50, 50);
		// (0,0) is in cell (0,0). (100,100) is in cell (0,0).
		// getNearby should check adjacent cells too if we follow StarMap logic
		expect(nearby.map((i) => i.Id)).toContain('1');
		expect(nearby.map((i) => i.Id)).toContain('2');
	});

	it('should find items in adjacent cells', () => {
		const grid = new SpatialGrid(items, gridSize);
		// (200, 200) is in cell (1,1)
		// Search at (150, 150) which is in cell (0,0)
		const nearby = grid.getNearby(150, 150);
		expect(nearby.map((i) => i.Id)).toContain('3');
	});

	it('should not find distant items', () => {
		const grid = new SpatialGrid(items, gridSize);
		const nearby = grid.getNearby(0, 0);
		expect(nearby.map((i) => i.Id)).not.toContain('4');
	});

	it('should handle empty items list', () => {
		const grid = new SpatialGrid([], gridSize);
		const nearby = grid.getNearby(0, 0);
		expect(nearby).toEqual([]);
	});
});
