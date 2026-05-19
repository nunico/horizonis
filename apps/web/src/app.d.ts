import { Viewport } from 'pixi-viewport';

declare global {
	interface Window {
		starMapDebug?: {
			viewport: Viewport;
			lastMinScale: number;
			lastMaxScale: number;
			updateZoomLimits: () => void;
		};
		solarSystemDebug?: {
			viewport: Viewport;
			lastMinScale: number;
			lastMaxScale: number;
			updateZoomLimits: () => void;
		};
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		stores?: any;
	}
}

export {};
