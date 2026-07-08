// PM2 process for the student app (zeminent-learn). Runs `npm run start`
// which serves the built Next.js app on port 7000.
module.exports = {
  apps: [
    {
      name: 'zeminent-learn',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: { NODE_ENV: 'production' },
    },
  ],
};
