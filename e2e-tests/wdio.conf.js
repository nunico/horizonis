import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let tauriDriver;

export const config = {
	hostname: '127.0.0.1',
	port: 4444,
	specs: ['./test/specs/**/*.js'],
	maxInstances: 1,
	capabilities: [
		{
			maxInstances: 1,
			browserName: 'wry',
			'tauri:options': {
				application: path.resolve(__dirname, '../src-tauri/target/debug/tauri-app')
			}
		}
	],
	reporters: ['spec'],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 60000
	},
	onPrepare: () => {
		if (process.env.SKIP_BUILD === 'true') {
			console.log('Skipping Tauri app build as requested.');
			return;
		}
		console.log('Building Tauri app...');
		const env = { ...process.env, CI: 'true' };
		delete env.NODE_OPTIONS;
		const result = spawnSync(
			'mise',
			['exec', '--', 'deno', 'task', 'tauri', 'build', '--debug', '--no-bundle'],
			{
				cwd: path.resolve(__dirname, '..'),
				stdio: 'inherit',
				shell: true,
				env
			}
		);
		if (result.status !== 0) {
			throw new Error('Tauri build failed');
		}
	},
	beforeSession: () => {
		console.log('Starting tauri-driver...');
		tauriDriver = spawn('tauri-driver', [], { stdio: 'inherit', shell: true });
	},
	afterSession: async () => {
		if (tauriDriver) {
			tauriDriver.kill();
		}
	}
};
