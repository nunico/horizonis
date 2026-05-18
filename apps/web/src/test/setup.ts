import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/path', () => ({
	appDataDir: vi.fn(() => Promise.resolve('/mock/app/data'))
}));
