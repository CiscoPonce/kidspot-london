module.exports = {
  apps: [
    {
      name: 'kidspot-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
