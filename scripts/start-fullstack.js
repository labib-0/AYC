const { spawn } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('🚀 AYAAN CLOTHING — STARTING LOCAL FULL-STACK SUITE');
console.log('================================================================');
console.log('API:      http://127.0.0.1:8000');
console.log('Customer: http://localhost:3000');
console.log('Admin:    http://localhost:3001');
console.log('================================================================\n');

// 1. Laravel Backend API (Port 8000)
console.log('🐘 Starting Laravel Backend API on http://127.0.0.1:8000...');
const laravelApi = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], {
  cwd: path.join(__dirname, '..', 'backend'),
  stdio: 'inherit',
  shell: true,
});

// 2. Next.js Customer Storefront (Port 3000)
console.log('🌐 Starting Next.js Dev Server (Customer Storefront) on http://localhost:3000...');
const nextDev = spawn('npx', ['next', 'dev', '-p', '3000'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

// 3. Admin Gateway Proxy (Port 3001)
console.log('⚡ Starting Admin Gateway Proxy on http://localhost:3001...');
const adminProxy = spawn('node', [path.join(__dirname, 'admin-proxy.js')], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\n🛑 Shutting down all local fullstack services...');
  try { laravelApi.kill(); } catch {}
  try { nextDev.kill(); } catch {}
  try { adminProxy.kill(); } catch {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
