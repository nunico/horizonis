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

	static calculateBounds<T extends SpatialItem>(items: T[]) {
		if (items.length === 0) {
			return { center: { x: 0, y: 0 }, maxRadius: 100 };
		}

		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity;
		for (const item of items) {
			if (item.X < minX) minX = item.X;
			if (item.X > maxX) maxX = item.X;
			if (item.Y < minY) minY = item.Y;
			if (item.Y > maxY) maxY = item.Y;
		}
		const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

		let maxRadius = 0;
		for (const item of items) {
			const dist = Math.hypot(item.X - center.x, item.Y - center.y);
			if (dist > maxRadius) maxRadius = dist;
		}

		return { center, maxRadius };
	}
}
