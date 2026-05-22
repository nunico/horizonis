export type ClusterLike = { Systems: Array<{ Id: string; Name?: string }> };

export type E2EWindow = Window & {
	e2eReady?: boolean;
	e2eClusterReady?: boolean;
	e2eSystemReady?: boolean;
	starMapDebug?: { viewport?: { children?: unknown[] } };
	solarSystemMapDebug?: { viewport?: { children?: unknown[] } };
	stores: {
		cluster?: { subscribe: (fn: (x: ClusterLike) => void) => () => void };
		activeSystemId: { set: (id: string | null) => void };
		viewMode: { set: (mode: string) => void; subscribe: (fn: (v: string) => void) => () => void };
		selectedEntity: { set: (entity: unknown) => void };
	};
	getClusterSnapshot?: () => ClusterLike;
	PUBLIC_E2E?: string;
	__E2E_CLUSTER_FIXTURE?: unknown;
};
