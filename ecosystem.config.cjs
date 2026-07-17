module.exports = {
  apps: [{
    name: 'mud-bot',
    script: 'main.js',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    merge_logs: true
  }]
};