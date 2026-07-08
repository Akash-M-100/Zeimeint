// PM2 process for the backend API (zeminent-learn-backend). Runs the Express
// server (src/server.js) on the port from its .env (defaults to 4000).
module.exports = {
  apps: [
    {
      name: 'zeminent-backend',
      cwd: __dirname,
      script: 'src/server.js',
      env: { NODE_ENV: 'production' },
    },
  ],
};
