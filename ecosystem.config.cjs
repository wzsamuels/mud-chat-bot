module.exports = {
  apps: [{
    name: 'mud-bot',
    script: 'main.js',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      MARKOV_API: 'http://127.0.0.1:3001/generate',
      SLM_API: "http://127.0.0.1:8000/generate"
    },
    merge_logs: true
  }]
};