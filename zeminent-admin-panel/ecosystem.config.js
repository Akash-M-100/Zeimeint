// PM2 process for the admin panel (zeminent-admin-panel). Runs `npm run start`
// which serves the built Next.js app on port 7001.
module.exports = {
  apps: [
    {
      name: 'zeminent-admin',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
    },
  ],
};
