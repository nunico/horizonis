import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
let tauriDriver;
let webServerProcess;

const isDesktop = process.env.TARGET !== 'web';

export const config = {
	specs: ['./test/specs/**/*.js'],
	maxInstances: 1,
	capabilities: [
		isDesktop
			? {
					maxInstances: 1,
					browserName: 'wry',
					'tauri:options': {
						application: path.resolve(__dirname, '../../target/debug/horizonis-shell')
					}
				}
			: {
					maxInstances: 1,
					browserName: 'firefox',
					'moz:firefoxOptions': {
						args: ['--headless']
					}
				}
	],
	reporters: ['spec'],
	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 60000
	},
	onPrepare: async () => {
		if (isDesktop) {
			if (process.env.SKIP_BUILD === 'true') {
				console.log('Skipping Tauri app build as requested.');
				return;
			}
			console.log('Building Tauri app...');
			const env = { ...process.env, CI: 'true' };
			delete env.NODE_OPTIONS;
			const result = spawnSync(
				'mise',
				['exec', '--', 'npm', 'exec', '--', 'tauri', 'build', '--debug', '--no-bundle'],
				{
					cwd: rootDir,
					stdio: 'inherit',
					shell: true,
					env
				}
			);
			if (result.status !== 0) {
				throw new Error('Tauri build failed');
			}
		} else {
			const isPortOpen = await new Promise((resolve) => {
				const socket = new net.Socket();
				const onError = () => {
					socket.destroy();
					resolve(false);
				};
				socket.setTimeout(1000);
				socket.on('error', onError);
				socket.on('timeout', onError);
				socket.connect(1420, 'localhost', () => {
					socket.end();
					resolve(true);
				});
			});

			if (!isPortOpen) {
				console.log('Web server not running on port 1420. Starting it...');
				const publicE2E = process.env.PUBLIC_E2E ?? '1';
				const webEnv = { ...process.env, PUBLIC_E2E: publicE2E };
				spawnSync('npm', ['run', 'build:web'], {
					cwd: rootDir,
					stdio: 'inherit',
					shell: true,
					env: webEnv
				});
				webServerProcess = spawn('npm', ['run', 'preview:web'], {
					cwd: rootDir,
					stdio: 'inherit',
					shell: true,
					env: webEnv
				});

				// Wait for port to open
				let attempts = 0;
				while (attempts < 30) {
					const ready = await new Promise((resolve) => {
						const socket = new net.Socket();
						socket.setTimeout(500);
						socket.on('error', () => {
							socket.destroy();
							resolve(false);
						});
						socket.on('timeout', () => {
							socket.destroy();
							resolve(false);
						});
						socket.connect(1420, 'localhost', () => {
							socket.end();
							resolve(true);
						});
					});
					if (ready) break;
					await new Promise((r) => setTimeout(r, 1000));
					attempts++;
				}
				if (attempts === 30) {
					throw new Error('Timeout waiting for web server to start');
				}
			}
		}
	},
	onComplete: () => {
		if (webServerProcess) {
			console.log('Stopping web server...');
			webServerProcess.kill();
		}
	},
	beforeSession: () => {
		if (!isDesktop) return;
		console.log('Starting tauri-driver...');
		tauriDriver = spawn('tauri-driver', [], { stdio: 'inherit', shell: true });
	},
	afterSession: async () => {
		if (tauriDriver) {
			tauriDriver.kill();
		}
	}
};
