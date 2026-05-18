
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.resolve(__dirname, '../node_modules/@wdio/mcp/lib/server.js');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

process.stdin.on('data', (data) => {
  const line = data.toString();
  try {
    const request = JSON.parse(line);
    // Adapter for old MCP clients using list_tools
    if (request.method === 'list_tools') {
      request.method = 'tools/list';
    }
    server.stdin.write(JSON.stringify(request) + '\n');
  } catch (e) {
    server.stdin.write(data);
  }
});

server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Cleanup logic
const cleanup = () => {
  server.kill();
  // Attempt to kill orphaned chromedriver if it was started in this process group
  // This is a bit risky but better than leaving them
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

server.on('exit', (code) => {
  process.exit(code || 0);
});
