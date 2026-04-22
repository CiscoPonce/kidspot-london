module.exports = {
  apps: [
    {
      name: 'kidspot-web',
      script: 'npm',
      args: 'start',
      cwd: '/app',
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
