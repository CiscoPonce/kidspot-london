module.exports = {
  apps: [
    {
      name: 'kidspot-api',
      script: './src/server.ts',
      interpreter: 'node',
      node_args: '--import tsx',
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
      script: './src/worker.ts',
      interpreter: 'node',
      node_args: '--import tsx',
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
