const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Next.js Dev Server (Port 3000) for Customer Storefront & API...');
const nextDev = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  shell: true,
});

console.log('⚡ Starting Admin Dedicated Origin Proxy (Port 3001) for Separate Admin Website...');
const adminProxy = spawn('node', [path.join(__dirname, 'admin-proxy.js')], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  nextDev.kill();
  adminProxy.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  nextDev.kill();
  adminProxy.kill();
  process.exit();
});
