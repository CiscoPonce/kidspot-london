module.exports = {
  apps: [
    {
      name: 'kidspot-api',
      script: './src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'kidspot-worker',
      script: './scripts/discovery/run-discovery.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
