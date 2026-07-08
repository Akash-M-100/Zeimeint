'use strict';

const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const seedAdmin = require('./services/seedAdmin');
const { ensureSingleLearningPath } = require('./services/path.service');

let server;

const start = async () => {
  try {
    await connectDB();
    await seedAdmin();
    await ensureSingleLearningPath();

    server = app.listen(env.port, () => {
      console.log(
        `🚀Hello Zeminent LMS API running at http://localhost:${env.port}/api  [${env.nodeEnv}]`,
      );
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown — stop accepting connections, then exit.
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully`);
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// Last-resort safety nets — log loudly; don't leave the process in a bad state.
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
  process.exit(1);
});

start();
