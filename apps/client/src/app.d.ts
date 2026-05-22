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
		solarSystemMapDebug?: {
			viewport: Viewport;
			// Optional fields used by E2E for introspection
			lastMinScale?: number;
			lastMaxScale?: number;
		};
		// E2E readiness flags
		e2eReady?: boolean;
		e2eClusterReady?: boolean;
		e2eSystemReady?: boolean;

		stores?: Record<string, unknown>;
		// Helper exposed only in dev/E2E to read the current cluster value synchronously
		getClusterSnapshot?: () => unknown;
		PUBLIC_E2E?: string | boolean;
		__E2E_CLUSTER_FIXTURE?: unknown;
	}
}

export {};
