module.exports = {
  apps: [{
    name: 'mud-bot',
    script: 'main.js',
    max_memory_restart: '1G',
    watch: false,
    env: {
      NODE_ENV: 'production',
      MARKOV_API: 'http://127.0.0.1:3001/generate',
      SLM_API: "http://127.0.0.1:8000/generate"
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
