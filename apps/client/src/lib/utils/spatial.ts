export interface SpatialItem {
	X: number;
	Y: number;
}

export class SpatialGrid<T extends SpatialItem> {
	private grid = new Map<string, T[]>();
	private gridSize: number;

	constructor(items: T[], gridSize: number) {
		this.gridSize = gridSize;
		for (const item of items) {
			const gx = Math.floor(item.X / gridSize);
			const gy = Math.floor(item.Y / gridSize);
			const key = `${gx},${gy}`;
			if (!this.grid.has(key)) {
				this.grid.set(key, []);
			}
			this.grid.get(key)!.push(item);
		}
	}

	getNearby(x: number, y: number): T[] {
		const gx = Math.floor(x / this.gridSize);
		const gy = Math.floor(y / this.gridSize);
		const nearby: T[] = [];

		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const key = `${gx + dx},${gy + dy}`;
				const cellItems = this.grid.get(key);
				if (cellItems) {
					nearby.push(...cellItems);
				}
			}
		}
		return nearby;
	}
}
