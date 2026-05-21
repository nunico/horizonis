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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stores?: any;
        // Helper exposed only in dev/E2E to read the current cluster value synchronously
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getClusterSnapshot?: () => any;
    }
}

export {};
