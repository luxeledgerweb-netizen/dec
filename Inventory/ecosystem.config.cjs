module.exports = {
  apps: [{
    name: 'inventory-vault-dev',
    script: 'npx',
    args: 'vite --host 0.0.0.0 --port 3000',
    cwd: '/home/user/webapp/Inventory',
    env: {
      NODE_ENV: 'development'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};