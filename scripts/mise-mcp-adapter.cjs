
const { spawn } = require('child_process');

const readline = require('readline');

const server = spawn('mise', ['mcp'], {
	stdio: ['pipe', 'pipe', 'inherit'],
	env: { ...process.env, MISE_EXPERIMENTAL: '1' }
});

const rl = readline.createInterface({
	input: process.stdin,
	terminal: false
});

rl.on('line', (line) => {
	try {
		const request = JSON.parse(line);
		// Adapter for old MCP clients using list_tools
		if (request.method === 'list_tools') {
			request.method = 'tools/list';
		}
		server.stdin.write(JSON.stringify(request) + '\n');
	} catch (e) {
		server.stdin.write(line + '\n');
	}
});

server.stdout.on('data', (data) => {
	process.stdout.write(data);
});

// Cleanup logic
const cleanup = () => {
	server.kill();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

server.on('exit', (code) => {
	process.exit(code || 0);
});
